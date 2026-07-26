# SecondSelf — Edge Cases & Corner Scenarios

Catalog of failure modes, boundary conditions, and ambiguous inputs for **SecondSelf**, derived from [architecture.md](./architecture.md) and [implementation-plan.md](./implementation-plan.md).

**How to use this doc**

- During implementation: handle or explicitly defer each case.
- During Phases 6–7: use as a manual test checklist.
- During Phases 8–9: prioritize **Security**, **Deployment**, and **Data integrity** sections before going public.

**Severity legend**

| Level | Meaning |
|-------|---------|
| **P0** | Data loss, secret leak, or public exposure of private content |
| **P1** | Pipeline breaks or silently wrong output (bad RAG, corrupt graph) |
| **P2** | Degraded UX or needs manual recovery |
| **P3** | Rare or cosmetic; document workaround |

---

## 1. Cross-cutting / global

| ID | Scenario | Expected behavior | Severity | Phase |
|----|----------|-------------------|----------|-------|
| X-01 | Missing `GROQ_API_KEY` | Fail fast with clear message; classify/ask must not hang | P1 | 0, 2, 5 |
| X-02 | Invalid or expired Groq API key | HTTP 401/403; retry not useful; user-facing error | P1 | 2, 5 |
| X-03 | Groq rate limit (429) | Exponential backoff; resume manifest; partial classify OK | P2 | 2, 5 |
| X-04 | Groq outage / timeout | Skip item, log capture_id; manifest records failure | P2 | 2, 5 |
| X-05 | `RAW_DIR` / `WIKI_DIR` / `DATA_DIR` missing | Auto-create dirs on startup (storage helpers) | P2 | 0+ |
| X-06 | Custom dirs point outside project (symlink escape) | Resolve paths; optional guard against writing outside root | P1 | 0 |
| X-07 | Disk full during write | Atomic write temp + rename; fail without half-written wiki | P0 | 1–4 |
| X-08 | Concurrent runs (two terminals: classify + link) | File lock or manifest corruption; document “single writer” or use lockfile | P1 | 2–4 |
| X-09 | `index_manifest.json` corrupted / invalid JSON | Backup copy; rebuild from scanning raw/wiki | P2 | 2–7 |
| X-10 | User edits wiki by hand while pipeline runs | Stale embeddings; re-run link with content hash | P2 | 3–7 |
| X-11 | Empty project (no raw, no wiki) | Graph empty; ask returns “no knowledge base” message | P3 | 4–5 |
| X-12 | Very large repo (10k+ notes) | O(n²) link slow; RAG/graph load slow — out of MVP scope; warn in logs | P2 | 3–5 |
| X-13 | Wrong Python version (&lt; 3.10) | Document in README; type hints may break | P2 | 0 |
| X-14 | `torch` / sentence-transformers install fails (Apple Silicon, Linux ARM) | Document CPU wheel; optional HF cache path | P2 | 0, 3 |
| X-15 | Config typo (`SIMILARITY_THRESHOLD=abc`) | Validate on load; fall back to default + warning | P2 | 0 |

---

## 2. Phase 0 — Setup

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| S-01 | `.env` committed to Git | `.gitignore` must block; rotate key if leaked | P0 |
| S-02 | Duplicate `architecture.md` at root and `Docs/` | Pick one canonical path; README links correctly | P3 |
| S-03 | Import `lib` fails when CWD is not project root | Document running from repo root or install package editable | P2 |
| S-04 | First `pip install` downloads multi-GB torch | Accept or pin CPU-only index URL in README | P2 |

---

## 3. Capture (`capture.py`, `raw/`) — Phase 1

