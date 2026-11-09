'use client';

import React, { useState, useRef, useEffect } from 'react';
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
        "👋 Welcome! I am **SecondSelf**, your AI second brain. Ask me anything about your notes, architecture, projects, or resources, and I'll synthesize answers in real time strictly from your personal knowledge base with citations.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as streaming tokens arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

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

    // Placeholder for streaming assistant response
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      sources: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, top_k: topK, apiKey, stream: true }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to stream answer from SecondSelf');
      }

      if (!res.body) {
        throw new Error('No streaming body received');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let currentSources: RetrievedSource[] = [];
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;

            try {
              const payload = JSON.parse(dataStr);
              if (payload.type === 'sources') {
                currentSources = payload.sources || [];
                if (payload.graph_highlight) {
                  onHighlightGraph(payload.graph_highlight);
                }
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.sources = currentSources;
                  }
                  return updated;
                });
              } else if (payload.type === 'token') {
                accumulatedText += payload.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.content = accumulatedText;
                  }
                  return updated;
                });
              } else if (payload.type === 'error') {
                accumulatedText += `\n\n❌ ${payload.error}`;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.content = accumulatedText;
                  }
                  return updated;
                });
              }
            } catch {
              // Ignore partial JSON parsing errors
            }
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          last.content = `⚠️ **Error querying SecondSelf**: ${err?.message || 'Network error'}`;
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[calc(100dvh-140px)] min-h-[460px] md:h-[760px] bg-canvas-muted rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden shadow-2xl transition-colors">
      {/* Top Header / Meta Controls */}
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-white/[0.06] bg-canvas-surface/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 truncate">
          <Sparkles className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
            Real-Time Streaming RAG
          </span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            Groq LPU
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span className="hidden sm:inline">Context:</span>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="bg-canvas-card border border-slate-200 dark:border-white/10 rounded px-1.5 py-0.5 text-[11px] sm:text-xs text-slate-800 dark:text-white focus:outline-none focus:border-sky-500"
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
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Reset conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex items-start gap-2.5 sm:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-xs ${
                  isUser
                    ? 'bg-sky-600'
                    : 'bg-gradient-to-tr from-indigo-500 to-sky-500 shadow-md shadow-sky-500/20'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[90%] sm:max-w-[82%] space-y-2`}>
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-sky-600 text-white rounded-tr-none'
                      : 'glass-panel text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-white/10'
                  }`}
                >
                  <div className="prose dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-white/10">
                    <ReactMarkdown>{msg.content || (loading && index === messages.length - 1 ? 'Thinking...' : '')}</ReactMarkdown>
                  </div>
                </div>

                {/* Retrieved Context Sources (if present) */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 animate-in fade-in duration-300">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-sky-500 dark:text-sky-400" />
                      Sources ({msg.sources.length})
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {msg.sources.map((src, sIdx) => (
                        <div
                          key={sIdx}
                          onClick={() => onSelectNote(src.note_id)}
                          className="glass-card p-2.5 rounded-xl cursor-pointer hover:border-sky-500/40 active:scale-[0.99] transition-all group"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-sky-600 dark:text-sky-300 group-hover:text-sky-500 dark:group-hover:text-sky-200 truncate">
                              {src.title}
                            </span>
                            <span className="text-[9px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 shrink-0">
                              {(src.score * 100).toFixed(0)}%
                            </span>
                          </div>

                          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                            {src.summary || src.snippet}
                          </p>

                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                            <span className="capitalize">{src.para}</span>
                            <span className="flex items-center gap-0.5 text-sky-500 dark:text-sky-400 group-hover:underline">
                              Read <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <span className="text-[9px] text-slate-400 dark:text-slate-500 px-1">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sample Query Chips */}
      {messages.length <= 2 && (
        <div className="px-3 sm:px-4 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] sm:text-[11px] text-slate-400 shrink-0">Try:</span>
          {SAMPLE_QUERIES.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleSend(sq)}
              className="px-2.5 py-1 rounded-full text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 whitespace-nowrap shrink-0 transition-all text-left"
            >
              {sq}
            </button>
          ))}
        </div>
      )}

      {/* Input Form with iOS safe text-[16px] */}
      <div className="p-2.5 sm:p-4 border-t border-slate-200 dark:border-white/[0.06] bg-canvas-surface/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            placeholder="Ask your second brain..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={loading}
            className="w-full pl-3.5 pr-11 py-2.5 sm:py-3 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-xl text-[16px] sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="absolute right-1.5 p-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-white rounded-lg shadow-md shadow-sky-500/20 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
