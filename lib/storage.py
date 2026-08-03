"""Filesystem paths, manifest helpers, capture storage, and wiki note storage."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import unicodedata
from typing import Any
import frontmatter

from lib.config import get_settings, project_root
from lib.models import Capture, CaptureType, ParaCategory, WikiNote


def ensure_project_dirs() -> None:
    """Create raw/, wiki/, data/, and raw/files/ if missing."""
    get_settings().ensure_dirs()
    for cat in ParaCategory:
        (get_settings().wiki_dir / cat.value).mkdir(parents=True, exist_ok=True)


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

    normalized_content = unicodedata.normalize("NFC", capture.content or "")

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


def save_wiki_note(note: WikiNote) -> Path:
    """Save WikiNote object into wiki/{para_category}/{slug}.md."""
    ensure_project_dirs()

    cat_str = note.para_category.value if isinstance(note.para_category, ParaCategory) else str(note.para_category)
    cat_dir = wiki_dir() / cat_str
    cat_dir.mkdir(parents=True, exist_ok=True)

    file_path = cat_dir / f"{note.slug}.md"

    metadata: dict[str, Any] = {
        "capture_id": note.capture_id,
        "para_category": cat_str,
        "title": note.title,
        "summary": note.summary,
        "tags": note.tags,
        "links": note.links,
    }
    if note.embedding_id:
        metadata["embedding_id"] = note.embedding_id

    normalized_body = unicodedata.normalize("NFC", note.body or "")
    post = frontmatter.Post(normalized_body, **metadata)
    file_path.write_text(frontmatter.dumps(post) + "\n", encoding="utf-8")

    note.path = str(file_path)
    return file_path


def load_wiki_note(path: Path) -> WikiNote:
    """Load WikiNote object from markdown file with YAML frontmatter."""
    post = frontmatter.load(path)
    meta = post.metadata

    cat_val = meta.get("para_category", "Resources")
    try:
        para = ParaCategory(cat_val)
    except ValueError:
        para = ParaCategory.RESOURCES

    slug = path.stem

    return WikiNote(
        slug=slug,
        capture_id=str(meta.get("capture_id", "")),
        para_category=para,
        title=meta.get("title", slug.replace("-", " ").title()),
        summary=meta.get("summary", ""),
        body=post.content,
        tags=list(meta.get("tags", [])),
        links=list(meta.get("links", [])),
        embedding_id=meta.get("embedding_id"),
        path=str(path),
    )


def list_wiki_notes() -> list[tuple[Path, WikiNote]]:
    """List all wiki notes across wiki/ subdirectories."""
    if not wiki_dir().is_dir():
        return []
    results: list[tuple[Path, WikiNote]] = []
    for p in sorted(wiki_dir().rglob("*.md")):
        if p.name == ".gitkeep":
            continue
        try:
            note = load_wiki_note(p)
            results.append((p, note))
        except Exception:
            continue
    return results


def update_note_links(path: Path, link_slugs: list[str]) -> WikiNote:
    """Update metadata links list and append/update ## Related wikilinks section idempotently."""
    post = frontmatter.load(path)
    clean_slugs = sorted(list(dict.fromkeys([s for s in link_slugs if s and s != path.stem])))
    post.metadata["links"] = clean_slugs

    content = post.content
    if "## Related" in content:
        content = content.split("## Related")[0].rstrip()

    if clean_slugs:
        related_lines = ["\n\n## Related"]
        for slug in clean_slugs:
            related_lines.append(f"- [[{slug}]]")
        content = content.rstrip() + "\n".join(related_lines)

    post.content = unicodedata.normalize("NFC", content)
    file_content = frontmatter.dumps(post)
    path.write_text(file_content + "\n", encoding="utf-8")
    return load_wiki_note(path)

