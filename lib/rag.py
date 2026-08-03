"""RAG (Retrieval-Augmented Generation) module for SecondSelf (Phase 5).

Retrieves top-k relevant wiki notes based on vector embedding similarity
and synthesizes natural language answers using Groq LLM.
"""

from __future__ import annotations

import logging
from typing import Any

from lib.config import get_settings
from lib.embeddings import cosine_similarity, encode_text, load_embeddings_store
from lib.llm_client import LLMClientError, get_llm_client
from lib.models import AskResult, AskSource, WikiNote
from lib.storage import list_wiki_notes

logger = logging.getLogger("secondself.rag")

RAG_SYSTEM_PROMPT = """\
You are SecondSelf, a personal AI second brain assistant.
Your goal is to answer the user's question based strictly on the provided note contexts retrieved from their personal wiki.

Rules:
1. Rely ONLY on the information given in the context notes below. Do NOT hallucinate facts not present in the notes.
2. Cite the source note titles in square brackets like [Note Title] whenever referencing information from a specific note.
3. If the provided notes do not contain sufficient information to answer the question, clearly state: "I don't have enough information in my notes to answer this question."
4. Format your answer in clean, readable markdown with bullet points or sections where appropriate.
"""


def create_snippet(note: WikiNote, max_length: int = 350) -> str:
    """Create concise snippet combining note summary and body preview."""
    text_parts = []
    if note.summary:
        text_parts.append(f"Summary: {note.summary}")
    if note.body:
        body_lines = [line.strip() for line in note.body.splitlines() if line.strip() and not line.startswith("#")]
        text_parts.append(" ".join(body_lines))

    combined = "\n".join(text_parts).strip()
    if len(combined) > max_length:
        return combined[: max_length - 3] + "..."
    return combined


def retrieve(question: str, top_k: int | None = None) -> list[AskSource]:
    """Retrieve top-k relevant wiki notes scored by embedding cosine similarity."""
    if not question or not question.strip():
        return []

    k = top_k if top_k is not None else get_settings().top_k_rag

    # 1. Encode question vector
    q_vector = encode_text(question)

    # 2. Load cached note vectors
    store = load_embeddings_store()
    vectors_cache = store.get("vectors", {})

    # 3. Load all wiki notes for metadata
    notes_items = list_wiki_notes()
    slug_to_note: dict[str, WikiNote] = {note.slug: note for _, note in notes_items}

    scored_sources: list[AskSource] = []

    for slug, entry in vectors_cache.items():
        note_vector = entry.get("vector")
        if not note_vector:
            continue

        score = cosine_similarity(q_vector, note_vector)
        note = slug_to_note.get(slug)

        if note:
            snippet = create_snippet(note)
            title = note.title or slug.replace("-", " ").title()
        else:
            snippet = f"Content from note: {slug}"
            title = slug.replace("-", " ").title()

        scored_sources.append(
            AskSource(
                note_id=slug,
                title=title,
                snippet=snippet,
                score=float(score),
            )
        )

    # Sort descending by similarity score
    scored_sources.sort(key=lambda s: s.score, reverse=True)
    return scored_sources[:k]


def synthesize(question: str, sources: list[AskSource]) -> str:
    """Synthesize natural language answer using Groq LLM given context sources."""
    if not sources:
        return "I don't have any relevant notes in my second brain to answer this question."

    context_blocks = []
    for idx, s in enumerate(sources, 1):
        context_blocks.append(
            f"### Context [{idx}]: {s.title} (slug: {s.note_id})\nRelevance Score: {s.score:.2f}\n{s.snippet}"
        )

    full_context = "\n\n".join(context_blocks)
    user_prompt = f"Question: {question}\n\n--- Retrieved Context Notes ---\n{full_context}"

    try:
        llm = get_llm_client()
        response = llm.client.chat.completions.create(
            model=llm.model,
            messages=[
                {"role": "system", "content": RAG_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=llm.max_tokens,
            temperature=0.2,
        )
        answer = response.choices[0].message.content or ""
        return answer.strip()

    except (LLMClientError, RuntimeError) as err:
        logger.warning("LLM client error during RAG synthesis: %s", err)
        # Fallback summary if API key is missing or unavailable
        fallback_titles = ", ".join([f"[{s.title}]" for s in sources[:3]])
        return (
            f"⚠️ **Groq API key not configured or unavailable.**\n\n"
            f"Based on vector search, the most relevant notes for your query are {fallback_titles}:\n\n"
            + "\n\n".join([f"- **[{s.title}]**: {s.snippet}" for s in sources[:3]])
        )
    except Exception as exc:
        logger.error("Unexpected error during RAG synthesis: %s", exc)
        return f"❌ Error synthesizing answer: {exc}"


def ask(question: str, top_k: int | None = None) -> AskResult:
    """End-to-end RAG query pipeline: retrieve sources and synthesize answer."""
    sources = retrieve(question, top_k=top_k)
    answer = synthesize(question, sources)
    graph_highlight = [s.note_id for s in sources]

    return AskResult(
        question=question,
        answer=answer,
        sources=sources,
        graph_highlight=graph_highlight,
    )
