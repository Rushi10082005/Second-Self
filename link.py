#!/usr/bin/env python3
"""SecondSelf semantic interlinking — compute embeddings and link related wiki notes."""

import argparse
from datetime import datetime, timezone
from pathlib import Path
import sys

from lib.config import get_settings
from lib.embeddings import (
    compute_content_hash,
    cosine_similarity,
    encode_text,
    load_embeddings_store,
    save_embeddings_store,
)
from lib.models import WikiNote
from lib.storage import (
    list_wiki_notes,
    load_manifest,
    save_manifest,
    update_note_links,
)


def run_linking(
    threshold: float | None = None,
    max_links: int = 5,
    force: bool = False,
) -> dict[str, list[str]]:
    """Run embedding calculation and pairwise cosine similarity linking."""
    settings = get_settings()
    sim_threshold = threshold if threshold is not None else settings.similarity_threshold

    notes_items = list_wiki_notes()
    if not notes_items:
        print("No wiki notes found in wiki/. Run classify.py first.")
        return {}

    print(f"Found {len(notes_items)} wiki notes for semantic linking.")

    # Load cached embeddings
    store = load_embeddings_store()
    vectors_cache = store.setdefault("vectors", {})
    store["model"] = settings.embedding_model

    slug_vectors: dict[str, list[float]] = {}

    print("Checking / computing embeddings...")
    updated_count = 0
    for path, note in notes_items:
        full_text = f"{note.title}\n{note.summary}\n{note.body}"
        content_hash = compute_content_hash(full_text)

        cached_entry = vectors_cache.get(note.slug)
        if (
            not force
            and cached_entry
            and cached_entry.get("hash") == content_hash
            and "vector" in cached_entry
        ):
            vector = cached_entry["vector"]
        else:
            print(f"  Encoding [{note.slug}]...")
            vector = encode_text(full_text)
            vectors_cache[note.slug] = {
                "hash": content_hash,
                "vector": vector,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            updated_count += 1

        slug_vectors[note.slug] = vector

    save_embeddings_store(store)
    if updated_count > 0:
        print(f"Updated {updated_count} embedding vector(s) in data/embeddings.json.")
    else:
        print("All note embeddings were loaded from cache.")

    # Pairwise similarity calculation
    print(f"\nComputing pairwise cosine similarities (threshold >= {sim_threshold:.2f})...")
    links_created_map: dict[str, list[str]] = {}
    total_links = 0

    slug_to_path: dict[str, Path] = {note.slug: path for path, note in notes_items}
    slugs = list(slug_vectors.keys())

    for i, slug1 in enumerate(slugs):
        v1 = slug_vectors[slug1]
        matches: list[tuple[str, float]] = []

        for j, slug2 in enumerate(slugs):
            if i == j:
                continue
            v2 = slug_vectors[slug2]
            sim = cosine_similarity(v1, v2)
            if sim >= sim_threshold:
                matches.append((slug2, sim))

        # Sort matches by similarity descending
        matches.sort(key=lambda x: x[1], reverse=True)
        top_matches = matches[:max_links]
        link_slugs = [m[0] for m in top_matches]

        path = slug_to_path[slug1]
        update_note_links(path, link_slugs)

        links_created_map[slug1] = link_slugs
        total_links += len(link_slugs)

        if link_slugs:
            print(f"  🔗 [{slug1}] -> {link_slugs} (scores: {[round(m[1], 3) for m in top_matches]})")

    # Update manifest
    manifest = load_manifest()
    manifest["last_link_at"] = datetime.now(timezone.utc).isoformat()
    manifest["counts"]["links_created"] = total_links
    save_manifest(manifest)

    print(f"\nFinished semantic linking. Created {total_links} link connection(s) across {len(slugs)} notes.")
    return links_created_map


def main() -> None:
    parser = argparse.ArgumentParser(
        description="SecondSelf Linker: Auto-link wiki notes using sentence-transformers similarity."
    )
    parser.add_argument(
        "--threshold",
        "-t",
        type=float,
        help="Similarity threshold for auto-linking (e.g. 0.78)",
    )
    parser.add_argument(
        "--max-links",
        "-m",
        type=int,
        default=5,
        help="Maximum links per note (default: 5)",
    )
    parser.add_argument(
        "--force",
        "-f",
        action="store_true",
        help="Force re-encoding of all note embeddings.",
    )

    args = parser.parse_args()

    try:
        run_linking(threshold=args.threshold, max_links=args.max_links, force=args.force)
    except Exception as exc:
        print(f"❌ Error during note linking: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
