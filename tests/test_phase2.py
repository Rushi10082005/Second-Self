"""Unit tests for Phase 2 PARA auto-classification pipeline."""

from datetime import datetime, timezone
import json
from pathlib import Path
from unittest.mock import MagicMock
import pytest

from lib.models import Capture, CaptureType, ParaCategory, WikiNote
from lib.prompts import format_classification_prompt, truncate_content
from lib.storage import (
    list_wiki_notes,
    load_manifest,
    load_wiki_note,
    save_capture,
    save_wiki_note,
    wiki_dir,
)
from classify import classify_capture, sanitize_slug


def test_truncate_content():
    short_text = "Short text"
    assert truncate_content(short_text, max_chars=100) == short_text

    long_text = "a" * 200
    truncated = truncate_content(long_text, max_chars=50)
    assert len(truncated) > 50
    assert "Truncated" in truncated


def test_sanitize_slug():
    assert sanitize_slug("My First Note!") == "my-first-note"
    assert sanitize_slug("  Groq -- LLM   API Integration  ") == "groq-llm-api-integration"
    assert sanitize_slug("!!!") == "untitled-note"


def test_save_and_load_wiki_note(tmp_path):
    note = WikiNote(
        slug="test-para-note",
        capture_id="cap-999",
        para_category=ParaCategory.PROJECTS,
        title="Test PARA Note",
        summary="A test note for PARA storage",
        body="# Test PARA Note\nBody text goes here.",
        tags=["python", "para"],
    )
    file_path = save_wiki_note(note)
    assert file_path.is_file()
    assert "Projects" in str(file_path)

    reloaded = load_wiki_note(file_path)
    assert reloaded.slug == "test-para-note"
    assert reloaded.para_category == ParaCategory.PROJECTS
    assert reloaded.title == "Test PARA Note"
    assert reloaded.tags == ["python", "para"]


def test_classify_capture_with_mock_llm():
    mock_llm = MagicMock()
    mock_llm.complete_json.return_value = {
        "title": "Groq API Setup Guide",
        "slug": "groq-api-setup-guide",
        "para_category": "Areas",
        "tags": ["groq", "llm", "api"],
        "summary": "Guide for configuring Groq API key and models.",
        "body": "# Groq API Setup Guide\nFollow these steps to setup Groq.",
    }

    cap = Capture(
        id="cap-mock-123",
        captured_at=datetime.now(timezone.utc),
        type=CaptureType.NOTE,
        content="Raw note content about Groq API setup.",
        source="unit_test",
    )

    wiki_note = classify_capture(cap, client=mock_llm)
    assert wiki_note.slug == "groq-api-setup-guide"
    assert wiki_note.para_category == ParaCategory.AREAS
    assert wiki_note.title == "Groq API Setup Guide"
    assert wiki_note.tags == ["groq", "llm", "api"]
    assert (wiki_dir() / "Areas" / "groq-api-setup-guide.md").is_file()
