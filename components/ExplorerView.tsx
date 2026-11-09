'use client';

import React, { useState } from 'react';
import { Search, Tag, Folder, Hash, ArrowLeft, ArrowUpRight, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { WikiNoteItem } from '../app/lib/knowledge';

interface ExplorerViewProps {
  notes: WikiNoteItem[];
  selectedSlug: string | null;
  onSelectSlug: (slug: string) => void;
}

export default function ExplorerView({
  notes,
  selectedSlug,
  onSelectSlug,
}: ExplorerViewProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (filterCategory !== 'all' && n.para.toLowerCase() !== filterCategory.toLowerCase()) {
      return false;
    }
    if (selectedTag && !n.tags.includes(selectedTag)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        n.title.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)) ||
        n.content.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Extract all unique tags
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).slice(0, 15);

  // Active selected note
  const activeNote = notes.find((n) => n.slug === selectedSlug) || filteredNotes[0] || notes[0];

  return (
    <div className="w-full h-[760px] bg-canvas-muted rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl flex flex-col md:flex-row">
      {/* Left Sidebar: Notes Navigator */}
      <div className="w-full md:w-80 md:border-r border-white/[0.06] flex flex-col bg-canvas-surface/60 shrink-0">
        {/* Search & Category Filter */}
        <div className="p-4 border-b border-white/[0.06] space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search wiki notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-canvas-card border border-white/10 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {['all', 'projects', 'areas', 'resources', 'archives'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize shrink-0 transition-all ${
                  filterCategory === cat
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Tag Pills */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap pt-1">
              {allTags.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-all flex items-center gap-0.5 ${
                    selectedTag === tag
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-white/5 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Hash className="w-2.5 h-2.5" />
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Notes List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Notes ({filteredNotes.length})</span>
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="text-sky-400 hover:underline normal-case text-[10px]"
              >
                Clear #{selectedTag}
              </button>
            )}
          </div>

          {filteredNotes.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No notes match your filter criteria.
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = activeNote?.slug === note.slug;
              return (
                <div
                  key={note.slug}
                  onClick={() => onSelectSlug(note.slug)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-500/15 border border-sky-500/40 shadow-sm'
                      : 'hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h5
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-sky-300' : 'text-slate-200'
                      }`}
                    >
                      {note.title}
                    </h5>
                    <span
                      className={`text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded shrink-0 ${
                        note.para === 'Projects'
                          ? 'bg-red-500/20 text-red-300'
                          : note.para === 'Areas'
                          ? 'bg-blue-500/20 text-blue-300'
                          : note.para === 'Resources'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {note.para}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {note.summary || note.content}
                  </p>

                  {note.tags.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      {note.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] text-slate-500">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Markdown Reader */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-canvas p-6 md:p-8">
        {activeNote ? (
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {/* Note Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    activeNote.para === 'Projects'
                      ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                      : activeNote.para === 'Areas'
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      : activeNote.para === 'Resources'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-500/15 text-slate-300 border border-slate-500/30'
                  }`}
                >
                  {activeNote.para}
                </span>

                <span className="text-xs font-mono text-slate-500">
                  slug: {activeNote.slug}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {activeNote.title}
              </h1>
            </div>

            {/* Note Summary Card */}
            {activeNote.summary && (
              <div className="glass-card p-4 rounded-xl border-l-4 border-sky-400 text-sm text-slate-300 leading-relaxed italic">
                {activeNote.summary}
              </div>
            )}

            {/* Tags & Outgoing Links */}
            <div className="flex items-center gap-3 flex-wrap text-xs">
              {activeNote.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  {activeNote.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {activeNote.links.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-slate-400">Explicit Links:</span>
                  {activeNote.links.map((link) => (
                    <button
                      key={link}
                      onClick={() => onSelectSlug(link)}
                      className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 hover:underline flex items-center gap-0.5"
                    >
                      <span>{link}</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px bg-white/10" />

            {/* Markdown Body */}
            <div className="prose prose-invert prose-slate max-w-none prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:leading-relaxed prose-a:text-sky-400 hover:prose-a:underline prose-code:text-sky-300 prose-pre:bg-canvas-card prose-pre:border prose-pre:border-white/10">
              <ReactMarkdown>{activeNote.content}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
            <BookOpen className="w-8 h-8 mb-2 opacity-50" />
            <p>Select a note from the left to view its contents.</p>
          </div>
        )}
      </div>
    </div>
  );
}
