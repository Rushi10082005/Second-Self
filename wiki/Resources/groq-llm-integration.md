---
capture_id: dc1f279f-e574-4368-886b-cd8fbe58bbe3
links: []
para_category: Resources
summary: This note outlines the strategy for integrating Groq API with llama-3.3-70b-versatile
  for structured JSON extraction and RAG answer synthesis. It highlights key parameters
  for the integration.
tags:
- groq
- llm
- api
title: Groq LLM Integration
---

# Groq LLM Integration Strategy
Using Groq API with llama-3.3-70b-versatile for structured JSON extraction and RAG answer synthesis.
## Key Parameters:
* Max tokens: 1024
* JSON mode with strict Pydantic/dataclass schema validation
* Exponential backoff for rate limits (HTTP 429)
