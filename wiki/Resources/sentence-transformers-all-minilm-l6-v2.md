---
capture_id: e6e2c067-f84a-4e34-afe3-2b0da63548c1
links:
- all-minilm-l6-v2-model
para_category: Resources
summary: The sentence-transformers/all-MiniLM-L6-v2 model is a pre-trained language
  model for sentence similarity tasks. It can be used with libraries such as sentence-transformers
  and Transformers for tasks like feature extraction and text embeddings.
tags:
- sentence-transformers
- huggingface
- nlp
title: sentence-transformers all-MiniLM-L6-v2
---

### Introduction to sentence-transformers/all-MiniLM-L6-v2
The sentence-transformers/all-MiniLM-L6-v2 model is a pre-trained language model that can be used for sentence similarity tasks. It is available on the Hugging Face model hub and can be used with various libraries and frameworks.

### Using the Model
The model can be used with the following libraries:
* sentence-transformers: `from sentence_transformers import SentenceTransformer; model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')`
* Transformers: `from transformers import AutoModel, AutoTokenizer; model = AutoModel.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')`

### Example Use Cases
* Sentence similarity: `sentences = ['That is a happy person', 'That is a happy dog', 'That is a very happy person', 'Today is a sunny day']; embeddings = model.encode(sentences); similarities = model.similarity(embeddings, embeddings)`

## Related
- [[all-minilm-l6-v2-model]]
