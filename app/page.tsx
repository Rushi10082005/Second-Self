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
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [notes, setNotes] = useState<WikiNoteItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('secondself_groq_api_key') || '';
    setApiKey(savedKey);
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-slate-100">
      {/* Top Navbar */}
      <Navbar
        stats={{
          nodes: graphData?.meta?.note_count || notes.length || 38,
          edges: graphData?.meta?.edge_count || 40,
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between mb-6 border-b border-white/[0.08] pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-canvas-card border border-white/5 rounded-xl">
            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'graph'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
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
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
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
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Knowledge Explorer</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-slate-300">
                {notes.length || 38}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('capture')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'capture'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Quick Capture</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Vercel Edge Ready</span>
          </div>
        </div>

        {/* Tab Views */}
        <div className="flex-1 flex flex-col">
          {activeTab === 'graph' && (
            <GraphView
              data={graphData}
              onSelectNote={handleSelectNote}
              highlightedNodes={highlightedNodes}
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
            />
          )}

          {activeTab === 'capture' && <CaptureView />}
        </div>
      </main>

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
