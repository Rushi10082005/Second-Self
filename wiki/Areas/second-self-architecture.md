---
capture_id: 58f9451c-ee08-434f-b2ad-2d6d5314a246
links: []
para_category: Areas
summary: The Second Self system is an end-to-end personal knowledge system that captures,
  organizes, relates, visualizes, and queries information. It is designed to be a
  public app with a focus on natural language querying and semantic connections.
tags:
- personal-knowledge-system
- system-architecture
- second-self
title: Second Self System Architecture
---

## Introduction
The Second Self system is designed to be a comprehensive personal knowledge system. It has several key components, including capture, organization, relation, visualization, and querying.

## System Components
- **Capture**: CLI/script for capturing notes, URLs, and files.
- **Organize**: LLM (PARA + tags + summary) for organizing captured information.
- **Relate**: Local embeddings + similarity threshold for relating organized information.
- **Visualize**: `graph.json` + force-directed UI for visualizing related information.
- **Answer**: Embeddings retrieval + LLM synthesis for answering queries.

## High-Level Architecture
The system architecture consists of several layers, including ingest, organize, visualize, query, and presentation. Each layer has specific components and functions that work together to provide the system's functionality.

## Repository Layout
The repository is organized into several directories, including `raw/`, `wiki/`, `data/`, and `lib/`. Each directory has a specific purpose and contains relevant files and subdirectories.
