"""Domain models for captures, wiki notes, graph, and RAG."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class CaptureType(str, Enum):
    NOTE = "note"
    LINK = "link"
    FILE = "file"


class ParaCategory(str, Enum):
    PROJECTS = "Projects"
    AREAS = "Areas"
    RESOURCES = "Resources"
    ARCHIVES = "Archives"


class GraphEdgeType(str, Enum):
    EXPLICIT_LINK = "explicit_link"
    SIMILARITY = "similarity"
    SAME_CAPTURE_CHAIN = "same_capture_chain"


@dataclass
class Capture:
    """Raw ingest item (Week 1)."""

    id: str
    captured_at: datetime
    type: CaptureType
    content: str
    source: str | None = None
    mime: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class WikiNote:
    """Classified note in wiki/ (Week 2+)."""

    slug: str
    capture_id: str
    para_category: ParaCategory
    title: str
    summary: str
    body: str
    tags: list[str] = field(default_factory=list)
    links: list[str] = field(default_factory=list)
    embedding_id: str | None = None
    path: str | None = None


@dataclass
class GraphNode:
    """Node in graph.json (Week 3)."""

    id: str
    label: str
    para: str
    summary: str
    excerpt: str | None = None


@dataclass
class GraphEdge:
    """Edge in graph.json (Week 3)."""

    source: str
    target: str
    type: GraphEdgeType
    weight: float | None = None


@dataclass
class AskSource:
    """One retrieved note used in RAG (Week 4)."""

    note_id: str
    title: str
    snippet: str
    score: float


@dataclass
class AskResult:
    """Response from ask() (Week 4)."""

    question: str
    answer: str
    sources: list[AskSource] = field(default_factory=list)
    graph_highlight: list[str] = field(default_factory=list)
