'use client';

import React, { useState, useEffect } from 'react';
import { Share2, MessageSquare, BookOpen, Inbox } from 'lucide-react';
import Navbar from '../components/Navbar';
import SettingsModal from '../components/SettingsModal';
import GraphView from '../components/GraphView';
import ChatView from '../components/ChatView';
import ExplorerView from '../components/ExplorerView';
import CaptureView from '../components/CaptureView';
import { GraphData, WikiNoteItem } from './lib/knowledge';

type TabType = 'graph' | 'chat' | 'explorer' | 'capture';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('graph');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [notes, setNotes] = useState<WikiNoteItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Load Theme & API key from localStorage
  useEffect(() => {
    const savedTheme = (localStorage.getItem('secondself_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const savedKey = localStorage.getItem('secondself_groq_api_key') || '';
    setApiKey(savedKey);
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('secondself_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('secondself_groq_api_key', newKey);
  };

  // Fetch initial graph and notes data
  useEffect(() => {
    async function loadData() {
      try {
        const [graphRes, notesRes] = await Promise.all([
          fetch('/api/graph'),
          fetch('/api/notes'),
        ]);

        if (graphRes.ok) {
          const gData = await graphRes.json();
          setGraphData(gData);
        }

        if (notesRes.ok) {
          const nData = await notesRes.json();
          setNotes(nData.notes || []);
        }
      } catch (err) {
        console.error('Failed to load initial SecondSelf data:', err);
      }
    }

    loadData();
  }, []);

  const handleSelectNote = (slug: string) => {
    setSelectedSlug(slug);
    setActiveTab('explorer');
  };

  const handleHighlightGraph = (slugs: string[]) => {
    setHighlightedNodes(slugs);
  };

  const handleNoteSaved = (savedNote: WikiNoteItem) => {
    setNotes((prev) => {
      const exists = prev.some((n) => n.slug === savedNote.slug);
      if (exists) {
        return prev.map((n) => (n.slug === savedNote.slug ? savedNote : n));
      }
      return [savedNote, ...prev];
    });

    setGraphData((prev) => {
      if (!prev) return prev;
      const nodeIndex = prev.nodes.findIndex((n) => n.id === savedNote.slug);
      if (nodeIndex >= 0) {
        const updatedNodes = [...prev.nodes];
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          label: savedNote.title,
          para: savedNote.para,
          summary: savedNote.summary,
        };
        return { ...prev, nodes: updatedNodes };
      } else {
        const newNode = {
          id: savedNote.slug,
          label: savedNote.title,
          para: savedNote.para,
          summary: savedNote.summary,
        };
        return {
          ...prev,
          nodes: [newNode, ...prev.nodes],
          meta: { ...prev.meta, note_count: prev.meta.note_count + 1 },
        };
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-slate-900 dark:text-slate-100 overflow-x-hidden transition-colors">
      {/* Top Navbar */}
      <Navbar
        stats={{
          nodes: graphData?.meta?.note_count || notes.length || 38,
          edges: graphData?.meta?.edge_count || 40,
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container with responsive padding */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 pb-24 md:pb-6 flex flex-col">
        {/* Desktop Navigation Tabs Bar (Hidden on Mobile) */}
        <div className="hidden md:flex items-center justify-between mb-6 border-b border-slate-200 dark:border-white/[0.08] pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-canvas-card border border-slate-200 dark:border-white/5 rounded-xl">
            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'graph'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Interactive Brain</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'chat'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask SecondSelf</span>
            </button>

            <button
              onClick={() => setActiveTab('explorer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'explorer'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Knowledge Explorer</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                {notes.length || 38}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('capture')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'capture'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Quick Capture</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Vercel Edge Ready</span>
          </div>
        </div>

        {/* Tab Views */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'graph' && (
            <GraphView
              data={graphData}
              onSelectNote={handleSelectNote}
              highlightedNodes={highlightedNodes}
              theme={theme}
            />
          )}

          {activeTab === 'chat' && (
            <ChatView
              apiKey={apiKey}
              onSelectNote={handleSelectNote}
              onHighlightGraph={handleHighlightGraph}
            />
          )}

          {activeTab === 'explorer' && (
            <ExplorerView
              notes={notes}
              selectedSlug={selectedSlug}
              onSelectSlug={(slug) => setSelectedSlug(slug)}
              onNoteSaved={handleNoteSaved}
            />
          )}

          {activeTab === 'capture' && <CaptureView apiKey={apiKey} />}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Phone Native Feel) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-canvas-surface/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/[0.1] px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl transition-colors">
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              activeTab === 'graph'
                ? 'text-sky-500 dark:text-sky-400 bg-sky-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Share2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Brain</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              activeTab === 'chat'
                ? 'text-sky-500 dark:text-sky-400 bg-sky-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Ask</span>
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              activeTab === 'explorer'
                ? 'text-sky-500 dark:text-sky-400 bg-sky-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Explorer</span>
          </button>

          <button
            onClick={() => setActiveTab('capture')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              activeTab === 'capture'
                ? 'text-sky-500 dark:text-sky-400 bg-sky-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Inbox className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium tracking-tight">Capture</span>
          </button>
        </div>
      </nav>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />
    </div>
  );
}
