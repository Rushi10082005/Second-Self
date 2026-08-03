"""Unit tests for Phase 4 graph builder pipeline."""

import json
from pathlib import Path
import pytest

from lib.graph_builder import (
    build_graph_data,
    create_excerpt,
    export_graph_json,
    extract_wikilinks,
)
from lib.models import ParaCategory, WikiNote
from lib.storage import save_wiki_note


def test_extract_wikilinks():
    text = "Check out [[alpha-note]] and also [[beta-note|Beta Title]] or [[alpha-note]]."
    slugs = extract_wikilinks(text)
    assert slugs == ["alpha-note", "beta-note"]


def test_create_excerpt():
    text = "# Main Title\n\nThis is the first paragraph of the note text content."
    excerpt = create_excerpt(text, max_length=50)
    assert not excerpt.startswith("#")
    assert "first paragraph" in excerpt
    assert len(excerpt) <= 50


def test_build_graph_data(tmp_path):
    note1 = WikiNote(
        slug="note-alpha",
        capture_id="cap-1",
        para_category=ParaCategory.PROJECTS,
        title="Note Alpha",
        summary="Summary of Alpha",
        body="Body of Alpha pointing to [[note-beta]].",
        links=["note-beta"],
    )
    note2 = WikiNote(
        slug="note-beta",
        capture_id="cap-2",
        para_category=ParaCategory.RESOURCES,
        title="Note Beta",
        summary="Summary of Beta",
        body="Body of Beta pointing back to [[note-alpha]].",
        links=[],
    )

    path1 = save_wiki_note(note1)
    path2 = save_wiki_note(note2)

    data = build_graph_data([(path1, note1), (path2, note2)])

    assert "meta" in data
    assert data["meta"]["note_count"] == 2
    assert len(data["nodes"]) == 2

    node_ids = {n["id"] for n in data["nodes"]}
    assert node_ids == {"note-alpha", "note-beta"}

    # Check edges
    edges = data["edges"]
    assert len(edges) >= 2
    edge_pairs = {(e["source"], e["target"]) for e in edges}
    assert ("note-alpha", "note-beta") in edge_pairs


def test_export_graph_json(tmp_path, monkeypatch):
    test_data_dir = tmp_path / "data"
    test_data_dir.mkdir()
    graph_out = test_data_dir / "graph.json"

    # Mock storage paths for clean test run
    monkeypatch.setattr("lib.graph_builder.graph_path", lambda: graph_out)
    monkeypatch.setattr("lib.graph_builder.project_root", lambda: tmp_path)

    note = WikiNote(
        slug="standalone-note",
        capture_id="cap-10",
        para_category=ParaCategory.AREAS,
        title="Standalone Note",
        summary="Standalone summary",
        body="No links here.",
    )
    note_path = save_wiki_note(note)

    data = export_graph_json(output_path=graph_out, notes_items=[(note_path, note)])

    assert graph_out.is_file()
    assert (tmp_path / "graph.json").is_file()

    with graph_out.open(encoding="utf-8") as f:
        loaded = json.load(f)

    assert loaded["meta"]["note_count"] == 1
    assert loaded["nodes"][0]["id"] == "standalone-note"
