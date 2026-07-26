# SecondSelf — Phase-Wise Implementation Plan

This plan implements **SecondSelf** (personal AI second brain) as defined in the project problem statement and [architecture.md](./architecture.md).

**References**

| Document | Role |
|----------|------|
| [architecture.md](./architecture.md) | Components, data models, stack, deployment |
| [1783422081923-019f3c3d-5b83-7000-ad4c-0b2259320726-Week_1_Session_1_Note.md](./1783422081923-019f3c3d-5b83-7000-ad4c-0b2259320726-Week_1_Session_1_Note.md) | Weekly goals, acceptance criteria, badges |

**Phase map**

| Phase | Focus | Course week / badge |
|-------|--------|---------------------|
| 0 | Setup | — |
| 1 | Capture pipeline | Week 1 — The Archivist |
| 2 | Auto-classify (PARA) | Week 2.1 — Librarian |
| 3 | Embeddings + auto-link | Week 2.2 — Librarian |
| 4 | Graph JSON + interactive viz | Week 3 — The Cartographer |
| 5 | RAG `ask()` + Streamlit shell | Week 4 — The Oracle |
| 6 | Component testing (local) | — |
| 7 | End-to-end testing (local) | — |
| 8 | Deploy + public URL | Oracle (ship) |
| 9 | Production verification + README/GitHub | Final deliverables |

---

## Phase 0 — Setup

**Goal:** Runnable Python project skeleton, configuration, and secrets pattern — no feature logic yet.

**Architecture refs:** §3 Repository layout, §7 Technology stack, §8.1 Configuration

### Tasks

1. **Initialize project root** (this workspace or `secondself/` subfolder if you prefer a clean app root).
   - Create directories: `raw/`, `wiki/`, `data/`, `lib/`, `docs/` (optional mirror for docs).
   - Add `.gitkeep` in empty dirs if using Git.

2. **Python environment**
   - Python 3.10+ virtualenv.
   - Create `requirements.txt` with pinned/minimum versions for: `pyyaml`, `python-frontmatter`, `requests`, `groq`, `sentence-transformers`, `torch` (CPU), `streamlit`, `pypdf` (optional, for PDFs in Phase 2).

3. **Configuration**
   - Add `.env.example` with `GROQ_API_KEY`, optional `GROQ_MODEL`, `EMBEDDING_MODEL`, `SIMILARITY_THRESHOLD`, `TOP_K_RAG`.
   - Add `config.yaml` or `lib/config.py` loading env + defaults (`RAW_DIR`, `WIKI_DIR`, `DATA_DIR`).

4. **Shared library stubs**
   - `lib/__init__.py`
   - `lib/models.py` — dataclasses: `Capture`, `WikiNote`, `GraphNode`, `GraphEdge`, `AskResult` (fields per architecture §4).
   - `lib/storage.py` — path helpers, ensure dirs exist.
   - `data/index_manifest.json` — initial empty manifest schema.

5. **Documentation hygiene**
   - Copy or link problem statement into `PROBLEM_STATEMENT.md` (from session note).
   - Keep `architecture.md` at repo root (or under `docs/` — stay consistent).
   - Add `.gitignore`: `.env`, `__pycache__/`, `.venv/`, large model caches if desired.

6. **Groq account**
   - Create Groq API key; load locally via `.env` (never commit).

### Deliverables

- [ ] Folder structure matches architecture §3 (at minimum `raw/`, `wiki/`, `data/`, `lib/`).
- [ ] `pip install -r requirements.txt` succeeds in a fresh venv.
- [ ] `GROQ_API_KEY` documented in `.env.example`.
- [ ] `lib/models.py` and `lib/storage.py` import without error.

### Exit criteria

Run: `python -c "from lib import storage, models"` — no errors.

---

## Phase 1 — Capture pipeline (Week 1)

**Goal:** One command captures note, link, or file into `raw/` with timestamp + unique ID. Populate **10+ real captures**.

**Architecture refs:** §4.1 Capture, §5.1 `capture.py`

### Tasks

1. **Implement `lib/storage.py`**
   - `save_capture(capture: Capture) -> Path`
   - Filename: `{timestamp}_{uuid}.md` (or file + sidecar per architecture).
   - YAML frontmatter: `id`, `captured_at`, `type`, `source`, `mime`.
   - Append line to `raw/index.jsonl` (optional but recommended).

2. **Implement `capture.py` CLI**
   - Subcommands: `note`, `link`, `file`.
   - `note`: `--text` or stdin.
   - `link`: URL arg; optional fetch title/body via `requests` (timeout, handle failures gracefully).
   - `file`: copy to `raw/files/{id}/` or store reference; record original name and mime.

