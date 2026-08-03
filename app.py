"""SecondSelf — Personal AI Second Brain (Unified Streamlit Web App).

Features:
1. Sidebar: Knowledge base stats & last run timestamps.
2. Tab 1 (Brain): Interactive force-directed knowledge graph visualizer.
3. Tab 2 (Ask): RAG Q&A search interface powered by vector retrieval and Groq LLM.
4. Tab 3 (Capture): Quick capture interface for new notes and URLs.
"""

from datetime import datetime, timezone
from pathlib import Path
import json
import streamlit as st
import streamlit.components.v1 as components

from classify import run_classification
from lib.config import get_settings
from lib.graph_builder import export_graph_json
from link import run_linking
from lib.models import Capture, CaptureType
from lib.rag import ask
from lib.storage import load_manifest, save_capture

# Set page config
st.set_page_config(
    page_title="SecondSelf — AI Second Brain",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS styling
st.markdown(
    """
    <style>
    .main {
        background-color: #0f172a;
        color: #f8fafc;
    }
    .stApp {
        background-color: #0f172a;
    }
    .css-1d3780e, .stSidebar {
        background-color: #1e293b !important;
    }
    .stat-card {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 10px;
    }
    .stat-number {
        font-size: 1.5rem;
        font-weight: 700;
        color: #38bdf8;
    }
    .stat-label {
        font-size: 0.8rem;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .source-card {
        background: rgba(30, 41, 59, 0.5);
        border-left: 3px solid #38bdf8;
        padding: 10px 14px;
        margin-bottom: 8px;
        border-radius: 4px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


def format_timestamp(iso_str: str | None) -> str:
    if not iso_str:
        return "Never"
    try:
        dt = datetime.fromisoformat(iso_str)
        return dt.strftime("%Y-%m-%d %H:%M UTC")
    except Exception:
        return iso_str.split(".")[0]


# Load manifest data
manifest = load_manifest()
counts = manifest.get("counts", {})


# Sidebar
with st.sidebar:
    st.title("🧠 SecondSelf")
    st.caption("Personal AI Second Brain System")
    st.divider()

    st.subheader("📊 Knowledge Base Stats")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown(
            f'<div class="stat-card"><div class="stat-number">{counts.get("captures", 0)}</div><div class="stat-label">Captures</div></div>',
            unsafe_allow_html=True,
        )
        st.markdown(
            f'<div class="stat-card"><div class="stat-number">{counts.get("links_created", 0)}</div><div class="stat-label">Links</div></div>',
            unsafe_allow_html=True,
        )
    with col2:
        st.markdown(
            f'<div class="stat-card"><div class="stat-number">{counts.get("wiki_notes", 0)}</div><div class="stat-label">Wiki Notes</div></div>',
            unsafe_allow_html=True,
        )
        st.markdown(
            f'<div class="stat-card"><div class="stat-number">{counts.get("graph_nodes", 0)}</div><div class="stat-label">Nodes</div></div>',
            unsafe_allow_html=True,
        )

    st.divider()
    st.subheader("⏱️ Pipeline Status")
    st.caption(f"**Last Classify:** {format_timestamp(manifest.get('last_classify_at'))}")
    st.caption(f"**Last Auto-Link:** {format_timestamp(manifest.get('last_link_at'))}")
    st.caption(f"**Last Graph Build:** {format_timestamp(manifest.get('last_graph_at'))}")

    st.divider()
    st.subheader("⚡ Pipeline")
    force_reprocess = st.checkbox("Force re-process", help="Re-classify and re-link all raw captures")
    if st.button("Process new captures", type="primary", use_container_width=True):
        with st.spinner("Processing captures (Classify → Link → Graph)..."):
            notes = run_classification(force=force_reprocess)
            run_linking(force=force_reprocess)
            gdata = export_graph_json()
            load_graph_html_and_data.clear()
            st.success(f"Processed {len(notes)} capture(s)! Knowledge base updated.")
            st.rerun()

    st.divider()
    st.subheader("⚙️ Actions")
    if st.button("🔄 Rebuild Knowledge Graph", use_container_width=True):
        with st.spinner("Rebuilding graph.json..."):
            gdata = export_graph_json()
            load_graph_html_and_data.clear()
            st.success(f"Graph rebuilt! ({gdata['meta']['note_count']} nodes, {gdata['meta']['edge_count']} edges)")
            st.rerun()

    if st.button("🔗 Re-run Semantic Linking", use_container_width=True):
        with st.spinner("Computing note embeddings & linking..."):
            link_map = run_linking()
            export_graph_json()
            load_graph_html_and_data.clear()
            st.success("Semantic linking updated!")
            st.rerun()


@st.cache_resource(show_spinner="Warming up embedding model...")
def warm_up_embedding_model():
    """Cache SentenceTransformer model on application cold-start."""
    try:
        from lib.embeddings import get_embedding_model
        get_embedding_model()
    except Exception:
        pass


@st.cache_data
def load_graph_html_and_data():
    """Cache graph HTML and embedded JSON to optimize Streamlit re-renders."""
    html_path = Path(__file__).parent / "static" / "graph.html"
    graph_json_path = Path(__file__).parent / "data" / "graph.json"

    if html_path.is_file():
        html_content = html_path.read_text(encoding="utf-8")
        if graph_json_path.is_file():
            graph_json_str = graph_json_path.read_text(encoding="utf-8")
            injected_script = f"<script>window.EMBEDDED_GRAPH_DATA = {graph_json_str};</script>"
            html_content = html_content.replace("<head>", f"<head>\n  {injected_script}", 1)
        return html_content
    return None


# Initialize cached resources
warm_up_embedding_model()

# Check Groq API key configuration
settings = get_settings()
if not settings.groq_api_key:
    st.warning(
        "⚠️ **GROQ_API_KEY is not configured.** Q&A search will synthesize responses using local context fallbacks. "
        "To enable full LLM synthesis on Streamlit Cloud, add `GROQ_API_KEY` to **App Settings ➔ Secrets**."
    )

# Main Application Tabs
tab_brain, tab_ask, tab_capture = st.tabs(["🧠 Interactive Brain", "🔍 Ask SecondSelf", "📥 Quick Capture"])


# Tab 1: Interactive Graph
with tab_brain:
    st.header("Visual Knowledge Brain")
    st.caption("Interactive force-directed graph of your auto-classified notes and semantic connections.")

    html_rendered = load_graph_html_and_data()
    if html_rendered:
        components.html(html_rendered, height=720, scrolling=False)
    else:
        st.error("static/graph.html not found. Please ensure Phase 4 files are present.")


# Tab 2: Ask SecondSelf (RAG)
with tab_ask:
    st.header("Ask Your Second Brain")
    st.caption("Natural language Q&A powered by vector similarity search and Groq LLM synthesis.")

    # Sample query chips
    st.markdown("**Sample Queries:**")
    sample_cols = st.columns(3)
    sample_query = None
    if sample_cols[0].button("🏛️ System Architecture", use_container_width=True):
        sample_query = "What is the architecture of SecondSelf system?"
    if sample_cols[1].button("📂 PARA Method", use_container_width=True):
        sample_query = "How does PARA categorization work?"
    if sample_cols[2].button("⚡ Groq Integration", use_container_width=True):
        sample_query = "How is Groq LLM configured and used?"

    user_query = st.text_input(
        "Enter your question:",
        value=sample_query if sample_query else "",
        placeholder="e.g. What do I know about vector embeddings and similarity thresholds?",
    )

    col_btn, col_k = st.columns([4, 1])
    with col_k:
        top_k_val = st.number_input("Top Context Notes", min_value=1, max_value=10, value=5)
    with col_btn:
        st.write("") # alignment spacer
        st.write("")
        ask_submitted = st.button("🚀 Search & Answer", type="primary", use_container_width=True)

    if (ask_submitted or sample_query) and user_query:
        with st.spinner("Searching notes and synthesizing answer..."):
            res = ask(user_query, top_k=top_k_val)

        st.subheader("🤖 Synthesized Answer")
        st.markdown(res.answer)

        st.divider()
        st.subheader(f"📚 Retrieved Context Sources ({len(res.sources)})")

        if not res.sources:
            st.info("No matching notes found.")
        else:
            for idx, src in enumerate(res.sources, 1):
                score_pct = src.score * 100
                with st.expander(f"[{idx}] {src.title} — Match Relevance: {score_pct:.1f}%"):
                    st.markdown(f"**Slug:** `{src.note_id}`")
                    st.markdown(f"**Excerpt:**\n> {src.snippet}")


# Tab 3: Quick Capture
with tab_capture:
    st.header("Quick Capture")
    st.caption("Capture notes or URLs directly into your raw inbox for classification.")

    auto_process = st.checkbox("⚡ Auto-process capture into Wiki note (Run Classify → Link → Graph)", value=True)

    cap_type_str = st.radio("Capture Type", ["Note Text", "Web Link"], horizontal=True)

    if cap_type_str == "Note Text":
        note_text = st.text_area("Note Content", placeholder="Enter thoughts, meeting notes, code snippets...", height=150)
        if st.button("💾 Save Note Capture", type="primary"):
            if note_text.strip():
                import uuid
                cap = Capture(
                    id=str(uuid.uuid4()),
                    captured_at=datetime.now(timezone.utc),
                    type=CaptureType.NOTE,
                    content=note_text.strip(),
                    source="streamlit_app",
                )
                saved_path = save_capture(cap)
                st.success(f"Captured note to {saved_path.name}!")

                if auto_process:
                    with st.spinner("Classifying note into Wiki & embedding..."):
                        run_classification()
                        run_linking()
                        export_graph_json()
                        st.success("✅ Note auto-classified, linked, and indexed! You can now search for it in Tab 2.")
                        st.rerun()
            else:
                st.warning("Please enter note text before saving.")

    else:
        url_input = st.text_input("URL Link", placeholder="https://example.com/article")
        url_notes = st.text_area("Context / Description", placeholder="Optional commentary or title...", height=80)
        if st.button("🔗 Save Link Capture", type="primary"):
            if url_input.strip():
                import uuid
                cap = Capture(
                    id=str(uuid.uuid4()),
                    captured_at=datetime.now(timezone.utc),
                    type=CaptureType.LINK,
                    content=url_notes.strip() or f"Bookmarked link: {url_input.strip()}",
                    source=url_input.strip(),
                )
                saved_path = save_capture(cap)
                st.success(f"Captured link to {saved_path.name}!")

                if auto_process:
                    with st.spinner("Classifying link into Wiki & embedding..."):
                        run_classification()
                        run_linking()
                        export_graph_json()
                        st.success("✅ Link auto-classified, linked, and indexed! Available immediately in search & graph.")
                        st.rerun()
            else:
                st.warning("Please enter a valid URL.")

    st.divider()
    st.subheader("⚡ Process Pending Captures")
    st.caption("Run PARA LLM classification, auto-linking, and graph rebuild on all unprocessed inbox items.")
    if st.button("🚀 Process New Captures Now", key="tab3_process_btn", type="primary", use_container_width=True):
        with st.spinner("Running pipeline over unprocessed captures..."):
            notes = run_classification()
            run_linking()
            export_graph_json()
            st.success(f"Pipeline complete! Processed {len(notes)} new capture(s) into wiki.")
            st.rerun()
