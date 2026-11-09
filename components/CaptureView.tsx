'use client';

import React, { useState } from 'react';
import { Bookmark, FileText, CheckCircle2, ArrowRight, Sparkles, Inbox } from 'lucide-react';

export default function CaptureView() {
  const [captureType, setCaptureType] = useState<'note' | 'link'>('note');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payloadContent = captureType === 'note' ? content.trim() : `${url.trim()} — ${content.trim()}`;
    if (!payloadContent) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: captureType,
          content: payloadContent,
          source: captureType === 'link' ? url.trim() : 'web_capture',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to capture');

      setSuccessMsg(data.message || 'Capture successfully saved to SecondSelf inbox!');
      setContent('');
      setUrl('');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Error saving capture: ${err?.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto h-[760px] flex flex-col justify-center">
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/[0.08] shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Quick Capture Inbox</h2>
            <p className="text-xs text-slate-400">
              Save unstructured thoughts or links into your second brain inbox.
            </p>
          </div>
        </div>

        {/* Capture Type Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-canvas-card border border-white/5 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => setCaptureType('note')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              captureType === 'note'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Note / Thought</span>
          </button>

          <button
            type="button"
            onClick={() => setCaptureType('link')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              captureType === 'link'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Web Link / Bookmark</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {captureType === 'link' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                URL Address
              </label>
              <input
                type="url"
                required
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-canvas-card border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {captureType === 'note' ? 'Note Content / Idea' : 'Commentary / Notes (Optional)'}
            </label>
            <textarea
              required={captureType === 'note'}
              rows={5}
              placeholder={
                captureType === 'note'
                  ? 'Enter ideas, meeting takeaways, code snippets, or book insights...'
                  : 'Add brief context on why you saved this link...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-canvas-card border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 active:scale-[0.99] disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all"
          >
            {submitting ? (
              <span>Saving capture...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Save to Second Brain Inbox</span>
              </>
            )}
          </button>
        </form>

        {/* Pipeline Info Card */}
        <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Autonomous Pipeline Flow
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Raw captures are assigned a cryptographic UUID, staged in your inbox, and categorized into the <strong>PARA framework</strong> (Projects, Areas, Resources, Archives) via Groq LLM, cross-linked into your <strong>Vis.js knowledge graph</strong>, and indexed for <strong>RAG queries</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
