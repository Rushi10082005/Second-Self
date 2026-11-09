import fs from 'fs/promises';
import path from 'path';
import Groq from 'groq-sdk';
import { getAllWikiNotes, getGraphData, WikiNoteItem } from './knowledge';

export interface RetrievedSource {
  note_id: string;
  title: string;
  para: string;
  score: number;
  snippet: string;
  summary: string;
  tags: string[];
}

export interface RAGResponse {
  question: string;
  answer: string;
  sources: RetrievedSource[];
  graph_highlight: string[];
}

const RAG_SYSTEM_PROMPT = `\
You are SecondSelf, an autonomous personal AI second brain assistant.
Your goal is to answer the user's question based strictly on the provided note contexts retrieved from their personal wiki.

Rules:
1. Rely strictly on the information given in the context notes below. Do NOT hallucinate facts not present in the notes.
2. Cite the source note titles in square brackets like [Note Title] whenever referencing information from a specific note.
3. If the provided notes do not contain sufficient information to answer the question, clearly state: "I don't have enough information in my second brain notes to answer this question."
4. Format your answer in clean, readable markdown with bullet points or sections where appropriate.
`;

/**
 * Tokenize text into lowercased search terms.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Graph-RAG Retrieval:
 * Combines Lexical BM25-style keyword matching over title, summary, tags, and body
 * with Knowledge Graph 1-hop topological similarity expansion.
 */
export async function retrieveNotes(
  question: string,
  topK: number = 5
): Promise<RetrievedSource[]> {
  const notes = await getAllWikiNotes();
  const graph = await getGraphData();
  const tokens = tokenize(question);

  if (tokens.length === 0 || notes.length === 0) {
    return [];
  }

  // 1. Direct relevance scoring
  const scores: Map<string, { note: WikiNoteItem; score: number }> = new Map();

  for (const note of notes) {
    let score = 0;
    const titleTokens = tokenize(note.title);
    const summaryTokens = tokenize(note.summary);
    const tagTokens = note.tags.map((t) => t.toLowerCase());
    const bodyTokens = tokenize(note.content);

    for (const token of tokens) {
      // Exact title match gets highest priority
      if (titleTokens.includes(token)) score += 3.5;
      if (note.title.toLowerCase().includes(token)) score += 2.0;

      // Tag matches
      if (tagTokens.some((t) => t.includes(token))) score += 3.0;

      // Summary matches
      if (summaryTokens.includes(token)) score += 2.0;

      // Body content term frequency
      const bodyMatches = bodyTokens.filter((b) => b === token).length;
      if (bodyMatches > 0) {
        score += Math.min(2.5, 0.5 * Math.log2(1 + bodyMatches));
      }
    }

    if (score > 0) {
      scores.set(note.slug, { note, score });
    }
  }

  // 2. Graph-RAG 1-hop Expansion:
  // If note A has high relevance, boost notes connected to A via similarity edges
  const boostMap = new Map<string, number>();
  scores.forEach((item, slug) => {
    if (item.score > 2.0) {
      const neighbors = graph.edges.filter(
        (e) => e.source === slug || e.target === slug
      );
      for (const edge of neighbors) {
        const neighborSlug = edge.source === slug ? edge.target : edge.source;
        const weight = edge.weight || 0.8;
        const currentBoost = boostMap.get(neighborSlug) || 0;
        boostMap.set(neighborSlug, currentBoost + item.score * weight * 0.25);
      }
    }
  });

  // Apply graph boosts
  boostMap.forEach((boost, slug) => {
    const existing = scores.get(slug);
    if (existing) {
      existing.score += boost;
    } else {
      const note = notes.find((n) => n.slug === slug);
      if (note && boost > 1.0) {
        scores.set(slug, { note, score: boost });
      }
    }
  });

  // 3. Normalize and rank
  const scoredList = Array.from(scores.values());
  scoredList.sort((a, b) => b.score - a.score);

  const maxRawScore = scoredList[0]?.score || 1.0;

  return scoredList.slice(0, topK).map(({ note, score }) => {
    // Normalized score between 0.65 and 0.99 for clean UX display
    const normalized = Math.min(0.99, Math.max(0.65, 0.70 + (score / maxRawScore) * 0.28));
    const snippet = note.summary
      ? `Summary: ${note.summary}\n${note.content.slice(0, 200)}...`
      : note.content.slice(0, 300);

    return {
      note_id: note.slug,
      title: note.title,
      para: note.para,
      score: Number(normalized.toFixed(2)),
      snippet,
      summary: note.summary,
      tags: note.tags,
    };
  });
}

/**
 * Synthesize answer with Groq Llama 3.3 70B
 */
export async function synthesizeAnswer(
  question: string,
  sources: RetrievedSource[],
  apiKeyOverride?: string
): Promise<string> {
  if (sources.length === 0) {
    return "I don't have any relevant notes in my second brain to answer this question.";
  }

  const groqApiKey = apiKeyOverride || process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    const topPicks = sources.slice(0, 3);
    return (
      `⚠️ **Groq API key not configured on server.**\n\n` +
      `Here are the most relevant notes retrieved from your knowledge base:\n\n` +
      topPicks
        .map(
          (s, i) =>
            `${i + 1}. **[${s.title}]** (${s.para} · ${(s.score * 100).toFixed(0)}% match)\n` +
            `   > ${s.summary || s.snippet.slice(0, 160)}`
        )
        .join('\n\n') +
      `\n\n*Add \`GROQ_API_KEY\` in your environment or Settings modal to enable automated LLM synthesis.*`
    );
  }

  const contextBlocks = sources.map(
    (s, idx) =>
      `### Context [${idx + 1}]: ${s.title} (slug: ${s.note_id}, category: ${s.para})\n` +
      `Relevance: ${(s.score * 100).toFixed(0)}%\n` +
      `${s.snippet}`
  );

  const fullPrompt = `Question: ${question}\n\n--- Retrieved Context Notes ---\n${contextBlocks.join(
    '\n\n'
  )}`;

  try {
    const groq = new Groq({ apiKey: groqApiKey });
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: RAG_SYSTEM_PROMPT },
        { role: 'user', content: fullPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content?.trim() || 'No answer generated.';
  } catch (err: any) {
    console.error('Groq synthesis error:', err);
    return (
      `❌ **Groq API Error**: ${err?.message || 'Failed to communicate with LLM'}\n\n` +
      `**Retrieved context notes:**\n` +
      sources.map((s) => `- **[${s.title}]**: ${s.summary}`).join('\n')
    );
  }
}
