"""Unit tests for Phase 0 setup, configuration, storage helpers, and dataclasses."""

from datetime import datetime, timezone
import json
import tempfile
from pathlib import Path
import pytest

from lib.config import Settings, get_settings, project_root
from lib.models import (
    AskResult,
    AskSource,
    Capture,
    CaptureType,
    GraphEdge,
    GraphEdgeType,
    GraphNode,
    ParaCategory,
    WikiNote,
)
from lib.storage import (
    data_dir,
    embeddings_path,
    ensure_project_dirs,
    graph_path,
    load_manifest,
    manifest_path,
    raw_dir,
    raw_index_path,
    resolve_under_root,
    save_manifest,
    wiki_dir,
)


def test_project_root_exists():
    root = project_root()
    assert root.exists()
    assert (root / "config.yaml").is_file()


def test_settings_defaults():
    settings = get_settings()
    assert isinstance(settings, Settings)
    assert settings.groq_model == "llama-3.3-70b-versatile"
    assert settings.embedding_model == "all-MiniLM-L6-v2"
    assert settings.similarity_threshold == 0.78
    assert settings.top_k_rag == 5
    assert settings.max_tokens == 1024


def test_ensure_dirs_and_paths():
    ensure_project_dirs()
    assert raw_dir().is_dir()
    assert (raw_dir() / "files").is_dir()
    assert wiki_dir().is_dir()
    assert data_dir().is_dir()
    assert manifest_path() == data_dir() / "index_manifest.json"
    assert embeddings_path() == data_dir() / "embeddings.json"
    assert graph_path() == data_dir() / "graph.json"
    assert raw_index_path() == raw_dir() / "index.jsonl"


def test_load_and_save_manifest():
    manifest = load_manifest()
    assert "classified_capture_ids" in manifest
    assert "note_content_hashes" in manifest
    assert "counts" in manifest

    manifest["counts"]["captures"] += 1
    save_manifest(manifest)

    updated = load_manifest()
    assert updated["counts"]["captures"] == manifest["counts"]["captures"]


def test_resolve_under_root():
    root = project_root()
    valid_path = root / "data" / "index_manifest.json"
    assert resolve_under_root(valid_path) == valid_path.resolve()

    with pytest.raises(ValueError, match="Path escapes project root"):
        resolve_under_root(Path("/tmp/outside_file.txt"))


def test_capture_dataclass():
    now = datetime.now(timezone.utc)
    cap = Capture(
        id="cap-123",
        captured_at=now,
        type=CaptureType.NOTE,
        content="Test capture text",
        source="cli",
    )
    assert cap.id == "cap-123"
    assert cap.type == CaptureType.NOTE
    assert cap.content == "Test capture text"
    assert cap.source == "cli"


def test_wiki_note_dataclass():
    note = WikiNote(
        slug="test-note",
        capture_id="cap-123",
        para_category=ParaCategory.PROJECTS,
        title="Test Note",
        summary="A test note summary",
        body="# Test Note\nBody content",
        tags=["python", "test"],
        links=["other-note"],
    )
    assert note.slug == "test-note"
    assert note.para_category == ParaCategory.PROJECTS
    assert note.tags == ["python", "test"]


def test_graph_dataclasses():
    node = GraphNode(
        id="node-1",
        label="Node One",
        para="Projects",
        summary="Summary of node 1",
    )
    edge = GraphEdge(
        source="node-1",
        target="node-2",
        type=GraphEdgeType.EXPLICIT_LINK,
        weight=1.0,
    )
    assert node.id == "node-1"
    assert edge.source == "node-1"
    assert edge.type == GraphEdgeType.EXPLICIT_LINK


def test_ask_dataclasses():
    source = AskSource(
        note_id="note-1",
        title="Note 1",
        snippet="Snippet text",
        score=0.92,
    )
    res = AskResult(
        question="What is Phase 0?",
        answer="Phase 0 is project setup.",
        sources=[source],
        graph_highlight=["note-1"],
    )
    assert res.question == "What is Phase 0?"
    assert len(res.sources) == 1
    assert res.sources[0].score == 0.92