3. **Validation**
   - UUID v4 and ISO 8601 UTC on every capture.
   - UTF-8 normalization for text.

4. **Real-data capture session**
   - Capture at least 10 items from your own scattered notes, bookmarks, and files (not synthetic test strings).

### Deliverables

- [ ] `python capture.py note "..."` / `link` / `file` all work.
- [ ] `raw/` contains 10+ real items.
- [ ] Each item has unique ID + timestamp in frontmatter or sidecar.

### Acceptance criteria (Week 1)

- [ ] `raw/` and `wiki/` exist
- [ ] One command captures note, link, AND file
- [ ] Every capture has timestamp + unique ID
- [ ] 10+ real items captured

**Badge:** The Archivist

---

## Phase 2 — Auto-classify / PARA (Week 2.1)

**Goal:** Raw captures → organized `wiki/` notes with PARA category, tags, summary, title.

**Architecture refs:** §4.2 Wiki note, §5.2 `classify.py`, §8.4 Link and file extraction

### Tasks

1. **`lib/llm_client.py`**
   - Groq client wrapper: retries, rate-limit backoff, load key from env.
   - `complete_json(prompt) -> dict` with parse retry on invalid JSON.

2. **`lib/prompts.py`**
   - PARA definitions in prompt.
   - Truncate raw content to token-safe length.
   - Required JSON schema: `para_category`, `tags`, `summary`, `title`.

3. **`classify.py`**
   - List raw captures not in `data/index_manifest.json` → `classified_capture_ids`.
   - For each: extract text (markdown body, link text, PDF via `pypdf` if applicable).
   - Write `wiki/{Projects|Areas|Resources|Archives}/{slug}.md` with frontmatter + body.
   - Update manifest after each success; log failures.

4. **CLI flags**
   - `--force` reclassify all.
   - `--id` single capture.

5. **Run on real data**
   - Classify all Phase 1 captures; aim for **15+ wiki notes** total (capture more in Phase 1 if needed).

### Deliverables

- [ ] `python classify.py` processes unclassified raw items.
- [ ] Wiki files have PARA folder/category, tags, summary in frontmatter.
- [ ] `capture_id` links back to raw.

### Partial acceptance (Week 2)

- [ ] Any raw capture → category + tags + summary automatically
- [ ] PARA categorization working

---

## Phase 3 — Embeddings + auto-link (Week 2.2)

**Goal:** Semantic similarity links between related wiki notes; persist embeddings for RAG.

**Architecture refs:** §5.3 `link.py`, §4.2 `links`, §8.3 Long documents (MVP: whole-note)

### Tasks

1. **`lib/embeddings.py`**
   - Load `sentence-transformers` model from config (default `all-MiniLM-L6-v2`).
   - `encode(text) -> vector`; cosine similarity helper.
   - Load/save `data/embeddings.json` with model name + version for cache invalidation.

2. **`link.py`**
   - Load all wiki notes; compute missing/changed embeddings (hash body in manifest).
   - Pairwise similarity (O(n²)); for each note, top-K neighbors above `SIMILARITY_THRESHOLD` (start ~0.78, tune).
   - Cap links per note (e.g. 5) to avoid clutter.
   - Update frontmatter `links` and add `## Related` with `[[slug]]` wikilinks (avoid duplicate sections on re-run).

3. **Re-run classify + link**
   - Ensure **15+ real items** in organized, linked `wiki/`.

### Deliverables

- [ ] `data/embeddings.json` populated.
- [ ] Related notes show bidirectional or consistent wikilinks without manual tagging.
- [ ] `python link.py` is idempotent (safe to re-run).

### Acceptance criteria (Week 2 complete)

- [ ] Embeddings computed per note
- [ ] Related notes auto-linked
- [ ] Runs on 15+ real items → organized `wiki/`

**Badge:** The Librarian

---

## Phase 4 — Graph builder + interactive visualization (Week 3)

**Goal:** `graph.json` from wiki; force-directed graph with hover, drag, zoom.

**Architecture refs:** §4.3 Graph, §5.4 `build_graph.py`, §5.5 Interactive graph

### Tasks

1. **`lib/graph_builder.py`**
   - Parse all `wiki/**/*.md` with frontmatter.
   - Nodes: id (slug), label (title), para, summary, excerpt/body preview for hover.
   - Edges: from wikilinks + optional similarity metadata in frontmatter.
   - Export JSON schema per architecture §4.3.
   - Write `data/graph.json` (and/or root `graph.json` per course spec).