### 3.1 Notes

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| C-01 | Empty note (`""`) | Reject or save with warning flag in frontmatter | P2 |
| C-02 | Note is only whitespace | Same as C-01 | P2 |
| C-03 | Very long note (MB of text) | Save fully; classify truncates later | P2 |
| C-04 | Non-UTF-8 bytes on stdin | Normalize to UTF-8 with replacement or error clearly | P2 |
| C-05 | Emoji / RTL / CJK content | UTF-8 preserve; slug generation may need transliteration later | P2 |
| C-06 | Note contains `---` breaking YAML frontmatter | Escape or use safer delimiter strategy in storage | P1 |
| C-07 | Duplicate capture (same text twice) | Two distinct UUIDs — intentional; link may connect them | P3 |

### 3.2 Links

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| C-10 | Malformed URL (no scheme) | Reject or prepend `https://` with warning | P2 |
| C-11 | URL with auth embedded (`https://user:pass@...`) | Strip or redact credentials in stored raw | P0 |
| C-12 | HTTP 404 / 500 on fetch | Store URL only; empty fetched body OK | P2 |
| C-13 | Timeout / slow host | Bounded timeout; store URL + error note in body | P2 |
| C-14 | Redirect chain to different domain | Follow redirects with limit; store final URL | P2 |
| C-15 | Paywall / login required page | Store HTML snippet or title only; classify may be weak | P2 |
| C-16 | `file://` or `javascript:` URL | Reject malicious schemes | P1 |
| C-17 | Huge downloaded page (100MB HTML) | Truncate stored content; max bytes config | P1 |
| C-18 | Binary content at URL (PDF direct link) | Store as link type with mime hint; classify extracts if PDF | P2 |

### 3.3 Files

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| C-20 | File path does not exist | CLI error exit code ≠ 0 | P2 |
| C-21 | Permission denied reading file | Clear error | P2 |
| C-22 | Zero-byte file | Capture with warning; classify may produce empty summary | P2 |
| C-23 | Very large file (GB video) | Reject over max size or store reference only | P1 |
| C-24 | Filename with spaces, unicode, `../` | Sanitize stored name; no path traversal | P1 |
| C-25 | Duplicate file captured twice | Two captures; optional hash dedupe (future) | P3 |
| C-26 | Symlink to sensitive path (`/etc/passwd`) | Resolve link; optional blocklist paths | P0 |
| C-27 | Same file open while copying | OS-dependent; catch IO error | P2 |

### 3.4 File types (classify interaction)

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| C-30 | PDF — scanned images only (no text layer) | Empty extract; fallback title from filename | P2 |
| C-31 | PDF — encrypted / password | Skip extract; metadata-only classify | P2 |
| C-32 | DOCX / images / zip without extractor | Store binary; classify from filename + user context | P2 |
| C-33 | Corrupt PDF | pypdf exception; log; partial or metadata classify | P2 |

### 3.5 Identity & indexing

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| C-40 | Clock skew (local time not UTC) | Always persist UTC ISO 8601 | P2 |
| C-41 | UUID collision (astronomically rare) | Regenerate UUID | P3 |
| C-42 | `raw/index.jsonl` out of sync with files | Rebuild index from glob | P2 |
| C-43 | Manual delete of raw file but manifest still lists id | Classify skip or error; cleanup tool (future) | P2 |

---

## 4. Classify (`classify.py`, Groq, `wiki/`) — Phase 2

### 4.1 LLM output

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| L-01 | LLM returns non-JSON prose | Retry with stricter prompt; max N retries | P1 |
| L-02 | JSON missing required fields | Validate schema; retry or default + flag | P1 |
| L-03 | Invalid `para_category` (e.g. "Misc") | Map to closest PARA or default `Resources` + log | P2 |
| L-04 | Empty tags array | Allow; or inject `untagged` | P3 |
| L-05 | Tags with special YAML chars | Quote safely in frontmatter | P2 |
| L-06 | Title/summary in wrong language | Accept; no forced English in MVP | P3 |
| L-07 | LLM hallucinated summary not in source | RAG risk; prompt: summary must be grounded | P2 |
| L-08 | Token limit exceeded on long raw | Truncate input with head+tail strategy | P2 |

