"""Knowledge graph builder module for SecondSelf (Phase 4).

Parses all wiki notes, extracts nodes, wikilinks, and semantic edges,
and exports the graph payload to data/graph.json and root graph.json.
"""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from typing import Any

from lib.models import GraphEdge, GraphEdgeType, GraphNode, ParaCategory, WikiNote
from lib.storage import (
    data_dir,
    graph_path,
    list_wiki_notes,
    load_manifest,
    project_root,
    save_manifest,
)

# Regex to match [[wikilink_slug]] or [[wikilink_slug|Display Text]]
WIKILINK_RE = re.compile(r"\[\[\s*([^\]|\#\s]+)(?:\|[^\]]+)?\s*\]\]")


def extract_wikilinks(text: str) -> list[str]:
    """Extract all unique wikilink target slugs from note body."""
    if not text:
        return []
    matches = WIKILINK_RE.findall(text)
    clean_slugs = []
    for match in matches:
        slug = match.strip().lower()
        if slug and slug not in clean_slugs:
            clean_slugs.append(slug)
    return clean_slugs


def create_excerpt(text: str, max_length: int = 200) -> str:
    """Extract a clean short text preview for node tooltips."""
    if not text:
        return ""
    # Strip headers, markdown bold/italic, extra whitespace
    lines = [line.strip() for line in text.splitlines() if line.strip() and not line.startswith("#")]
    clean = " ".join(lines)
    if len(clean) > max_length:
        return clean[: max_length - 3] + "..."
    return clean


def build_graph_data(notes_items: list[tuple[Path, WikiNote]] | None = None) -> dict[str, Any]:
    """Build knowledge graph dictionary containing meta, nodes, and edges."""
    if notes_items is None:
        notes_items = list_wiki_notes()

    valid_slugs = {note.slug for _, note in notes_items}
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    seen_edges: set[tuple[str, str, str]] = set()

    for _, note in notes_items:
        cat_str = (
            note.para_category.value
            if isinstance(note.para_category, ParaCategory)
            else str(note.para_category)
        )
        excerpt = create_excerpt(note.body)

        node = GraphNode(
            id=note.slug,
            label=note.title or note.slug.replace("-", " ").title(),
            para=cat_str,
            summary=note.summary or "",
            excerpt=excerpt,
        )
        nodes.append(asdict(node))

        # 1. Edges from explicit frontmatter links (similarity/semantic)
        for target in note.links:
            if target and target != note.slug and target in valid_slugs:
                edge_key = (note.slug, target, GraphEdgeType.SIMILARITY.value)
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    edge = GraphEdge(
                        source=note.slug,
                        target=target,
                        type=GraphEdgeType.SIMILARITY,
                        weight=1.0,
                    )
                    edge_dict = asdict(edge)
                    edge_dict["type"] = edge.type.value
                    edges.append(edge_dict)

        # 2. Edges from in-body wikilinks [[target]]
        body_wikilinks = extract_wikilinks(note.body)
        for target in body_wikilinks:
            if target and target != note.slug and target in valid_slugs:
                edge_key = (note.slug, target, GraphEdgeType.EXPLICIT_LINK.value)
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    edge = GraphEdge(
                        source=note.slug,
                        target=target,
                        type=GraphEdgeType.EXPLICIT_LINK,
                        weight=1.0,
                    )
                    edge_dict = asdict(edge)
                    edge_dict["type"] = edge.type.value
                    edges.append(edge_dict)

    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "meta": {
            "generated_at": now_iso,
            "note_count": len(nodes),
            "edge_count": len(edges),
        },
        "nodes": nodes,
        "edges": edges,
    }


def export_graph_json(
    output_path: Path | str | None = None,
    notes_items: list[tuple[Path, WikiNote]] | None = None,
) -> dict[str, Any]:
    """Build and write graph.json atomically to data/graph.json and root graph.json."""
    graph_data = build_graph_data(notes_items)

    primary_path = Path(output_path) if output_path else graph_path()

    # Ensure parent directory exists
    primary_path.parent.mkdir(parents=True, exist_ok=True)

    # Atomic write to primary path
    tmp_primary = primary_path.with_suffix(".tmp.json")
    with tmp_primary.open("w", encoding="utf-8") as f:
        json.dump(graph_data, f, indent=2)
        f.write("\n")
    tmp_primary.replace(primary_path)

    # Also write to root graph.json if primary path is in data/
    root_path = project_root() / "graph.json"
    if primary_path.resolve() != root_path.resolve():
        tmp_root = root_path.with_suffix(".tmp.json")
        with tmp_root.open("w", encoding="utf-8") as f:
            json.dump(graph_data, f, indent=2)
            f.write("\n")
        tmp_root.replace(root_path)

    # Update manifest
    manifest = load_manifest()
    manifest["last_graph_at"] = graph_data["meta"]["generated_at"]
    manifest["counts"]["graph_nodes"] = graph_data["meta"]["note_count"]
    manifest["counts"]["graph_edges"] = graph_data["meta"]["edge_count"]
    save_manifest(manifest)

    return graph_data
