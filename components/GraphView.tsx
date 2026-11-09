'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, ZoomIn, Zap, Filter, ArrowUpRight, X } from 'lucide-react';
import { GraphData } from '../app/lib/knowledge';

interface GraphViewProps {
  data: GraphData | null;
  onSelectNote: (slug: string) => void;
  highlightedNodes?: string[];
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
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);

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

      const visNodes = filteredNodes.map((n) => {
        const cat = n.para || 'Resources';
        const colors = (PARA_COLORS as any)[cat] || PARA_COLORS.Resources;
        const isHighlighted = highlightedNodes.includes(n.id);

        return {
          id: n.id,
          label: n.label || n.id,
          shape: 'dot',
          size: isHighlighted ? 22 : 15,
          color: {
            background: isHighlighted ? '#38bdf8' : colors.bg,
            border: isHighlighted ? '#ffffff' : colors.border,
            highlight: { background: colors.highlight, border: '#ffffff' },
          },
          borderWidth: isHighlighted ? 3 : 1,
          font: { color: '#f8fafc', face: 'Inter', size: 12 },
          raw: n,
        };
      });

      const visEdges = data!.edges
        .filter((e) => allowedIds.has(e.source) && allowedIds.has(e.target))
        .map((e, idx) => ({
          id: `edge-${e.source}-${e.target}-${idx}`,
          from: e.source,
          to: e.target,
          color: {
            color: e.type === 'explicit_link' ? '#38bdf8' : 'rgba(148, 163, 184, 0.25)',
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
            gravitationalConstant: -50,
            centralGravity: 0.015,
            springLength: 90,
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
  }, [data, activeCategory, highlightedNodes]);

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
    <div className="relative w-full h-[760px] bg-canvas-muted rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
      {/* Vis Network Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Controls Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-3 max-w-sm">
        {/* Header Badge */}
        <div className="glass-panel p-4 rounded-xl shadow-xl">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              Force-Directed Knowledge Graph
            </span>
            <span className="text-xs font-mono text-slate-400">
              {data?.nodes.length || 0} nodes · {data?.edges.length || 0} edges
            </span>
          </div>

          {/* Search in graph */}
          <form onSubmit={handleSearchNode} className="mt-3 relative">
            <input
              type="text"
              placeholder="Search & locate node..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-canvas-card border border-white/10 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          </form>

          {/* Category Filter Pills */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {['all', 'projects', 'areas', 'resources', 'archives'].map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-all ${
                    active
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={handleFit}
          className="glass-panel px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-1.5 shadow-lg transition-all"
          title="Fit graph to view"
        >
          <ZoomIn className="w-3.5 h-3.5" />
          <span>Fit View</span>
        </button>

        <button
          onClick={handleTogglePhysics}
          className={`glass-panel px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-lg transition-all ${
            physicsEnabled
              ? 'text-sky-400 border-sky-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Toggle physics simulation"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{physicsEnabled ? 'Physics On' : 'Physics Frozen'}</span>
        </button>
      </div>

      {/* Selected Node Inspector Drawer */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 z-30 max-w-sm w-full glass-panel p-5 rounded-2xl shadow-2xl border border-sky-500/30 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${
                  selectedNode.para === 'Projects'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : selectedNode.para === 'Areas'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : selectedNode.para === 'Resources'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                }`}
              >
                {selectedNode.para}
              </span>
              <h4 className="text-sm font-bold text-white leading-tight">
                {selectedNode.label}
              </h4>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-2.5 text-xs text-slate-300 line-clamp-3 leading-relaxed">
            {selectedNode.summary || 'No summary available.'}
          </p>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 truncate max-w-[180px]">
              {selectedNode.id}.md
            </span>
            <button
              onClick={() => onSelectNote(selectedNode.id)}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-md shadow-sky-500/20 transition-all"
            >
              <span>Read Full Note</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
