#!/usr/bin/env python3
"""SecondSelf PARA classifier — auto-classify raw captures into wiki/ notes."""

import argparse
from datetime import datetime, timezone
from pathlib import Path
import re
import sys

from lib.llm_client import GroqLLMClient, LLMClientError, get_llm_client
from lib.models import Capture, ParaCategory, WikiNote
from lib.prompts import PARA_CLASSIFICATION_SYSTEM_PROMPT, format_classification_prompt
from lib.storage import (
    list_raw_captures,
    list_wiki_notes,
    load_manifest,
    save_manifest,
    save_wiki_note,
)


def sanitize_slug(text: str) -> str:
    """Create clean, URL-friendly slug from text."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "untitled-note"


def classify_capture(
    capture: Capture, client: GroqLLMClient | None = None
) -> WikiNote:
    """Classify a single raw capture using Groq LLM."""
    if client is None:
        client = get_llm_client()

    prompt = format_classification_prompt(
        raw_content=capture.content, source=capture.source, mime=capture.mime
    )

    result_json = client.complete_json(
        prompt=prompt, system_prompt=PARA_CLASSIFICATION_SYSTEM_PROMPT
    )

    # Parse and validate PARA category
    raw_cat = result_json.get("para_category", "Resources")
    try:
        para_cat = ParaCategory(raw_cat)
    except ValueError:
        para_cat = ParaCategory.RESOURCES

    raw_title = result_json.get("title") or "Untitled Note"
    raw_slug = result_json.get("slug") or sanitize_slug(raw_title)
    slug = sanitize_slug(raw_slug)

    summary = result_json.get("summary") or ""
    tags = result_json.get("tags") or []
    if isinstance(tags, str):
        tags = [t.strip().lower() for t in tags.split(",")]
    else:
        tags = [str(t).strip().lower() for t in tags]

    body = result_json.get("body") or capture.content

    note = WikiNote(
        slug=slug,
        capture_id=capture.id,
        para_category=para_cat,
        title=raw_title,
        summary=summary,
        body=body,
        tags=tags,
        links=[],
    )
    save_wiki_note(note)
    return note


def run_classification(
    force: bool = False, single_id: str | None = None
) -> list[WikiNote]:
    """Run PARA classification loop over raw captures."""
    raw_items = list_raw_captures()
    if not raw_items:
        print("No raw captures found in raw/.")
        return []

    manifest = load_manifest()
    classified_ids = set(manifest.get("classified_capture_ids", []))

    to_process: list[tuple[Path, Capture]] = []
    for path, cap in raw_items:
        if single_id and cap.id != single_id:
            continue
        if force or cap.id not in classified_ids:
            to_process.append((path, cap))

    if not to_process:
        print("All raw captures are already classified. Use --force to reclassify.")
        return []

    print(f"Starting PARA classification for {len(to_process)} item(s)...")
    llm = get_llm_client()
    classified_notes: list[WikiNote] = []

    for idx, (path, cap) in enumerate(to_process, start=1):
        print(f"[{idx}/{len(to_process)}] Classifying capture ID {cap.id[:8]}...")
        try:
            note = classify_capture(cap, client=llm)
            classified_notes.append(note)
            classified_ids.add(cap.id)

            # Update manifest incrementally
            manifest["classified_capture_ids"] = sorted(list(classified_ids))
            manifest["last_classify_at"] = datetime.now(timezone.utc).isoformat()
            manifest["counts"]["wiki_notes"] = len(list_wiki_notes())
            save_manifest(manifest)

            print(
                f"  ✅ Saved: wiki/{note.para_category.value}/{note.slug}.md ({note.title})"
            )

        except Exception as exc:
            print(f"  ❌ Error classifying capture {cap.id}: {exc}", file=sys.stderr)
            error_entry = {
                "capture_id": cap.id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(exc),
            }
            manifest.setdefault("errors", []).append(error_entry)
            save_manifest(manifest)

    print(
        f"\nFinished classification. {len(classified_notes)} note(s) written to wiki/."
    )
    return classified_notes


def main() -> None:
    parser = argparse.ArgumentParser(
        description="SecondSelf PARA Classifier: Auto-classify raw captures into wiki/ notes."
    )
    parser.add_argument(
        "--force", "-f", action="store_true", help="Force re-classification of all captures."
    )
    parser.add_argument(
        "--id", "-i", type=str, help="Classify a specific raw capture ID."
    )

    args = parser.parse_args()

    try:
        run_classification(force=args.force, single_id=args.id)
    except LLMClientError as err:
        print(f"❌ Configuration error: {err}", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(f"❌ Unexpected error during classification: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
