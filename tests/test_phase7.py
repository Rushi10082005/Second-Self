"""End-to-end tests for Phase 7 pipeline execution."""

from datetime import datetime, timezone
import json
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

from lib.config import Settings, get_settings
from lib.graph_builder import build_graph_data, export_graph_json
from lib.models import Capture, CaptureType, ParaCategory, WikiNote
from lib.rag import ask, retrieve
from lib.storage import (
    list_raw_captures,
    list_wiki_notes,
    load_manifest,
    save_capture,
    save_wiki_note,
)


def test_full_pipeline_flow(tmp_path, monkeypatch):
    test_settings = get_settings()
    custom_settings = Settings(
        root=tmp_path,
        raw_dir=tmp_path / "raw",
        wiki_dir=tmp_path / "wiki",
        data_dir=tmp_path / "data",
        groq_api_key=test_settings.groq_api_key,
        groq_model=test_settings.groq_model,
        embedding_model=test_settings.embedding_model,
        similarity_threshold=test_settings.similarity_threshold,
        top_k_rag=test_settings.top_k_rag,
        max_tokens=test_settings.max_tokens,
    )
    monkeypatch.setattr("lib.storage.get_settings", lambda: custom_settings)
    monkeypatch.setattr("lib.config.get_settings", lambda: custom_settings)
    
    custom_settings.ensure_dirs()

    # 1. Capture step
    cap = Capture(
        id="cap-e2e-1",
        captured_at=datetime.now(timezone.utc),
        type=CaptureType.NOTE,
        content="Phase 7 E2E note on system architecture and vector search integration.",
        source="unit-test",
    )
    cap_path = save_capture(cap)
    assert cap_path.exists()
    raw_items = list_raw_captures()
    assert len(raw_items) == 1

    # 2. Classify step (simulated/manual save into wiki)
    wiki_note = WikiNote(
        slug="e2e-system-architecture",
        capture_id=cap.id,
        para_category=ParaCategory.PROJECTS,
        title="E2E System Architecture",
        summary="Architecture testing for E2E pipeline verification.",
        tags=["e2e", "testing", "architecture"],
        body="This document describes the end to end system architecture testing.",
    )
    save_wiki_note(wiki_note)
    notes_items = list_wiki_notes()
    assert len(notes_items) == 1
    assert notes_items[0][1].slug == "e2e-system-architecture"

    # 3. Link / Embeddings step
    mock_vec = [0.1] * 384
    with patch("lib.embeddings.encode_text", return_value=mock_vec):
        embeddings_cache = {"model": "test-model", "vectors": {wiki_note.slug: {"vector": mock_vec}}}
        with open(tmp_path / "data" / "embeddings.json", "w") as f:
            json.dump(embeddings_cache, f)

    # 4. Graph building step
    graph_data = export_graph_json(output_path=tmp_path / "data" / "graph.json")
    assert "nodes" in graph_data
    assert "edges" in graph_data
    assert any(n["id"] == "e2e-system-architecture" for n in graph_data["nodes"])

    # 5. Ask RAG step
    with patch("lib.rag.list_wiki_notes", return_value=[(tmp_path / "wiki" / "Projects" / "e2e-system-architecture.md", wiki_note)]):
        sources = retrieve("system architecture", top_k=1)
        assert isinstance(sources, list)


def test_pipeline_script_executable():
    """Verify that scripts/pipeline.sh script exists and has executable permissions."""
    script_path = Path(__file__).parent.parent / "scripts" / "pipeline.sh"
    assert script_path.exists()
    assert script_path.stat().st_mode & 0o111  # check executable flag