2. **`build_graph.py` CLI**
   - `--output` path; print node/edge counts.

3. **Standalone graph viewer (dev)**
   - `static/graph.html` or embedded template using **vis-network** (recommended) or Cytoscape.js.
   - Load JSON; force-directed layout; hover tooltip with summary + content snippet; drag + zoom.

4. **Verify on real wiki**
   - Graph reflects your actual notes, not dummy nodes.

### Deliverables

- [ ] `python build_graph.py` produces valid JSON.
- [ ] Opening graph HTML (or early Streamlit component) shows interactive brain from real data.

### Acceptance criteria (Week 3)

- [ ] Script builds nodes + edges and exports clean JSON
- [ ] Interactive force-directed graph renders from JSON
- [ ] Hover reveals note content
- [ ] Drag + zoom work
- [ ] Built from real notes

**Badge:** The Cartographer

---

## Phase 5 — RAG + Streamlit application (Week 4 build)

**Goal:** `ask()` function and unified `app.py` with graph + ask UI (local run).

**Architecture refs:** §4.4 RAG, §5.6 `ask.py`, §5.7 `app.py`

### Tasks

1. **`lib/rag.py`**
   - `retrieve(question, k)` — embed question, score wiki notes via cached embeddings, return top-k with snippets.
   - `synthesize(question, contexts)` — Groq prompt: answer only from context, cite titles, admit ignorance.
   - Public `ask(question) -> AskResult` (answer, sources, optional `graph_highlight` node ids).

2. **`ask.py` CLI**
   - `python ask.py "Your question?"` for terminal testing.

3. **`app.py` (Streamlit)**
   - Sidebar: note count, last manifest timestamps, link to rebuild graph (local only).
   - Tab **Brain:** `st.components.v1.html` with vis-network fed by `graph.json`.
   - Tab **Ask:** search bar, display answer + source expanders with scores.
   - `@st.cache_resource` for embedding model load (slow first run).

4. **Optional Tab Capture**
   - Wire to `capture` functions for local use; document that cloud deploy may be read-only (architecture §9).

5. **Local smoke**
   - `streamlit run app.py` — graph and ask both functional against your wiki.

### Deliverables

- [ ] `ask()` returns synthesized answers with retrieved sources.
- [ ] Single Streamlit app contains graph + ask bar.

### Partial acceptance (Week 4 build)

- [ ] `ask()` uses retrieval + LLM on your notes
- [ ] One Streamlit app contains graph and search

---

## Phase 6 — Local component testing

**Goal:** Verify each module in isolation before full pipeline test.

**Architecture refs:** §11 Testing strategy

### Tasks

1. **Capture tests**
   - Manual checklist or `tests/test_capture.py`: note/link/file create expected files and frontmatter fields.

2. **Classify tests**
   - Mock Groq response JSON → assert wiki path and frontmatter.
   - One optional live smoke test with real API (manual, not CI-required).

3. **Link tests**
   - Fixture: two similar markdown notes in temp `wiki/` → assert edge/link after `link.py`.

4. **Graph tests**
   - Fixture wiki → run builder → assert node count, edge count, JSON schema keys.

5. **RAG tests**
   - Known question tied to a specific note title → assert that note id appears in `sources`.

6. **Fix regressions**
   - Log issues in a scratch file or GitHub Issues; fix before Phase 7.

### Deliverables

- [ ] Test checklist completed (automated tests optional but recommended for capture/graph).
- [ ] No blocking bugs in any single script CLI.

### Exit criteria

Each script runs successfully on your real `raw/` / `wiki/` data without manual file edits.

---

## Phase 7 — End-to-end local testing

**Goal:** Full pipeline on real data: capture → classify → link → graph → ask.

**Architecture refs:** §6 Data flow, Final deliverables in problem statement

### Tasks

1. **Clean run script (optional `scripts/pipeline.sh`)**
   ```bash
   python capture.py note "E2E test note about ..."
   python classify.py
   python link.py
   python build_graph.py
   python ask.py "question about E2E test note"
   ```

2. **E2E checklist**
   - [ ] New capture appears in `raw/`
   - [ ] Classify promotes to correct PARA folder
   - [ ] Link adds related edges when similar notes exist
   - [ ] Graph JSON updates; Streamlit graph shows new node
   - [ ] Ask returns answer citing relevant notes

3. **Performance sanity**
   - Note embedding model load time acceptable on your machine.
   - Groq latency acceptable for ask flow.

4. **Data review**
   - Sanitize or redact sensitive notes before any public deploy (architecture §10).

