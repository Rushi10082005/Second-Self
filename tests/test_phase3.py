"""Unit tests for Phase 3 embeddings and auto-linking pipeline."""

import json
from pathlib import Path
from unittest.mock import patch
import numpy as np
import pytest

from lib.embeddings import (
    compute_content_hash,
    cosine_similarity,
    encode_text,
    load_embeddings_store,
    save_embeddings_store,
)
from lib.models import ParaCategory, WikiNote
from lib.storage import embeddings_path, load_wiki_note, save_wiki_note, update_note_links
from link import run_linking


def test_cosine_similarity():
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    v3 = [0.0, 1.0, 0.0]

    assert pytest.approx(cosine_similarity(v1, v2), 0.001) == 1.0
    assert pytest.approx(cosine_similarity(v1, v3), 0.001) == 0.0


def test_compute_content_hash():
    h1 = compute_content_hash("Hello World")
    h2 = compute_content_hash("Hello World")
    h3 = compute_content_hash("Different Text")

    assert h1 == h2
    assert h1 != h3
    assert len(h1) == 32


def test_encode_text():
    vec = encode_text("SecondSelf unit test vector encoding")
    assert isinstance(vec, list)
    assert len(vec) == 384
    # Verify vector normalization (magnitude close to 1)
    norm = np.linalg.norm(np.array(vec))
    assert pytest.approx(norm, 0.01) == 1.0


def test_load_and_save_embeddings_store(tmp_path, monkeypatch):
    test_file = tmp_path / "embeddings.json"
    monkeypatch.setattr("lib.embeddings.embeddings_path", lambda: test_file)

    store = load_embeddings_store()
    assert "vectors" in store
    assert "model" in store

    store["vectors"]["test-slug"] = {"hash": "abc123hash", "vector": [0.1, 0.2]}
    save_embeddings_store(store)

    reloaded = load_embeddings_store()
    assert "test-slug" in reloaded["vectors"]
    assert reloaded["vectors"]["test-slug"]["hash"] == "abc123hash"


def test_update_note_links_idempotent(tmp_path):
    note = WikiNote(
        slug="source-note",
        capture_id="cap-100",
        para_category=ParaCategory.RESOURCES,
        title="Source Note Title",
        summary="Summary text",
        body="# Source Note Title\nMain body text of the note.",
    )
    saved_path = save_wiki_note(note)

    # First update links
    updated1 = update_note_links(saved_path, ["target-note-a", "target-note-b"])
    assert updated1.links == ["target-note-a", "target-note-b"]
    assert "## Related" in updated1.body
    assert "- [[target-note-a]]" in updated1.body
    assert "- [[target-note-b]]" in updated1.body

    # Second update links (re-run test for idempotency)
    updated2 = update_note_links(saved_path, ["target-note-a", "target-note-c"])
    assert updated2.links == ["target-note-a", "target-note-c"]
    assert updated2.body.count("## Related") == 1
    assert "- [[target-note-c]]" in updated2.body
    assert "- [[target-note-b]]" not in updated2.body
