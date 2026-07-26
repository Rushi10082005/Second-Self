"""Filesystem paths, manifest helpers, and capture storage."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import unicodedata
from typing import Any
import frontmatter

from lib.config import get_settings, project_root
from lib.models import Capture, CaptureType


def ensure_project_dirs() -> None:
    """Create raw/, wiki/, data/, and raw/files/ if missing."""
    get_settings().ensure_dirs()


def raw_dir() -> Path:
    return get_settings().raw_dir


def wiki_dir() -> Path:
    return get_settings().wiki_dir


def data_dir() -> Path:
    return get_settings().data_dir


def manifest_path() -> Path:
    return data_dir() / "index_manifest.json"


def embeddings_path() -> Path:
    return data_dir() / "embeddings.json"


def graph_path() -> Path:
    return data_dir() / "graph.json"


def raw_index_path() -> Path:
    return raw_dir() / "index.jsonl"


def load_manifest() -> dict[str, Any]:
    """Load index manifest; return empty schema if file missing or invalid."""
    path = manifest_path()
    default: dict[str, Any] = {
        "classified_capture_ids": [],
        "note_content_hashes": {},
        "last_classify_at": None,
        "last_link_at": None,
        "last_graph_at": None,
        "counts": {"captures": 0, "wiki_notes": 0, "links_created": 0},
        "errors": [],
    }
    if not path.is_file():
        return default
    try:
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return default
        for key, val in default.items():
            data.setdefault(key, val)
        return data
    except (json.JSONDecodeError, OSError):
        return default


def save_manifest(manifest: dict[str, Any]) -> None:
    ensure_project_dirs()
    path = manifest_path()
    tmp = path.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")
    tmp.replace(path)


def resolve_under_root(path: Path) -> Path:
    """Resolve path and ensure it stays under project root (basic traversal guard)."""
    root = project_root().resolve()
    resolved = path.resolve()
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"Path escapes project root: {path}") from exc
    return resolved


def save_capture(capture: Capture) -> Path:
    """Save capture markdown file and update index.jsonl + manifest."""
    ensure_project_dirs()

    # UTF-8 NFC normalization
    normalized_content = unicodedata.normalize("NFC", capture.content or "")

    # ISO 8601 UTC timestamp format for filename
    dt_utc = capture.captured_at.astimezone(timezone.utc)
    ts_str = dt_utc.strftime("%Y%m%dT%H%M%SZ")
    filename = f"{ts_str}_{capture.id}.md"
    file_path = raw_dir() / filename

    type_str = capture.type.value if isinstance(capture.type, CaptureType) else str(capture.type)

    metadata: dict[str, Any] = {
        "id": capture.id,
        "captured_at": dt_utc.isoformat(),
        "type": type_str,
    }
    if capture.source:
        metadata["source"] = capture.source
    if capture.mime:
        metadata["mime"] = capture.mime
    if capture.extra:
        metadata["extra"] = capture.extra

    post = frontmatter.Post(normalized_content, **metadata)
    file_path.write_text(frontmatter.dumps(post) + "\n", encoding="utf-8")

    # Append to raw/index.jsonl
    index_entry = {
        "id": capture.id,
        "filename": filename,
        "captured_at": dt_utc.isoformat(),
        "type": type_str,
        "source": capture.source,
        "mime": capture.mime,
    }
    idx_path = raw_index_path()
    with idx_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(index_entry) + "\n")

    # Update manifest
    manifest = load_manifest()
    manifest["counts"]["captures"] = manifest["counts"].get("captures", 0) + 1
    save_manifest(manifest)

    return file_path


def load_capture_file(path: Path) -> Capture:
    """Load Capture object from a markdown capture file with YAML frontmatter."""
    post = frontmatter.load(path)
    meta = post.metadata

    captured_at_raw = meta.get("captured_at")
    if isinstance(captured_at_raw, datetime):
        captured_at = captured_at_raw
    elif isinstance(captured_at_raw, str):
        captured_at = datetime.fromisoformat(captured_at_raw)
    else:
        captured_at = datetime.now(timezone.utc)

    if captured_at.tzinfo is None:
        captured_at = captured_at.replace(tzinfo=timezone.utc)

    type_val = meta.get("type", "note")
    try:
        cap_type = CaptureType(type_val)
    except ValueError:
        cap_type = CaptureType.NOTE

    return Capture(
        id=str(meta.get("id", path.stem.split("_")[-1])),
        captured_at=captured_at,
        type=cap_type,
        content=post.content,
        source=meta.get("source"),
        mime=meta.get("mime"),
        extra=meta.get("extra", {}),
    )


def list_raw_captures() -> list[tuple[Path, Capture]]:
    """List all capture files in raw/ sorted by filename."""
    if not raw_dir().is_dir():
        return []
    results: list[tuple[Path, Capture]] = []
    for p in sorted(raw_dir().glob("*.md")):
        try:
            cap = load_capture_file(p)
            results.append((p, cap))
        except Exception:
            continue
    return results
