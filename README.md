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

## Project layout

| Path | Purpose |
|------|---------|
| `raw/` | Raw captures (Week 1) |
| `wiki/` | Classified notes (Week 2+) |
| `data/` | Manifest, embeddings, graph JSON |
| `lib/` | Shared models, config, storage |
| `Docs/` | Architecture, implementation plan, edge cases |

## Documentation

- [PROBLEM_STATEMENT.md](./PROBLEM_STATEMENT.md)
- [Docs/architecture.md](./Docs/architecture.md)
- [Docs/implementation-plan.md](./Docs/implementation-plan.md)
- [Docs/edge-case.md](./Docs/edge-case.md)

## Next step

Implement **Phase 1** — `capture.py` and populate `raw/` with 10+ real items.
