#!/usr/bin/env python3
"""SecondSelf capture CLI — capture notes, links, and files into raw/."""

import argparse
from datetime import datetime, timezone
import mimetypes
from pathlib import Path
import re
import shutil
import sys
import uuid
import requests

from lib.models import Capture, CaptureType
from lib.storage import ensure_project_dirs, raw_dir, save_capture

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False


def extract_pdf_text(path: Path) -> str:
    """Extract text from PDF file using pypdf if available."""
    if not HAS_PYPDF:
        return f"[PDF File: {path.name}] (pypdf not available for text extraction)"
    try:
        reader = pypdf.PdfReader(str(path))
        text_parts = []
        for i, page in enumerate(reader.pages):
            txt = page.extract_text()
            if txt:
                text_parts.append(f"--- Page {i+1} ---\n{txt.strip()}")
        if text_parts:
            return "\n\n".join(text_parts)
        return f"[PDF File: {path.name}] (No extractable text found)"
    except Exception as exc:
        return f"[PDF File: {path.name}] (Extraction error: {exc})"


def fetch_link_content(url: str) -> tuple[str, str]:
    """Fetch URL title and text content with graceful fallback on network failure."""
    headers = {
        "User-Agent": "SecondSelf-Archivist/1.0 (+https://github.com/secondself)"
    }
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        resp.raise_for_status()
        html = resp.text

        title_match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else url

        # Simple HTML tag stripping for content snippet
        clean_text = re.sub(r"<script.*?>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
        clean_text = re.sub(r"<style.*?>.*?</style>", "", clean_text, flags=re.DOTALL | re.IGNORECASE)
        clean_text = re.sub(r"<.*?>", " ", clean_text)
        clean_text = re.sub(r"\s+", " ", clean_text).strip()

        # Truncate snippet
        snippet = clean_text[:2000] if len(clean_text) > 2000 else clean_text
        content = f"# {title}\n\n**URL:** {url}\n\n## Content Snippet\n{snippet}"
        return title, content

    except Exception as exc:
        title = url
        content = f"# Bookmark: {url}\n\n**URL:** {url}\n\n*(Failed to fetch content: {exc})*"
        return title, content


def capture_note(text: str | None, source: str | None = None) -> Path:
    """Capture a raw text note."""
    if not text or text == "-":
        if not sys.stdin.isatty():
            text = sys.stdin.read()
        else:
            raise ValueError("No note text provided. Pass --text '...' or pipe via stdin.")

    text = text.strip()
    if not text:
        raise ValueError("Note text cannot be empty.")

    cap_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    capture = Capture(
        id=cap_id,
        captured_at=now,
        type=CaptureType.NOTE,
        content=text,
        source=source or "cli:note",
        mime="text/markdown",
    )
    return save_capture(capture)


def capture_link(url: str, source: str | None = None) -> Path:
    """Capture a URL bookmark with optional content fetch."""
    if not url:
        raise ValueError("URL parameter is required.")

    title, content = fetch_link_content(url)
    cap_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    capture = Capture(
        id=cap_id,
        captured_at=now,
        type=CaptureType.LINK,
        content=content,
        source=url,
        mime="text/html",
        extra={"title": title, "url": url},
    )
    return save_capture(capture)


def capture_file(file_path_str: str, source: str | None = None) -> Path:
    """Copy external file into raw/files/{id}/ and capture metadata + text."""
    path = Path(file_path_str).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {file_path_str}")

    cap_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    ensure_project_dirs()

    # Destination directory: raw/files/{id}/
    dest_dir = raw_dir() / "files" / cap_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_file = dest_dir / path.name
    shutil.copy2(path, dest_file)

    mime_type, _ = mimetypes.guess_type(path)
    mime = mime_type or "application/octet-stream"

    # Extract content snippet
    ext = path.suffix.lower()
    if ext in [".txt", ".md", ".py", ".json", ".yaml", ".yml", ".csv", ".sh", ".log"]:
        try:
            raw_text = path.read_text(encoding="utf-8", errors="replace")
            content = f"# File: {path.name}\n\n```\n{raw_text[:4000]}\n```"
        except Exception:
            content = f"# File: {path.name}\n\nStored at `{dest_file.relative_to(raw_dir().parent)}`"
    elif ext == ".pdf":
        pdf_text = extract_pdf_text(path)
        content = f"# PDF File: {path.name}\n\n{pdf_text}"
    else:
        content = f"# File Attachment: {path.name}\n\nBinary file stored at `raw/files/{cap_id}/{path.name}` ({path.stat().st_size} bytes)."

    capture = Capture(
        id=cap_id,
        captured_at=now,
        type=CaptureType.FILE,
        content=content,
        source=str(path),
        mime=mime,
        extra={
            "original_filename": path.name,
            "saved_file_path": str(dest_file),
            "file_size": path.stat().st_size,
        },
    )
    return save_capture(capture)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="SecondSelf capture CLI: ingest notes, links, and files into raw/"
    )
    subparsers = parser.add_subparsers(dest="subcommand", help="Capture subcommands")

    # note subcommand
    note_parser = subparsers.add_parser("note", help="Capture a text note")
    note_parser.add_argument("positional_text", nargs="?", help="Note content string")
    note_parser.add_argument("--text", "-t", help="Note content string")
    note_parser.add_argument("--source", "-s", help="Optional note source descriptor")

    # link subcommand
    link_parser = subparsers.add_parser("link", help="Capture a web URL link")
    link_parser.add_argument("url", help="URL to capture")
    link_parser.add_argument("--source", "-s", help="Optional link source descriptor")

    # file subcommand
    file_parser = subparsers.add_parser("file", help="Capture a local file")
    file_parser.add_argument("file_path", help="Path to file to capture")
    file_parser.add_argument("--source", "-s", help="Optional file source descriptor")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if not args.subcommand:
        parser.print_help()
        sys.exit(1)

    try:
        if args.subcommand == "note":
            text = args.text or args.positional_text
            out_path = capture_note(text, source=args.source)
            print(f"✅ Captured note -> {out_path.name}")
        elif args.subcommand == "link":
            out_path = capture_link(args.url, source=args.source)
            print(f"✅ Captured link -> {out_path.name}")
        elif args.subcommand == "file":
            out_path = capture_file(args.file_path, source=args.source)
            print(f"✅ Captured file -> {out_path.name}")
    except Exception as exc:
        print(f"❌ Capture error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