### Deliverables

- [ ] Documented E2E steps in README (draft section OK).
- [ ] End-to-end flow verified locally.

---

## Phase 8 — Deploy + public URL

**Goal:** Live Streamlit (or HF Spaces) deployment with secrets configured.

**Architecture refs:** §9 Deployment architecture, §10 Security

### Tasks

1. **Prepare repo for cloud**
   - Commit `wiki/`, `data/graph.json`, `data/embeddings.json` (or document build step on deploy).
   - Ensure app reads bundled data paths correctly.
   - Do **not** commit `.env` or private raw captures unless repo is private and intentional.

2. **GitHub**
   - Public repo with clean structure.
   - README: setup, env vars, local pipeline commands.

3. **Streamlit Cloud (or HF Spaces)**
   - Connect repo; main file `app.py`.
   - Set secrets: `GROQ_API_KEY` in host UI.
   - Pick Python version matching local; specify `requirements.txt`.

4. **Deploy constraints**
   - If cold start fails (memory): reduce model size or pre-bake Space with dependencies.
   - Document read-only mode if capture cannot persist on server.

5. **Obtain public URL**
   - Record URL in README.

### Deliverables

- [ ] Deployed live with public URL
- [ ] Graph loads on deployed app
- [ ] Ask works with Groq secret on host

---

## Phase 9 — Production verification + final ship

**Goal:** Final acceptance, documentation, and course deliverables closed.

### Tasks

1. **Production test matrix** (run against **deployed** URL)

   | Check | Pass |
   |-------|------|
   | Graph renders, drag/zoom/hover | |
   | Ask returns answer + sources from your notes | |
   | No secret leakage in repo or browser | |
   | README clone + local setup steps work on fresh machine (friend or second folder) | |

2. **README completion**
   - Project overview (SecondSelf goal in one paragraph).
   - Architecture diagram link to `architecture.md`.
   - Phase/command cheat sheet:
     - `capture.py` → `classify.py` → `link.py` → `build_graph.py` → `streamlit run app.py`
   - Groq signup link; privacy note (data sent to API).
   - Live demo URL.

3. **Final deliverables checklist** (problem statement)

   - [ ] Public GitHub repo + README + setup
   - [ ] Live URL — graph + ask working
   - [ ] E2E: capture → classify → link → graph → ask
   - [ ] All 4 weekly milestones complete

4. **Optional follow-up**
   - Generate `edge-case.md` from architecture + this plan (course prompt 4).
   - Move docs into `docs/` and update paths if needed.

### Deliverables

- [ ] Full pipeline works in deployed app (read-only or documented capture limits)
- [ ] All Week 4 acceptance criteria met

**Badge:** The Oracle

---

## Suggested timeline

| Phase | Effort (indicative) | Depends on |
|-------|---------------------|------------|
| 0 | 1–2 hours | — |
| 1 | 2–4 hours | Phase 0 |
| 2 | 3–5 hours | Phase 1, Groq key |
| 3 | 3–5 hours | Phase 2 |
| 4 | 4–6 hours | Phase 3 |
| 5 | 4–8 hours | Phase 3–4 |
| 6 | 2–4 hours | Phases 1–5 |
| 7 | 1–2 hours | Phase 6 |
| 8 | 2–4 hours | Phase 5, GitHub |
| 9 | 1–2 hours | Phase 8 |

Phases align with **four course weeks**; Phases 6–9 can overlap the Week 4 deployment week.

---

## Command reference (happy path)

```bash
# Phase 0
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add GROQ_API_KEY

# Phase 1
python capture.py note "My idea"
python capture.py link "https://example.com"
python capture.py file ./document.pdf

# Phase 2–3
python classify.py
python link.py

# Phase 4
python build_graph.py

# Phase 5–7
python ask.py "What do I know about X?"
streamlit run app.py

# Phase 8–9: push to GitHub, deploy app.py on Streamlit Cloud
```

---

## Risk register (implementation)

| Risk | Mitigation |
|------|------------|
| Groq JSON parse failures | Retry prompt; validate schema in `llm_client` |
| PDF empty text | Fallback summary from filename + metadata |
| Graph too dense | Raise similarity threshold; cap links per note |
| Streamlit OOM on embed load | `@st.cache_resource`; smaller model; deploy with more RAM |
| Sensitive data on public URL | Sanitize wiki; private repo; read-only deploy |

---

## Next step (course prompt 5)

Implement **Phase 0** per this document: scaffold directories, `requirements.txt`, `lib/` stubs, and configuration.
