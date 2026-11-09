'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Tag,
  Hash,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Edit3,
  Plus,
  Save,
  X,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { WikiNoteItem } from '../app/lib/knowledge';

interface ExplorerViewProps {
  notes: WikiNoteItem[];
  selectedSlug: string | null;
  onSelectSlug: (slug: string) => void;
  onNoteSaved?: (note: WikiNoteItem) => void;
  githubToken?: string;
  githubRepo?: string;
}

export default function ExplorerView({
  notes,
  selectedSlug,
  onSelectSlug,
  onNoteSaved,
  githubToken = '',
  githubRepo = 'Rushi10082005/Second-Self',
}: ExplorerViewProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [mobileViewingNote, setMobileViewingNote] = useState<boolean>(false);

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [editTitle, setEditTitle] = useState('');
  const [editPara, setEditPara] = useState<'Projects' | 'Areas' | 'Resources' | 'Archives'>('Resources');
  const [editSummary, setEditSummary] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).slice(0, 15);
  const activeNote = notes.find((n) => n.slug === selectedSlug) || filteredNotes[0] || notes[0];

  useEffect(() => {
    if (selectedSlug) {
      setMobileViewingNote(true);
      setIsEditing(false);
    }
  }, [selectedSlug]);

  const handleNoteClick = (slug: string) => {
    onSelectSlug(slug);
    setMobileViewingNote(true);
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    if (!activeNote) return;
    setEditTitle(activeNote.title);
    setEditPara(activeNote.para);
    setEditSummary(activeNote.summary);
    setEditTags(activeNote.tags.join(', '));
    setEditContent(activeNote.content);
    setIsEditing(true);
    setEditorTab('write');
  };

  const handleStartNewNote = () => {
    setEditTitle('');
    setEditPara('Resources');
    setEditSummary('');
    setEditTags('');
    setEditContent('# New Note\n\nWrite your thoughts, ideas, or meeting notes here...');
    setIsEditing(true);
    setMobileViewingNote(true);
    setEditorTab('write');
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    setSaving(true);
    try {
      const tagsArray = editTags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: activeNote && !editTitle.toLowerCase().includes('new note') ? activeNote.slug : undefined,
          title: editTitle.trim(),
          para: editPara,
          summary: editSummary.trim(),
          tags: tagsArray,
          content: editContent.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save note');

      if (onNoteSaved && data.note) {
        onNoteSaved(data.note);
        onSelectSlug(data.note.slug);
      }

      // If GitHub sync configured, persist to GitHub repository
      if (githubToken && data.path && data.markdown) {
        try {
          await fetch('/api/sync/github', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: data.path,
              content: data.markdown,
              message: `feat(wiki): update ${data.note.title} via SecondSelf`,
              token: githubToken,
              repo: githubRepo,
            }),
          });
        } catch {
          // Non-blocking sync
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditing(false);
      }, 700);
    } catch (err: any) {
      alert(`Error saving note: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full h-[calc(100dvh-140px)] min-h-[460px] md:h-[760px] bg-canvas-muted rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden shadow-2xl flex flex-col md:flex-row transition-colors">
      {/* Left Sidebar: Notes Navigator */}
      <div
        className={`w-full md:w-80 md:border-r border-slate-200 dark:border-white/[0.06] flex flex-col bg-canvas-surface/60 shrink-0 ${
          mobileViewingNote ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Search, Action & Category Filter */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-white/[0.06] space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search wiki notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-xl text-[16px] sm:text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>

            <button
              onClick={handleStartNewNote}
              className="p-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl shadow-md shadow-sky-500/20 active:scale-95 transition-all shrink-0 flex items-center justify-center"
              title="Create New Wiki Note"
            >
              <Plus className="w-4 h-4" />
            </button>
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
                    : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/60 dark:hover:bg-white/10'
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
                      ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/40'
                      : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
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
                className="text-sky-500 hover:underline normal-case text-[10px]"
              >
                Clear #{selectedTag}
              </button>
            )}
          </div>

          {filteredNotes.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
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
                      : 'hover:bg-slate-100 dark:hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h5
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-sky-600 dark:text-sky-300' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {note.title}
                    </h5>
                    <span
                      className={`text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded shrink-0 ${
                        note.para === 'Projects'
                          ? 'bg-red-500/20 text-red-600 dark:text-red-300'
                          : note.para === 'Areas'
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300'
                          : note.para === 'Resources'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                          : 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {note.para}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {note.summary || note.content}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Markdown Reader OR Interactive Editor */}
      <div
        className={`flex-1 flex flex-col overflow-y-auto bg-canvas p-4 sm:p-6 md:p-8 ${
          mobileViewingNote ? 'flex' : 'hidden md:flex'
        }`}
      >
        {isEditing ? (
          /* Interactive Markdown Note Editor */
          <form onSubmit={handleSaveNote} className="max-w-3xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  {editTitle ? 'Edit Note' : 'Create New Note'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center p-0.5 bg-slate-200 dark:bg-canvas-card rounded-lg border border-slate-300 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditorTab('write')}
                    className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                      editorTab === 'write'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Write</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab('preview')}
                    className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                      editorTab === 'preview'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Preview</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !editTitle.trim()}
                  className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Note Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. System Architecture Guide"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  PARA Category
                </label>
                <select
                  value={editPara}
                  onChange={(e) => setEditPara(e.target.value as any)}
                  className="w-full px-3 py-2 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="Projects">Projects (Active)</option>
                  <option value="Areas">Areas (Ongoing)</option>
                  <option value="Resources">Resources (Reference)</option>
                  <option value="Archives">Archives (Inactive)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Summary / Executive Takeaway
              </label>
              <textarea
                rows={2}
                placeholder="Brief 1-2 sentence summary..."
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                className="w-full px-3 py-2 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                placeholder="architecture, groq, pkm"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="w-full px-3 py-1.5 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {editorTab === 'write' ? (
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Markdown Content
                </label>
                <textarea
                  rows={14}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3.5 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
                />
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-canvas-card border border-slate-200 dark:border-white/10 min-h-[300px]">
                <div className="prose dark:prose-invert prose-slate max-w-none prose-sm sm:prose-base">
                  <ReactMarkdown>{editContent}</ReactMarkdown>
                </div>
              </div>
            )}
          </form>
        ) : activeNote ? (
          /* Normal Reader View */
          <div className="max-w-3xl mx-auto w-full space-y-4 sm:space-y-6">
            {/* Top Bar with Mobile Back & Edit Button */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setMobileViewingNote(false)}
                className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sky-500 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={handleStartEditing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 shadow-sm transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  <span>Edit Note</span>
                </button>
              </div>
            </div>

            {/* Note Header */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${
                    activeNote.para === 'Projects'
                      ? 'bg-red-500/15 text-red-600 dark:text-red-300 border border-red-500/30'
                      : activeNote.para === 'Areas'
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30'
                      : activeNote.para === 'Resources'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30'
                  }`}
                >
                  {activeNote.para}
                </span>

                <span className="text-[10px] sm:text-xs font-mono text-slate-400 dark:text-slate-500 truncate max-w-[150px] sm:max-w-none">
                  {activeNote.slug}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {activeNote.title}
              </h1>
            </div>

            {/* Note Summary Card */}
            {activeNote.summary && (
              <div className="glass-card p-3.5 sm:p-4 rounded-xl border-l-4 border-sky-400 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
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
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 text-[10px] sm:text-xs"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {activeNote.links.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <BookOpen className="w-3 h-3 text-sky-500 dark:text-sky-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs">Links:</span>
                  {activeNote.links.map((link) => (
                    <button
                      key={link}
                      onClick={() => handleNoteClick(link)}
                      className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-300 hover:underline flex items-center gap-0.5 text-[10px] sm:text-xs"
                    >
                      <span>{link}</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px bg-slate-200 dark:bg-white/10" />

            {/* Markdown Body */}
            <div className="prose dark:prose-invert prose-slate max-w-none prose-sm sm:prose-base prose-h1:text-lg sm:prose-h1:text-xl prose-h2:text-base sm:prose-h2:text-lg prose-p:leading-relaxed prose-a:text-sky-500 dark:prose-a:text-sky-400 hover:prose-a:underline prose-code:text-sky-600 dark:prose-code:text-sky-300 prose-pre:bg-slate-900 prose-pre:border prose-pre:border-white/10">
              <ReactMarkdown>{activeNote.content}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm">
            <BookOpen className="w-8 h-8 mb-2 opacity-50" />
            <p>Select a note from the left to view its contents.</p>
          </div>
        )}
      </div>
    </div>
  );
}