### 4.2 Slugs & paths

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| L-10 | Title slug collision (`my-note` twice) | Append `-2`, `-3`, or short id suffix | P1 |
| L-11 | Title all punctuation → empty slug | Fallback slug from capture id | P1 |
| L-12 | Windows-reserved names (`CON.md`) | Sanitize slug | P2 |
| L-13 | Reclassify `--force` moves PARA folder | Update path or rewrite in place; fix wikilinks | P1 |
| L-14 | Raw deleted after classify | Wiki orphan; keep wiki, broken `capture_id` | P2 |

### 4.3 Idempotency & manifest

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| L-20 | Classify interrupted mid-batch | Manifest per-item commit; re-run skips done | P2 |
| L-21 | Same raw classified twice without force | Skip second run | P2 |
| L-22 | `--id` unknown capture | Error message | P2 |
| L-23 | Raw file unreadable / corrupt frontmatter | Skip, log path | P2 |

### 4.4 Content extraction

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| L-30 | Link capture with no fetched body | Classify from URL string only | P2 |
| L-31 | Binary file with no text | Classify from filename, mime, optional user note in sidecar | P2 |
| L-32 | HTML boilerplate dominates fetched link | Optional readability strip (future); truncate | P2 |

---

## 5. Link & embeddings (`link.py`) — Phase 3

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| E-01 | Single note in wiki | No similarity edges; embeddings still stored | P3 |
| E-02 | Empty note body | Skip embed or zero vector; warn | P2 |
| E-03 | Note shorter than 3 words | Low-quality similarity; may false-link — raise threshold | P2 |
| E-04 | All notes identical text | Full clique; cap links per note (top-K) | P1 |
| E-05 | Threshold too low | Hairball graph; tune `SIMILARITY_THRESHOLD` | P2 |
| E-06 | Threshold too high | No auto-links; only manual wikilinks | P3 |
| E-07 | `EMBEDDING_MODEL` changed in config | Invalidate cache when model name/version mismatch | P1 |
| E-08 | `embeddings.json` missing vectors for new notes | Recompute missing only | P2 |
| E-09 | Corrupt `embeddings.json` | Rebuild all embeddings from wiki | P2 |
| E-10 | Re-run link duplicates `## Related` section | Idempotent merge; dedupe wikilinks | P2 |
| E-11 | Wikilink to non-existent slug | Graph phase handles; link may create forward ref | P2 |
| E-12 | Self-link (similarity to self) | Exclude diagonal in comparison | P3 |
| E-13 | Symmetric links (A→B, B→A) duplicate edges in graph | Dedupe edges in graph builder | P2 |
| E-14 | Notes in different languages | Multilingual model helps; false positives possible | P2 |
| E-15 | O(n²) runtime with 500+ notes | Slow run; progress logging; future ANN index | P2 |

---

