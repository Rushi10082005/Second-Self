"""Unit tests for Phase 1 capture pipeline."""

from datetime import datetime, timezone
import json
from pathlib import Path
import pytest

from lib.models import Capture, CaptureType
from lib.storage import load_capture_file, load_manifest, raw_dir, raw_index_path, save_capture
from capture import capture_file, capture_link, capture_note


def test_save_capture_note():
    now = datetime.now(timezone.utc)
    cap = Capture(
        id="test-cap-1",
        captured_at=now,
        type=CaptureType.NOTE,
        content="Testing capture note content UTF-8 👌",
        source="test",
    )
    saved_path = save_capture(cap)
    assert saved_path.exists()
    assert saved_path.suffix == ".md"

    # Reload capture
    reloaded = load_capture_file(saved_path)
    assert reloaded.id == "test-cap-1"
    assert reloaded.type == CaptureType.NOTE
    assert "Testing capture note content" in reloaded.content


def test_capture_note_cli_fn():
    saved_path = capture_note("My first CLI note text", source="cli_test")
    assert saved_path.is_file()

    reloaded = load_capture_file(saved_path)
    assert reloaded.type == CaptureType.NOTE
    assert reloaded.content == "My first CLI note text"


def test_capture_link_cli_fn():
    saved_path = capture_link("https://example.com", source="link_test")
    assert saved_path.is_file()

    reloaded = load_capture_file(saved_path)
    assert reloaded.type == CaptureType.LINK
    assert reloaded.source == "https://example.com"


def test_capture_file_cli_fn(tmp_path):
    sample_file = tmp_path / "sample_doc.txt"
    sample_file.write_text("Sample file text content for Phase 1 testing.", encoding="utf-8")

    saved_path = capture_file(str(sample_file), source="file_test")
    assert saved_path.is_file()

    reloaded = load_capture_file(saved_path)
    assert reloaded.type == CaptureType.FILE
    assert "Sample file text content" in reloaded.content
    assert reloaded.extra.get("original_filename") == "sample_doc.txt"


def test_index_jsonl_updated():
    idx_file = raw_index_path()
    assert idx_file.is_file()
    lines = idx_file.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) > 0
    last_entry = json.loads(lines[-1])
    assert "id" in last_entry
    assert "filename" in last_entry
