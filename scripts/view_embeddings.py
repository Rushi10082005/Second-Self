#!/usr/bin/env python3
"""Utility script to inspect stored note embeddings in data/embeddings.json."""

import argparse
import json
from pathlib import Path
import sys

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from lib.storage import embeddings_path


def main() -> None:
    parser = argparse.ArgumentParser(description="View stored note embeddings from data/embeddings.json")
    parser.add_argument("--slug", "-s", help="Specific note slug to inspect")
    parser.add_argument("--limit", "-l", type=int, default=5, help="Number of vector dimensions to show (default: 5)")
    args = parser.parse_args()

    path = embeddings_path()
    if not path.is_file():
        print(f"❌ File not found: {path}")
        return

    with open(path, encoding="utf-8") as f:
        store = json.load(f)

    print(f"Model:   {store.get('model')}")
    print(f"Version: {store.get('version')}")
    vectors = store.get("vectors", {})
    print(f"Total Notes Embedded: {len(vectors)}\n" + "=" * 60)

    if args.slug:
        if args.slug not in vectors:
            print(f"❌ Slug '{args.slug}' not found in embeddings store.")
            return
        entry = vectors[args.slug]
        vec = entry.get("vector", [])
        print(f"Slug:       {args.slug}")
        print(f"Content Hash: {entry.get('hash')}")
        print(f"Updated At:   {entry.get('updated_at', 'N/A')}")
        print(f"Dimensions:   {len(vec)}")
        print(f"First {min(args.limit, len(vec))} values: {vec[:args.limit]}")
    else:
        print(f"{'SLUG':<42} | {'DIM':<5} | {'HASH':<10} | {'UPDATED'}")
        print("-" * 75)
        for slug, entry in vectors.items():
            vec = entry.get("vector", [])
            h = entry.get("hash", "")[:8]
            up = entry.get("updated_at", "N/A")
            if isinstance(up, str) and "T" in up:
                up = up.split(".")[0]
            print(f"{slug:<42} | {len(vec):<5} | {h:<10} | {up}")


if __name__ == "__main__":
    main()
