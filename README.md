# 🧠 SecondSelf — Autonomous AI Second Brain (PKM)

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
[![Vercel Deployed](https://img.shields.io/badge/Vercel-Edge%20Ready-000000.svg?style=flat&logo=vercel)](https://vercel.com/)
[![Groq LPU](https://img.shields.io/badge/Groq-Llama%203.3%2070B-f55036.svg?style=flat)](https://groq.com/)
[![Groq Whisper](https://img.shields.io/badge/Whisper-Large%20v3%20Turbo-blueviolet.svg?style=flat)](https://groq.com/)
[![Embeddings](https://img.shields.io/badge/Embeddings-all--MiniLM--L6--v2-blue.svg?style=flat)](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
[![Tests](https://img.shields.io/badge/Pytest-33%20Passed-success.svg?style=flat)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **SecondSelf** is an autonomous Personal Knowledge Management (PKM) platform that continuously ingests unstructured thoughts, bookmarks, documents, and voice memos, classifies them into the **PARA** framework, computes dense semantic vectors, discovers bidirectional connections in an interactive **force-directed knowledge graph**, and delivers **real-time streaming Graph-RAG** answers with source citations.

---

## ⚡ Core Product Capabilities

```
┌─────────────────┐       ┌────────────────────┐       ┌────────────────────┐       ┌──────────────────┐
│  Quick Capture  │ ────► │  PARA Classifier   │ ────► │  Graph & Vectors   │ ────► │  Streaming RAG   │
│ Voice/Drop/Link │       │ Groq Llama 3.3 70B │       │  Vis.js / MiniLM   │       │  SSE Word-by-Word│
└─────────────────┘       └────────────────────┘       └────────────────────┘       └──────────────────┘
```

### 1. ⚡ Word-by-Word Streaming Graph-RAG
* **Ultra-Fast Synthesis**: Uses Groq LPU hardware acceleration (`llama-3.3-70b-versatile`) with Server-Sent Events (SSE) for instant, word-by-word streaming answers.
* **Graph-RAG 1-Hop Expansion**: Combines BM25-style lexical matching over titles, tags, and bodies with topological graph traversal across semantic neighbors.
* **Strict Source Grounding**: Synthesizes responses strictly from retrieved personal notes with inline citations `[Note Title]` and relevance match percentages.

### 2. 🧠 Hardware-Accelerated Force-Directed Knowledge Graph
* **Interactive 2D Visualization**: Dynamic canvas rendered using **Vis.js** with physics simulation, zoom, pan, and node filtering.
* **Visual Reasoning Paths**: When answering questions in chat, the graph illuminates the reasoning path by highlighting retrieved source nodes and glowing traversal edges (`#38bdf8`).
* **Physics Lock ("Frozen")**: Freeze the graph topology once stabilized to explore complex knowledge clusters without jitter.

### 3. 🎙️ Multimodal Voice & Multi-Format Document Ingestion
* **Groq Whisper Voice Memos**: Spoken thoughts transcribed in ~350ms via `whisper-large-v3-turbo` directly in your browser or phone.
* **Multi-Format Dropzone**: Drag & drop or upload `.md`, `.txt`, `.pdf`, `.csv`, or `.json` files for client-side text extraction and ingestion.
* **Web Bookmarking**: Save URLs with automated commentary and context tagging.

### 4. 📝 In-App Markdown Studio & PARA Categorization
* **In-Browser Note Studio**: Split-pane Markdown editor with live preview, backlink navigation, and Obsidian-style `[[wiki-link]]` syntax.
* **Autonomous PARA Engine**: Organizes knowledge into **Projects**, **Areas**, **Resources**, and **Archives** with automated summaries and metadata tags.

### 5. 🔄 Two-Way GitHub Cloud Persistence & Auto-Sync
* **Zero Database Overhead**: SecondSelf operates on flat Markdown frontmatter files version-controlled directly in Git.
* **Automatic Cloud Sync**: Connect a GitHub Personal Access Token in Settings to automatically commit every new note, edit, or capture directly to your repository via the GitHub REST API.

### 6. 📦 1-Click Obsidian Vault Exporter
* **Complete Data Sovereignty**: Download your entire second brain as a structured `.zip` archive formatted specifically for [Obsidian](https://obsidian.md).
* **Metadata Preservation**: Retains all YAML frontmatter, PARA folder hierarchies, and bidirectional link references.

### 7. 🌓 Linear & Obsidian Aesthetics
* **Theme Customization**: Toggle seamlessly between Dark and Light modes with immediate browser persistence.
* **Mobile-First Phone Calibration**: Calibrated with `100dvh` responsive viewports, iOS safe 16px font sizing (eliminating intrusive auto-zoom), and a fixed native bottom navigation dock.

---

## 🏗️ Technical Architecture

| Dimension | Implementation |
| :--- | :--- |
| **Web Framework** | Next.js 14 (App Router, Server-Sent Events, TypeScript, Tailwind CSS) |
| **Deployment Target** | Vercel Edge Serverless Platform |
| **LLM Inference** | Groq Cloud (`llama-3.3-70b-versatile` via `groq-sdk`) |
| **Speech-to-Text** | Groq Whisper Large v3 Turbo (`whisper-large-v3-turbo`) |
| **Graph Visualization** | Vis.js ForceAtlas2 force-directed physics engine |
| **Knowledge Topology** | 38 notes, 40 dense semantic links, PARA category hierarchy |
| **Vector Cache** | 384-dimensional dense vectors (`sentence-transformers/all-MiniLM-L6-v2`) |
| **Persistence Engine** | Flat-file YAML Frontmatter Markdown + GitHub REST API Two-Way Sync |

---

## 📂 Repository Layout

```
Second-Self/
├── app/                        # Next.js 14 App Router
│   ├── api/
│   │   ├── ask/route.ts        # SSE Streaming Graph-RAG endpoint
│   │   ├── capture/route.ts    # Multimodal capture ingestion
│   │   ├── graph/route.ts      # Knowledge graph nodes & edges provider
│   │   ├── notes/route.ts      # Markdown note reader & creator
│   │   ├── sync/github/route.ts# Two-way GitHub REST API auto-sync
│   │   └── transcribe/route.ts # Groq Whisper speech-to-text
│   ├── lib/
│   │   ├── exporter.ts         # JSZip Obsidian vault packager
│   │   ├── knowledge.ts        # Frontmatter & graph parser
│   │   └── rag.ts              # Graph-RAG retrieval & Groq stream generator
│   ├── globals.css             # Obsidian/Linear CSS custom properties & themes
│   ├── layout.tsx              # Root HTML shell
│   └── page.tsx                # Client application hub (Graph, Chat, Explorer, Capture)
├── components/                 # React UI Components
│   ├── CaptureView.tsx         # Voice memo HUD & document dropzone
│   ├── ChatView.tsx            # Word-by-word streaming conversational RAG
│   ├── ExplorerView.tsx        # Split-pane Markdown studio & PARA navigator
│   ├── GraphView.tsx           # Vis.js interactive graph & reasoning path visualizer
│   ├── Navbar.tsx              # Status indicators, theme toggle, & vault exporter
│   └── SettingsModal.tsx       # Groq API key & GitHub sync token manager
├── data/
│   ├── embeddings.json         # Pre-computed dense vector cache
│   ├── graph.json              # Graph topology nodes, edges, & metadata
│   └── index_manifest.json     # Content hashes & synchronization state
├── wiki/                       # Structured Markdown knowledge vault
│   ├── Projects/               # Active short-term efforts
│   ├── Areas/                  # Long-term domains of responsibility
│   ├── Resources/              # Topics & reference assets
│   └── Archives/               # Inactive historical records
├── lib/                        # Python modular engine
│   ├── embeddings.py           # Cosine similarity & dense vector encoding
│   ├── graph_builder.py        # Graph compilation & topology extraction
│   ├── llm_client.py           # Groq API wrapper with fallback resilience
│   ├── models.py               # Pydantic data schemas
│   ├── prompts.py              # LLM system prompts
│   ├── rag.py                  # CLI retrieval & synthesis
│   └── storage.py              # Filesystem frontmatter serialization
├── tests/                      # Automated test suite (Phases 0 - 7)
├── LICENSE                     # MIT License
├── package.json                # Node dependencies & project metadata
└── vercel.json                 # Vercel deployment configuration
```

---

## 🧪 Quality & Test Verification

SecondSelf includes an automated regression test suite covering all operational phases:
* **Next.js Production Build**: `npm run build` passes with zero TypeScript or linting errors.
* **Pytest Verification**: 33 unit and integration tests passing in `< 10s`.

```bash
# Automated Python test suite verification
pytest
# Output: 33 passed in 8.94s
```

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for details.

Copyright (c) 2026 **Rushikesh Ingale**.
