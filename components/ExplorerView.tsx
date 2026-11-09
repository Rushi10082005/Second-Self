'use client';

import React, { useState, useEffect } from 'react';
import { Search, Tag, Hash, ArrowLeft, ArrowUpRight, BookOpen } from 'lucide-react';
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
  const [mobileViewingNote, setMobileViewingNote] = useState<boolean>(false);

  // When selectedSlug changes from outside (e.g. from Graph or Chat), show detail on mobile
  useEffect(() => {
    if (selectedSlug) {
      setMobileViewingNote(true);
    }
  }, [selectedSlug]);

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

  const handleNoteClick = (slug: string) => {
    onSelectSlug(slug);
    setMobileViewingNote(true);
  };

  return (
    <div className="w-full h-[calc(100dvh-140px)] min-h-[460px] md:h-[760px] bg-canvas-muted rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl flex flex-col md:flex-row">
      {/* Left Sidebar: Notes Navigator (Visible on desktop OR on mobile when not viewing detail) */}
      <div
        className={`w-full md:w-80 md:border-r border-white/[0.06] flex flex-col bg-canvas-surface/60 shrink-0 ${
          mobileViewingNote ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Search & Category Filter */}
        <div className="p-3 sm:p-4 border-b border-white/[0.06] space-y-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search wiki notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-canvas-card border border-white/10 rounded-xl text-[16px] sm:text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
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
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {allTags.slice(0, 7).map((tag) => (
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
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-1.5">
          <div className="px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
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
                  onClick={() => handleNoteClick(note.slug)}
                  className={`p-3 rounded-xl cursor-pointer active:scale-[0.99] transition-all ${
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
                    <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                      {note.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[9px] text-slate-500">
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

      {/* Right Pane: Markdown Reader (Visible on desktop OR on mobile when viewing note) */}
      <div
        className={`flex-1 flex flex-col overflow-y-auto bg-canvas p-4 sm:p-6 md:p-8 ${
          mobileViewingNote ? 'flex' : 'hidden md:flex'
        }`}
      >
        {activeNote ? (
          <div className="max-w-3xl mx-auto w-full space-y-4 sm:space-y-6">
            {/* Mobile Back Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileViewingNote(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to notes list</span>
              </button>
            </div>

            {/* Note Header */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${
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

                <span className="text-[10px] sm:text-xs font-mono text-slate-500 truncate max-w-[150px] sm:max-w-none">
                  {activeNote.slug}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
                {activeNote.title}
              </h1>
            </div>

            {/* Note Summary Card */}
            {activeNote.summary && (
              <div className="glass-card p-3.5 sm:p-4 rounded-xl border-l-4 border-sky-400 text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                {activeNote.summary}
              </div>
            )}

            {/* Tags & Outgoing Links */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
              {activeNote.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                  {activeNote.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5 text-[10px] sm:text-xs"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {activeNote.links.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <BookOpen className="w-3 h-3 text-sky-400 shrink-0" />
                  <span className="text-slate-400 text-[10px] sm:text-xs">Links:</span>
                  {activeNote.links.map((link) => (
                    <button
                      key={link}
                      onClick={() => handleNoteClick(link)}
                      className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 hover:underline flex items-center gap-0.5 text-[10px] sm:text-xs"
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
            <div className="prose prose-invert prose-slate max-w-none prose-sm sm:prose-base prose-h1:text-lg sm:prose-h1:text-xl prose-h2:text-base sm:prose-h2:text-lg prose-p:leading-relaxed prose-a:text-sky-400 hover:prose-a:underline prose-code:text-sky-300 prose-pre:bg-canvas-card prose-pre:border prose-pre:border-white/10">
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
