---
capture_id: 9147c88c-2bd5-4002-8d66-02d21203dcba
links:
- sentence-transformers-all-minilm-l6-v2
para_category: Resources
summary: The all-MiniLM-L6-v2 model is a sentence transformer model available on Hugging
  Face, used for sentence similarity and feature extraction tasks. It can be used
  with libraries such as sentence-transformers and Transformers.
tags:
- sentence-transformers
- huggingface
- minilm
title: All MiniLM L6 V2 Model
---

## Introduction to All-MiniLM-L6-v2 Model
The all-MiniLM-L6-v2 model is a pre-trained language model that can be fine-tuned for various natural language processing tasks, particularly sentence similarity and feature extraction.
## Usage
To use the all-MiniLM-L6-v2 model, you can follow these steps:
* Install the required library: `sentence-transformers` or `Transformers`
* Import the library and load the model: `model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')`
* Use the model to encode sentences and calculate similarities: `embeddings = model.encode(sentences)` and `similarities = model.similarity(embeddings, embeddings)`
## Example Code
```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
sentences = ['That is a happy person', 'That is a happy dog', 'That is a very happy person', 'Today is a sunny day']
embeddings = model.encode(sentences)
similarities = model.similarity(embeddings, embeddings)
print(similarities.shape)  # [4, 4]
```
## Resources
For more information, you can visit the [Hugging Face model page](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) or refer to the [sentence-transformers documentation](https://www.sbert.net/docs/usage.html).

## Related
- [[sentence-transformers-all-minilm-l6-v2]]
