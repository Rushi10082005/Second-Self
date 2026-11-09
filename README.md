# 🧠 SecondSelf — Personal AI Second Brain

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![Groq Cloud](https://img.shields.io/badge/Groq-Llama%203.3%2070B-f55036.svg?style=flat)](https://groq.com/)
[![Embeddings](https://img.shields.io/badge/Embeddings-all--MiniLM--L6--v2-blue.svg?style=flat)](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
[![Tests](https://img.shields.io/badge/Tests-33%20Passed-success.svg?style=flat)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **SecondSelf** is an autonomous Personal Knowledge Management (PKM) system that continuously ingests unstructured thoughts, bookmarks, and documents, classifies them into the **PARA** framework, computes semantic embeddings, discovers bidirectional connections in an interactive **force-directed knowledge graph**, and delivers **RAG-powered conversational search** with source citations.

---

## ⚡ Key Highlights & Architecture

```
[ Ingest Raw Ideas ] ──► [ PARA Classifier ] ──► [ Semantic Linker ] ──► [ Knowledge Graph ] ──► [ RAG Assistant ]
 (Notes, Links, PDFs)     (Groq Llama 3.3 70B)    (Sentence-Transformers)   (Vis.js Interactive)    (Context Synthesis)
```

1. **Autonomous Ingestion & Multi-Source Capture**:
   - Ingest raw quick thoughts, bookmarks/URLs, and document files (PDF, Markdown, TXT).
   - Generates persistent UUID-tracked raw capture records with metadata preservation.

2. **LLM-Driven PARA Categorization**:
   - Classifies notes into **Projects**, **Areas**, **Resources**, or **Archives** using **Groq-accelerated Llama 3.3 70B**.
   - Generates clean URL-safe slugs, automated summaries, and contextual tags.

3. **Dense Vector Embeddings & Autonomous Linking**:
   - Uses `all-MiniLM-L6-v2` (`sentence-transformers`) to generate 384-dimensional dense semantic vectors.
   - Computes cosine similarity to dynamically link related ideas, cross-referencing knowledge without manual tagging.

4. **Force-Directed Knowledge Graph**:
   - Interactive, hardware-accelerated 2D force-directed network rendered via **Vis.js**.
   - Color-coded PARA clusters, zoom/pan navigation, physics toggle, and rich hover tooltips.

5. **Retrieval-Augmented Generation (RAG)**:
   - High-precision semantic vector search over personal notes.
   - Groq LLM synthesis strictly grounded in your knowledge base with inline citations `[Note Title]` and relevance scores.

---

## 🚀 Quick Start & Installation

### Prerequisites
- Python **3.10+**
- Free [Groq API Key](https://console.groq.com/)

### 1. Clone & Set Up Virtual Environment

```bash
git clone https://github.com/Rushi10082005/Second-Self.git
cd Second-Self

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```
Edit `.env` and insert your Groq API key:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 3. Launch the Modern Web Application

SecondSelf features a full-stack Next.js web application with a dark-mode Obsidian/Linear aesthetic:

```bash
# Install Node dependencies
npm install

# Run development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the interactive knowledge graph, conversational RAG chat, PARA wiki explorer, and quick capture.

### 4. Deploy to Vercel

```bash
# Production build check
npm run build
```
1. Push this repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Set `GROQ_API_KEY` in Vercel **Environment Variables**.
4. Deploy!

---

## 🛠️ End-to-End CLI Pipeline

SecondSelf provides a complete modular CLI pipeline:

```bash
# 1. Quick Capture
python capture.py note "Exploring vector databases for RAG workflows"
python capture.py link "https://example.com/guide"
python capture.py file docs/sample.pdf

# 2. PARA Classification (LLM)
python classify.py

# 3. Vector Embeddings & Auto-Linking
python link.py

# 4. Knowledge Graph Compilation
python build_graph.py

# 5. Semantic RAG Query
python ask.py "What do I know about vector databases?"

# Or run the entire pipeline in one command:
./scripts/pipeline.sh "My new capture idea" "What does SecondSelf know about this?"
```

---

## 🧪 Automated Testing Suite

SecondSelf includes a comprehensive test suite covering all phases (capture, frontmatter serialization, PARA classification, cosine similarity linking, graph generation, and RAG synthesis):

```bash
pytest
```
*Current Status:* **33 passing unit & integration tests** in `< 15s`.

---

## 📂 Repository Structure

```
Second-Self/
├── app.py                  # Streamlit application
├── capture.py              # CLI capture tool (notes, links, documents)
├── classify.py             # Groq LLM PARA classification engine
├── link.py                 # Vector embedding & semantic auto-linking
├── build_graph.py          # Knowledge graph export & Vis.js compiler
├── ask.py                  # CLI RAG question-answering interface
├── lib/                    # Core modular library
│   ├── models.py           # Pydantic data schemas & enums
│   ├── storage.py          # Filesystem I/O, frontmatter, & manifest tracking
│   ├── llm_client.py       # Resilient Groq API client with fallback logic
│   ├── embeddings.py       # Sentence-Transformers vector encoding & cosine math
│   ├── graph_builder.py    # Graph construction & JSON serialization
│   └── rag.py              # Context retrieval & LLM synthesis engine
├── static/
│   └── graph.html          # Interactive Vis.js force-directed graph template
├── wiki/                   # Classified knowledge notes (Projects, Areas, Resources, Archives)
├── data/                   # Compiled graph, embeddings cache, & index manifest
├── tests/                  # Pytest automated test suite (Phases 0 - 7)
└── Docs/                   # System architecture & deployment specifications
```

---

## 📜 License

Distributed under the **MIT License**.
