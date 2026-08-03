# SecondSelf

Personal AI second brain: capture → PARA classify → auto-link → knowledge graph → ask anything (RAG).

## Setup (Phase 0)

Requires **Python 3.10+**.

```bash
cd "/Users/Shared/Files From e.localized/External/Second Brain"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add your Groq API key to .env (https://console.groq.com/)
```

Verify the library skeleton:

```bash
python -c "from lib import storage, models; storage.ensure_project_dirs(); print('OK')"
```

## End-to-End Pipeline Execution (Phase 7)

Run the full end-to-end pipeline (Capture → Classify → Link → Graph → Ask) with a single command:

```bash
# Execute full pipeline script
./scripts/pipeline.sh "My test note text" "What is tested in Phase 7?"
```

Or run individual CLI steps:

```bash
# 1. Capture
python capture.py note "New note text"
python capture.py link "https://example.com"
python capture.py file path/to/document.pdf

# 2. Classify (PARA)
python classify.py

# 3. Embeddings & Semantic Linking
python link.py

# 4. Knowledge Graph
python build_graph.py

# 5. RAG Question Answering
python ask.py "What do I know about system architecture?"

# 6. Streamlit Web Shell
streamlit run app.py
```

## Testing Suite

Run all automated unit and end-to-end integration tests:

```bash
pytest
```

## Project Layout

| Path | Purpose |
|------|---------|
| `raw/` | Raw captures (Phase 1) |
| `wiki/` | Classified notes (Phase 2+) |
| `data/` | Manifest, embeddings, graph JSON |
| `lib/` | Shared models, config, storage |
| `scripts/` | Pipeline script (`pipeline.sh`) & utilities |
| `tests/` | Automated test suite (Phase 0 to Phase 7) |
| `Docs/` | Architecture, implementation plan, edge cases |

## Documentation

- [PROBLEM_STATEMENT.md](./PROBLEM_STATEMENT.md)
- [Docs/architecture.md](./Docs/architecture.md)
- [Docs/implementation-plan.md](./Docs/implementation-plan.md)
- [Docs/edge-case.md](./Docs/edge-case.md)

## Next Step

Proceed to **Phase 8** — Deploy application & configure secrets on Streamlit Cloud / HuggingFace Spaces.
