"""Project configuration from config.yaml, environment, and .env."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

_CONFIG_FILENAME = "config.yaml"


def project_root() -> Path:
    """Directory containing config.yaml (or this repo root when developing)."""
    start = Path(__file__).resolve().parent.parent
    if (start / _CONFIG_FILENAME).is_file():
        return start
    cwd = Path.cwd()
    if (cwd / _CONFIG_FILENAME).is_file():
        return cwd
    return start


def _load_yaml_config(root: Path) -> dict[str, Any]:
    path = root / _CONFIG_FILENAME
    if not path.is_file():
        return {}
    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data if isinstance(data, dict) else {}


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _resolve_dir(root: Path, env_name: str, yaml_key: tuple[str, ...], default: str) -> Path:
    env_val = os.getenv(env_name)
    if env_val:
        p = Path(env_val)
        return p if p.is_absolute() else (root / p).resolve()
    cfg = _load_yaml_config(root)
    node: Any = cfg
    for key in yaml_key:
        if not isinstance(node, dict):
            node = None
            break
        node = node.get(key)
    rel = node if isinstance(node, str) and node.strip() else default
    return (root / rel).resolve()


@dataclass(frozen=True)
class Settings:
    """Runtime settings for SecondSelf pipelines."""

    root: Path
    raw_dir: Path
    wiki_dir: Path
    data_dir: Path
    groq_api_key: str | None
    groq_model: str
    embedding_model: str
    similarity_threshold: float
    top_k_rag: int
    max_tokens: int

    def ensure_dirs(self) -> None:
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.wiki_dir.mkdir(parents=True, exist_ok=True)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        (self.raw_dir / "files").mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    root = project_root()
    load_dotenv(root / ".env")
    yaml_cfg = _load_yaml_config(root)

    groq_block = yaml_cfg.get("groq") if isinstance(yaml_cfg.get("groq"), dict) else {}
    emb_block = yaml_cfg.get("embeddings") if isinstance(yaml_cfg.get("embeddings"), dict) else {}
    rag_block = yaml_cfg.get("rag") if isinstance(yaml_cfg.get("rag"), dict) else {}

    return Settings(
        root=root,
        raw_dir=_resolve_dir(root, "RAW_DIR", ("paths", "raw_dir"), "raw"),
        wiki_dir=_resolve_dir(root, "WIKI_DIR", ("paths", "wiki_dir"), "wiki"),
        data_dir=_resolve_dir(root, "DATA_DIR", ("paths", "data_dir"), "data"),
        groq_api_key=os.getenv("GROQ_API_KEY") or None,
        groq_model=os.getenv("GROQ_MODEL") or str(groq_block.get("model", "llama-3.3-70b-versatile")),
        embedding_model=os.getenv("EMBEDDING_MODEL")
        or str(emb_block.get("model", "all-MiniLM-L6-v2")),
        similarity_threshold=_env_float(
            "SIMILARITY_THRESHOLD",
            float(emb_block.get("similarity_threshold", 0.78)),
        ),
        top_k_rag=_env_int("TOP_K_RAG", int(rag_block.get("top_k", 5))),
        max_tokens=_env_int("MAX_TOKENS", int(groq_block.get("max_tokens", 1024))),
    )
