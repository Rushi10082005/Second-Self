import { NextRequest, NextResponse } from 'next/server';
import { retrieveNotes, synthesizeAnswer, createRAGStream } from '../../lib/rag';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, top_k = 5, apiKey, stream = true } = body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json(
        { error: 'A valid question string is required.' },
        { status: 400 }
      );
    }

    const trimmedQuestion = question.trim();
    const topKVal = Math.min(10, Math.max(1, Number(top_k) || 5));

    // 1. Retrieve top-k context notes using Graph-RAG
    const sources = await retrieveNotes(trimmedQuestion, topKVal);

    // 2. If client requests streaming (default), return SSE stream
    if (stream) {
      const ragStream = await createRAGStream(trimmedQuestion, sources, apiKey);
      return new Response(ragStream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // 3. Fallback: static JSON response
    const answer = await synthesizeAnswer(trimmedQuestion, sources, apiKey);
    const graph_highlight = sources.map((s) => s.note_id);

    return NextResponse.json({
      question: trimmedQuestion,
      answer,
      sources,
      graph_highlight,
    });
  } catch (error: any) {
    console.error('Ask API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal RAG server error' },
      { status: 500 }
    );
  }
}
