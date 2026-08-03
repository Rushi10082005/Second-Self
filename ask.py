#!/usr/bin/env python3
"""SecondSelf RAG CLI Interface (Phase 5).

Query your personal second brain from the terminal using semantic retrieval and Groq synthesis.
"""

import argparse
import sys

from lib.rag import ask


def main() -> None:
    parser = argparse.ArgumentParser(
        description="SecondSelf Ask: Natural language Q&A over your personal wiki notes using RAG."
    )
    parser.add_argument(
        "question",
        type=str,
        help="The question to ask your second brain.",
    )
    parser.add_argument(
        "--top-k",
        "-k",
        type=int,
        default=5,
        help="Number of relevant notes to retrieve (default: 5)",
    )

    args = parser.parse_args()

    if not args.question.strip():
        print("❌ Error: Question cannot be empty.", file=sys.stderr)
        sys.exit(1)

    print(f"🔍 Searching SecondSelf for: \"{args.question}\"...\n")

    try:
        result = ask(args.question, top_k=args.top_k)

        print("=" * 60)
        print("🤖 ANSWER")
        print("=" * 60)
        print(result.answer)
        print("\n" + "=" * 60)
        print("📚 RETRIEVED SOURCES")
        print("=" * 60)

        if not result.sources:
            print("No matching notes found.")
        else:
            for idx, source in enumerate(result.sources, 1):
                score_pct = source.score * 100
                print(f"[{idx}] {source.title} (slug: {source.note_id}) — Match: {score_pct:.1f}%")
                print(f"    Snippet: {source.snippet[:140]}...")
                print()

    except Exception as exc:
        print(f"❌ Error asking SecondSelf: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
