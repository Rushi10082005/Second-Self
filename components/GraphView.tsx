'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, ZoomIn, Zap, ArrowUpRight, X, ChevronDown, ChevronUp, Lock, Play } from 'lucide-react';
import { GraphData } from '../app/lib/knowledge';

interface GraphViewProps {
  data: GraphData | null;
  onSelectNote: (slug: string) => void;
  highlightedNodes?: string[];
  theme?: 'dark' | 'light';
}

const PARA_COLORS = {
  Projects: { bg: '#ef4444', border: '#b91c1c', highlight: '#fca5a5' },
  Areas: { bg: '#3b82f6', border: '#1d4ed8', highlight: '#93c5fd' },
  Resources: { bg: '#10b981', border: '#047857', highlight: '#6ee7b7' },
  Archives: { bg: '#6b7280', border: '#374151', highlight: '#d1d5db' },
};

export default function GraphView({
  data,
  onSelectNote,
  highlightedNodes = [],
  theme = 'dark',
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !data || data.nodes.length === 0) return;

    let visNetworkModule: any;

    async function initNetwork() {
      const vis = await import('vis-network/standalone');
      visNetworkModule = vis;

      // Filter nodes based on activeCategory
      const filteredNodes = data!.nodes.filter((n) => {
        if (activeCategory === 'all') return true;
        return n.para.toLowerCase() === activeCategory.toLowerCase();
      });

      const allowedIds = new Set(filteredNodes.map((n) => n.id));
      const isMobile = window.innerWidth < 640;
      const fontColor = theme === 'light' ? '#0f172a' : '#f8fafc';

      const visNodes = filteredNodes.map((n) => {
        const cat = n.para || 'Resources';
        const colors = (PARA_COLORS as any)[cat] || PARA_COLORS.Resources;
        const isHighlighted = highlightedNodes.includes(n.id);

        return {
          id: n.id,
          label: n.label || n.id,
          shape: 'dot',
          size: isHighlighted ? (isMobile ? 24 : 22) : (isMobile ? 18 : 15),
          color: {
            background: isHighlighted ? '#38bdf8' : colors.bg,
            border: isHighlighted ? (theme === 'light' ? '#0284c7' : '#ffffff') : colors.border,
            highlight: { background: colors.highlight, border: theme === 'light' ? '#0f172a' : '#ffffff' },
          },
          borderWidth: isHighlighted ? 3 : 1,
          font: { color: fontColor, face: 'Inter', size: isMobile ? 13 : 12 },
          raw: n,
        };
      });

      const edgeColor = theme === 'light' ? 'rgba(100, 116, 139, 0.35)' : 'rgba(148, 163, 184, 0.25)';

      const visEdges = data!.edges
        .filter((e) => allowedIds.has(e.source) && allowedIds.has(e.target))
        .map((e, idx) => ({
          id: `edge-${e.source}-${e.target}-${idx}`,
          from: e.source,
          to: e.target,
          color: {
            color: e.type === 'explicit_link' ? '#38bdf8' : edgeColor,
            highlight: '#38bdf8',
          },
          width: e.type === 'explicit_link' ? 2 : 1,
          dashes: e.type !== 'explicit_link',
        }));

      const networkData = {
        nodes: new vis.DataSet(visNodes),
        edges: new vis.DataSet(visEdges),
      };

      const options = {
        physics: {
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
            gravitationalConstant: isMobile ? -70 : -50,
            centralGravity: 0.015,
            springLength: isMobile ? 110 : 90,
            springConstant: 0.08,
          },
          stabilization: { iterations: 120 },
        },
        interaction: {
          hover: true,
          zoomView: true,
          dragView: true,
        },
      };

      const network = new vis.Network(containerRef.current!, networkData, options);
      networkRef.current = network;

      network.on('click', (params: any) => {
        if (params.nodes && params.nodes.length > 0) {
          const clickedId = params.nodes[0];
          const found = data!.nodes.find((n) => n.id === clickedId);
          if (found) {
            setSelectedNode(found);
          }
        } else {
          setSelectedNode(null);
        }
      });
    }

    initNetwork();

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [data, activeCategory, highlightedNodes, theme]);

  const handleFit = () => {
    if (networkRef.current) {
      networkRef.current.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
    }
  };

  const handleTogglePhysics = () => {
    if (networkRef.current) {
      const nextState = !physicsEnabled;
      setPhysicsEnabled(nextState);
      networkRef.current.setOptions({ physics: { enabled: nextState } });
    }
  };

  const handleSearchNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!networkRef.current || !data || !searchQuery.trim()) return;

    const query = searchQuery.toLowerCase().trim();
    const found = data.nodes.find(
      (n) => n.label.toLowerCase().includes(query) || n.id.toLowerCase().includes(query)
    );

    if (found) {
      networkRef.current.focus(found.id, {
        scale: 1.5,
        animation: { duration: 600, easingFunction: 'easeInOutQuad' },
      });
      networkRef.current.selectNodes([found.id]);
      setSelectedNode(found);
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-140px)] min-h-[460px] md:h-[760px] bg-canvas-muted rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden shadow-2xl transition-colors">
      {/* Vis Network Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-pan-x touch-pan-y" />

      {/* Top Floating Controls Overlay */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[calc(100vw-6.5rem)] sm:max-w-sm">
        {/* Header Badge & Search */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
              <span className="truncate">Knowledge Graph</span>
            </span>

            {/* Mobile collapsible toggle */}
            <button
              onClick={() => setMobilePanelOpen(!mobilePanelOpen)}
              className="sm:hidden p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              {mobilePanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <span className="hidden sm:inline text-xs font-mono text-slate-500 dark:text-slate-400">
              {data?.nodes.length || 0} nodes
            </span>
          </div>

          {/* Controls body */}
          <div className={`${mobilePanelOpen ? 'block' : 'hidden sm:block'}`}>
            <form onSubmit={handleSearchNode} className="mt-2.5 relative">
              <input
                type="text"
                placeholder="Search node..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-canvas-card border border-slate-200 dark:border-white/10 rounded-lg text-[16px] sm:text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </form>

            {/* Category Filter Pills */}
            <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {['all', 'projects', 'areas', 'resources', 'archives'].map((cat) => {
                const active = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-medium capitalize shrink-0 transition-all ${
                      active
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/60 dark:hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={handleFit}
          className="glass-panel p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-1 shadow-lg transition-all"
          title="Fit entire knowledge graph into view"
        >
          <ZoomIn className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Fit View</span>
        </button>

        {/* Physics Toggle Button with Clear Meaning */}
        <button
          onClick={handleTogglePhysics}
          className={`glass-panel p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-medium flex items-center gap-1 shadow-lg transition-all ${
            physicsEnabled
              ? 'text-sky-600 dark:text-sky-400 border-sky-500/40'
              : 'text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10'
          }`}
          title={
            physicsEnabled
              ? 'Physics is running (nodes float & settle). Click to freeze layout in place.'
              : 'Layout is frozen (nodes are locked). Click to reactivate dynamic physics simulation.'
          }
        >
          {physicsEnabled ? (
            <>
              <Zap className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Physics Active</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Frozen (Locked)</span>
            </>
          )}
        </button>
      </div>

      {/* Selected Node Inspector Drawer */}
      {selectedNode && (
        <div className="absolute bottom-2 left-2 right-2 sm:left-auto sm:right-4 sm:bottom-4 z-30 sm:max-w-sm glass-panel p-4 sm:p-5 rounded-2xl shadow-2xl border border-sky-500/30 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className={`inline-block px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                  selectedNode.para === 'Projects'
                    ? 'bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30'
                    : selectedNode.para === 'Areas'
                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30'
                    : selectedNode.para === 'Resources'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-500/20 text-slate-600 dark:text-slate-300 border border-slate-500/30'
                }`}
              >
                {selectedNode.para}
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {selectedNode.label}
              </h4>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 sm:line-clamp-3 leading-relaxed">
            {selectedNode.summary || 'No summary available.'}
          </p>

          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[130px] sm:max-w-[180px]">
              {selectedNode.id}.md
            </span>
            <button
              onClick={() => onSelectNote(selectedNode.id)}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-md shadow-sky-500/20 transition-all shrink-0"
            >
              <span>Read Note</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