## 6. Graph (`build_graph.py`, vis-network) — Phase 4

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| G-01 | Wiki empty | `graph.json` with zero nodes; UI empty state | P3 |
| G-02 | Broken `[[wikilink]]` target | Config: drop edge vs stub node | P2 |
| G-03 | Duplicate node ids from slug clash | Unique id policy in builder | P1 |
| G-04 | Node label/summary contains `"` or `\` | JSON escape correctly | P1 |
| G-05 | Massive hover body in JSON | Truncate preview (e.g. 500 chars) | P2 |
| G-06 | Circular links A↔B↔C | Valid graph; layout may tangle | P3 |
| G-07 | Isolated nodes (no edges) | Still render; optional filter | P3 |
| G-08 | `graph.json` stale vs wiki | Document rebuild after link; refresh button | P2 |
| G-09 | Invalid JSON written | Validate before replace; keep previous file | P1 |
| G-10 | Special chars in note break HTML tooltip | Escape in JS template | P2 |
| G-11 | 500+ nodes in browser | Laggy physics; disable physics or cluster (future) | P2 |
| G-12 | vis-network CDN blocked (offline) | Bundle JS locally for deploy | P2 |
| G-13 | Streamlit iframe height too small | Set min height on component | P3 |

---

## 7. RAG & ask (`ask.py`, `lib/rag.py`) — Phase 5

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| R-01 | Empty question | Reject in CLI/UI | P3 |
| R-02 | Question unrelated to any note | Retrieve low scores; LLM says “not in your notes” | P2 |
| R-03 | Question matches wrong note (embedding confusion) | Show sources; user verifies; tune k/threshold | P2 |
| R-04 | No embeddings file | Fall back to re-embed wiki or error clearly | P1 |
| R-05 | Retrieved context exceeds LLM context window | Truncate snippets; reduce k | P1 |
| R-06 | LLM ignores context and hallucinates | Strong system prompt; cite-or-abstain | P1 |
| R-07 | Contradictory notes in top-k | LLM should acknowledge conflict | P2 |
| R-08 | Question about future / world knowledge | Must not answer from parametric knowledge only | P2 |
| R-09 | PII in question sent to Groq | Same privacy as classify; README warning | P0 |
| R-10 | Non-English question vs English notes | Cross-lingual retrieval varies; document limitation | P2 |
| R-11 | Very long question | Truncate embed input | P2 |
| R-12 | `TOP_K_RAG=0` or negative config | Validate config | P2 |
| R-13 | Duplicate sources in top-k (chunks) | Dedupe by note id when chunking added | P2 |
| R-14 | Ask while wiki mid-edit | Eventually consistent; rerun link | P2 |

---

## 8. Streamlit app (`app.py`) — Phase 5–9

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| A-01 | First load: model download | Show spinner; `@st.cache_resource` | P2 |
| A-02 | Missing `graph.json` on deploy | Friendly error; graph tab disabled | P2 |
| A-03 | User clicks Ask repeatedly | Debounce or disable button while running | P2 |
| A-04 | Subprocess pipeline from UI on cloud | Timeout; document read-only deploy | P1 |
| A-05 | File upload capture on cloud | Writes to ephemeral disk — lost on restart | P1 |
| A-06 | Multiple Streamlit users on public URL | Shared one brain; no isolation (v1) | P0 |
| A-07 | XSS via note content in HTML graph | Escape all user content in JS | P1 |
| A-08 | Session state leak between users | Streamlit server-side; same KB for all — expected v1 | P0 |

---

## 9. Security & privacy — Phases 7–9

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| P-01 | Public repo contains `raw/` with private journals | Never commit raw; use sanitized wiki only | P0 |
| P-02 | Embeddings committed reveal note content indirectly | Treat embeddings + wiki as sensitive | P0 |
| P-03 | Groq logs/retention of prompts | Disclose in README; minimize sent text | P0 |
| P-04 | API key in Streamlit logs | Never log key; secrets only via host | P0 |
| P-05 | Malicious PDF (exploit parser) | Keep pypdf updated; size limits | P1 |
| P-06 | SSRF via link capture fetching internal IPs | Block private IP ranges in fetcher (recommended) | P1 |
| P-07 | Prompt injection in note body affects classify/ask | Delimiter wrapping; system prompt hardening | P1 |
| P-08 | Public URL without auth | Anyone can read graph + ask your deployed notes | P0 |

---

## 10. Deployment — Phases 8–9

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| D-01 | Streamlit Cloud OOM on boot | Smaller embedding model; precompute embeddings in repo | P1 |
| D-02 | Build exceeds time limit | Pre-bake dependencies; slim requirements | P2 |
| D-03 | Secrets not configured on host | App starts but ask fails — detect at startup | P2 |
| D-04 | Repo path case sensitivity (Linux vs macOS) | Consistent lowercase paths | P2 |
| D-05 | `graph.json` path differs local vs cloud | Single config source for paths | P2 |
| D-06 | HF Space sleeps / cold start 60s+ | Document wait; keep alive not guaranteed on free tier | P3 |
| D-07 | Git LFS needed for large embeddings | Document or exclude large files from deploy bundle | P2 |
| D-08 | Deploy from branch without `app.py` at root | Set main file path in host settings | P2 |

---

## 11. End-to-end pipeline — Phase 7

| ID | Scenario | Expected behavior | Severity |
|----|----------|-------------------|----------|
| F-01 | Run ask before classify | No wiki / empty retrieval | P2 |
| F-02 | Run graph before link | Graph with fewer similarity edges | P3 |
| F-03 | Capture → ask without intermediate steps | Stale or empty answers | P2 |
| F-04 | Partial pipeline after failure | Document order: capture → classify → link → graph → ask | P2 |
| F-05 | E2E test note classified as Archives | Still retrievable; PARA filter not in MVP ask | P3 |

---

## 12. Data integrity & recovery

| ID | Scenario | Recovery |
|----|----------|----------|
| I-01 | Deleted `wiki/` accidentally | Re-run `classify.py --force` from `raw/` |
| I-02 | Deleted `data/embeddings.json` | Re-run `link.py` |
| I-03 | Deleted `graph.json` | Re-run `build_graph.py` |
| I-04 | Mixed manual edits broke frontmatter | Fix YAML or restore from Git |
| I-05 | Manifest says classified but wiki file missing | Re-classify that capture id |

---

## 13. Corner scenarios (product / UX)

| ID | Scenario | Notes |
|----|----------|-------|
| U-01 | User expects Obsidian sync | Out of scope v1; markdown compatible |
| U-02 | User expects real-time graph update on capture | Requires rerun pipeline or background job |
| U-03 | Two PARA categories seem equally valid | LLM picks one; user can move file manually |
| U-04 | Bookmark spam (500 links, no reading) | System still organizes; quality of summaries varies |
| U-05 | Ask “what did I capture yesterday?” | Needs date in frontmatter + temporal retrieval (weak in MVP) |
| U-06 | Duplicate near-duplicate notes | Auto-links may cluster; dedupe not in MVP |
| U-07 | User renames wiki file manually | Breaks slugs in embeddings/graph until rebuild |

---

## 14. Test matrix (map edge cases → phases)

Use during **Phase 6–7** (minimum smoke set):

| Test | Edge IDs |
|------|----------|
| Capture empty note | C-01 |
| Capture bad URL | C-10, C-12 |
| Capture large PDF | C-30, C-31 |
| Classify with mocked bad JSON | L-01, L-02 |
| Classify slug collision | L-10 |
| Link single note | E-01 |
| Link identical notes | E-04 |
| Graph broken wikilink | G-02 |
| Graph empty wiki | G-01 |
| Ask unrelated question | R-02 |
| Ask without embeddings | R-04 |
| Missing API key | X-01 |
| E2E order violation | F-01, F-03 |

During **Phase 9** (before public URL):

| Test | Edge IDs |
|------|----------|
| Sanitized deploy bundle | P-01, P-02, P-08 |
| Secrets only on host | P-04, D-03 |
| Cloud OOM smoke | D-01, A-01 |
| SSRF check on link fetch | P-06 |

---

## 15. Deferred (document, do not block MVP)

- Multi-user auth and per-user `raw/` (architecture out of scope v1).
- Chunked embeddings for book-length notes (architecture §8.3 future).
- Approximate nearest neighbors at scale (architecture §5.3).
- Automatic deduplication of captures.
- Scheduled inbox processing.
- Full prompt-injection hardening audit.

---

## References

- [architecture.md](./architecture.md) — §8 Cross-cutting, §9 Deployment, §10 Security
- [implementation-plan.md](./implementation-plan.md) — Phases 6–9 testing, Risk register
