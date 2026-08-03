"""Unit tests for Phase 5 RAG pipeline and ask CLI."""

from unittest.mock import MagicMock, patch
import pytest

from lib.models import AskResult, AskSource, ParaCategory, WikiNote
from lib.rag import ask, create_snippet, retrieve, synthesize
from lib.storage import save_wiki_note


def test_create_snippet():
    note = WikiNote(
        slug="snippet-test-note",
        capture_id="cap-99",
        para_category=ParaCategory.RESOURCES,
        title="Snippet Test Note",
        summary="This is the summary of the test note.",
        body="Main body content paragraph 1.\n\nParagraph 2 with details.",
    )
    snippet = create_snippet(note, max_length=100)
    assert "summary" in snippet.lower()
    assert len(snippet) <= 100


def test_retrieve_pipeline(tmp_path):
    note1 = WikiNote(
        slug="arch-note",
        capture_id="cap-1",
        para_category=ParaCategory.AREAS,
        title="Architecture Note",
        summary="System architecture and design patterns.",
        body="Detailed documentation about system architecture.",
    )
    save_wiki_note(note1)

    sources = retrieve("system architecture", top_k=3)
    assert isinstance(sources, list)
    if sources:
        top_source = sources[0]
        assert isinstance(top_source, AskSource)
        assert hasattr(top_source, "score")
        assert hasattr(top_source, "note_id")


def test_synthesize_fallback():
    sources = [
        AskSource(
            note_id="arch-note",
            title="Architecture Note",
            snippet="System architecture documentation.",
            score=0.92,
        )
    ]
    # Synthesize without API key or with mocked failure
    with patch("lib.rag.get_llm_client", side_effect=RuntimeError("API key missing")):
        answer = synthesize("What is the architecture?", sources)
        assert "[Architecture Note]" in answer
        assert "relevant notes" in answer.lower() or "architecture" in answer.lower()


def test_ask_wrapper():
    sources = [
        AskSource(
            note_id="para-note",
            title="PARA Method Guide",
            snippet="Tiago Forte PARA method for PKM.",
            score=0.88,
        )
    ]
    with patch("lib.rag.retrieve", return_value=sources), patch(
        "lib.rag.synthesize", return_value="The PARA method organizes notes into Projects, Areas, Resources, Archives [PARA Method Guide]."
    ):
        result = ask("How does PARA work?")
        assert isinstance(result, AskResult)
        assert result.question == "How does PARA work?"
        assert "PARA Method Guide" in result.answer
        assert len(result.sources) == 1
        assert result.graph_highlight == ["para-note"]
