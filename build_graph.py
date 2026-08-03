#!/usr/bin/env python3
"""SecondSelf Graph Builder CLI (Phase 4).

Builds knowledge graph JSON from wiki/ notes and exports to data/graph.json and graph.json.
"""

import argparse
from pathlib import Path
import sys

from lib.graph_builder import export_graph_json


def main() -> None:
    parser = argparse.ArgumentParser(
        description="SecondSelf Graph Builder: Generate force-directed graph.json from wiki notes."
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        help="Path to output graph JSON file (defaults to data/graph.json and root graph.json)",
    )

    args = parser.parse_args()

    try:
        out_path = Path(args.output) if args.output else None
        data = export_graph_json(output_path=out_path)

        meta = data.get("meta", {})
        note_count = meta.get("note_count", 0)
        edge_count = meta.get("edge_count", 0)

        print("🧠 Knowledge graph built successfully!")
        print(f"  • Nodes (wiki notes): {note_count}")
        print(f"  • Edges (connections): {edge_count}")
        print("  • Saved to data/graph.json and root graph.json")

    except Exception as exc:
        print(f"❌ Error building knowledge graph: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
