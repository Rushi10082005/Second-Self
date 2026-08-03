"""Local sentence-transformers embeddings loader, cosine similarity, and JSON caching."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any
import numpy as np
from sentence_transformers import SentenceTransformer

from lib.config import get_settings
from lib.storage import embeddings_path, ensure_project_dirs

logger = logging.getLogger("secondself.embeddings")

_MODEL_INSTANCE: SentenceTransformer | None = None


def get_embedding_model(model_name: str | None = None) -> SentenceTransformer:
    """Lazy load SentenceTransformer model singleton."""
    global _MODEL_INSTANCE
    name = model_name or get_settings().embedding_model
    if _MODEL_INSTANCE is None:
        logger.info("Loading SentenceTransformer model: %s", name)
        _MODEL_INSTANCE = SentenceTransformer(name)
    return _MODEL_INSTANCE


def encode_text(text: str, model_name: str | None = None) -> list[float]:
    """Encode text to dense embedding vector as list of floats."""
    model = get_embedding_model(model_name)
    vec = model.encode(text or "", normalize_embeddings=True)
    if isinstance(vec, np.ndarray):
        return vec.tolist()
    return list(vec)


def cosine_similarity(v1: list[float] | np.ndarray, v2: list[float] | np.ndarray) -> float:
    """Calculate cosine similarity between two normalized vectors."""
    a = np.array(v1, dtype=np.float32)
    b = np.array(v2, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def compute_content_hash(text: str) -> str:
    """MD5 hash of note text for cache invalidation."""
    return hashlib.md5((text or "").encode("utf-8")).hexdigest()


def load_embeddings_store() -> dict[str, Any]:
    """Load data/embeddings.json cache store."""
    path = embeddings_path()
    default_store: dict[str, Any] = {
        "model": get_settings().embedding_model,
        "version": "1.0",
        "vectors": {},
    }
    if not path.is_file():
        return default_store
    try:
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            data.setdefault("vectors", {})
            return data
        return default_store
    except Exception as exc:
        logger.warning("Failed to load embeddings store: %s", exc)
        return default_store


def save_embeddings_store(store: dict[str, Any]) -> None:
    """Atomically save data/embeddings.json cache store."""
    ensure_project_dirs()
    path = embeddings_path()
    tmp = path.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(store, f, indent=2)
        f.write("\n")
    tmp.replace(path)
