---
capture_id: d65777a4-3496-46d9-ad8a-c4b69b632353
links: []
para_category: Resources
summary: Notes on vector embeddings and similarity thresholds for automatic note linking.
  The sentence-transformers/all-MiniLM-L6-v2 model is used to produce 384-dimensional
  dense vectors. A cosine similarity threshold of 0.78 is selected to reduce false
  positive connections.
tags:
- ml
- embeddings
- similarity
title: Vector Embeddings Thresholds
---

# Vector Embeddings & Similarity Thresholds
The sentence-transformers/all-MiniLM-L6-v2 model produces 384-dimensional dense vectors. A cosine similarity threshold of 0.78 is selected for automatic note linking to reduce false positive connections in small graphs.
