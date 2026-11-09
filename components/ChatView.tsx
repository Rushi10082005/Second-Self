'use client';

import React, { useState } from 'react';
import { Send, Bot, User, Sparkles, BookOpen, ExternalLink, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { RetrievedSource } from '../app/lib/rag';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: RetrievedSource[];
  timestamp: string;
}

interface ChatViewProps {
  apiKey: string;
  onSelectNote: (slug: string) => void;
  onHighlightGraph: (slugs: string[]) => void;
}

const SAMPLE_QUERIES = [
  'What is the architecture of SecondSelf?',
  'How does PARA categorization work?',
  'What embedding model and vector thresholds are used?',
  'Tell me about Groq LLM integration and fallback logic.',
];

export default function ChatView({
  apiKey,
  onSelectNote,
  onHighlightGraph,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "👋 Welcome! I am **SecondSelf**, your AI second brain. Ask me anything about your notes, architecture, projects, or resources, and I'll synthesize answers strictly from your personal knowledge base with citations.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleSend = async (questionToSend?: string) => {
    const q = (questionToSend || inputQuery).trim();
    if (!q || loading) return;

    setInputQuery('');

    const userMessage: Message = {
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, top_k: topK, apiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to retrieve answer');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.graph_highlight && data.graph_highlight.length > 0) {
        onHighlightGraph(data.graph_highlight);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Error querying SecondSelf**: ${err?.message || 'Network error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[760px] bg-canvas-muted rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
      {/* Top Header / Meta Controls */}
      <div className="p-4 border-b border-white/[0.06] bg-canvas-surface/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-semibold text-white">Conversational RAG Assistant</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Context Top-K:</span>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="bg-canvas-card border border-white/10 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value={3}>3 notes</option>
              <option value={5}>5 notes</option>
              <option value={8}>8 notes</option>
            </select>
          </div>

          <button
            onClick={() =>
              setMessages([
                {
                  role: 'assistant',
                  content:
                    'Conversation cleared. What would you like to explore next in your knowledge base?',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ])
            }
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="Reset conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white ${
                  isUser
                    ? 'bg-sky-600'
                    : 'bg-gradient-to-tr from-indigo-500 to-sky-500 shadow-md shadow-sky-500/20'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[82%] space-y-2`}>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-sky-600 text-white rounded-tr-none'
                      : 'glass-panel text-slate-200 rounded-tl-none border border-white/10'
                  }`}
                >
                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>

                {/* Retrieved Context Sources (if present) */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-sky-400" />
                      Retrieved Knowledge Sources ({msg.sources.length})
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {msg.sources.map((src, sIdx) => (
                        <div
                          key={sIdx}
                          onClick={() => onSelectNote(src.note_id)}
                          className="glass-card p-2.5 rounded-xl cursor-pointer hover:border-sky-500/40 transition-all group"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-sky-300 group-hover:text-sky-200 truncate">
                              {src.title}
                            </span>
                            <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                              {(src.score * 100).toFixed(0)}%
                            </span>
                          </div>

                          <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                            {src.summary || src.snippet}
                          </p>

                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="capitalize">{src.para}</span>
                            <span className="flex items-center gap-0.5 text-sky-400 group-hover:underline">
                              Read note <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <span className="text-[10px] text-slate-500 px-1">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center text-white shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="glass-panel p-4 rounded-2xl rounded-tl-none border border-white/10 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span className="text-xs text-slate-300">
                Searching 38 wiki notes and synthesizing answer with Groq Llama 3.3...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sample Query Chips */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400">Suggestions:</span>
          {SAMPLE_QUERIES.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleSend(sq)}
              className="px-2.5 py-1 rounded-full text-xs text-slate-300 bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left"
            >
              {sq}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div className="p-4 border-t border-white/[0.06] bg-canvas-surface/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            placeholder="Ask anything about your second brain..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={loading}
            className="w-full pl-4 pr-12 py-3 bg-canvas-card border border-white/10 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="absolute right-2 p-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-white rounded-lg shadow-md shadow-sky-500/20 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
