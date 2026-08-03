#!/usr/bin/env bash
set -e

# SecondSelf End-to-End Pipeline Script
# Executes: capture -> classify -> link -> build_graph -> ask

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

# Ensure python binary is available (favor venv if present)
if [ -d "$ROOT_DIR/.venv" ]; then
    PYTHON="$ROOT_DIR/.venv/bin/python"
else
    PYTHON="python3"
fi

NOTE_TEXT="${1:-"E2E Test Note: Testing SecondSelf full pipeline execution with automated classification, vector embedding, graph building, and RAG retrieval."}"
ASK_QUERY="${2:-"What is tested in the full pipeline?"}"

echo "=========================================================="
echo "🚀 SecondSelf E2E Pipeline Start"
echo "=========================================================="

echo -e "\n1. 📥 Capturing Note..."
"$PYTHON" capture.py note "$NOTE_TEXT"

echo -e "\n2. 🏷️ Classifying Raw Captures..."
"$PYTHON" classify.py

echo -e "\n3. 🔗 Computing Embeddings & Linking Wiki Notes..."
"$PYTHON" link.py

echo -e "\n4. 🕸️ Building Knowledge Graph..."
"$PYTHON" build_graph.py

echo -e "\n5. 🤖 Running RAG Ask Query: \"$ASK_QUERY\"..."
"$PYTHON" ask.py "$ASK_QUERY"

echo -e "\n=========================================================="
echo "✅ SecondSelf E2E Pipeline Completed Successfully!"
echo "=========================================================="
