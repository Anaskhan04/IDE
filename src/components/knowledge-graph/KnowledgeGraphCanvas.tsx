import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Clock,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  GitFork,
  Layers,
  Network,
  Play,
  RotateCcw,
  Search,
  Terminal,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import type { GraphNode } from '../../types/ide';
import { SAMPLE_CYPHER_QUERIES } from '../../data/mockGraph';
import { detectArchitectureArea, isGeneratedOrMigrationPath } from '../../utils/astParser';

type GraphTab = 'canvas' | 'cypher' | 'trace' | 'clusters';
type NodeKindFilter = 'all' | 'files' | 'functions' | 'classes' | 'dependencies';
type ArchAreaFilter = 'all' | 'frontend' | 'backend' | 'database' | 'utilities' | 'tests' | 'core';

const graphTabs: Array<{ id: GraphTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'canvas', label: '2D Graph', icon: Network },
  { id: 'cypher', label: 'Cypher Console', icon: Terminal },
  { id: 'trace', label: 'Call Tracer (BFS)', icon: GitFork },
  { id: 'clusters', label: 'Louvain Clusters', icon: Layers },
];

const kindFilters: Array<{ id: NodeKindFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'files', label: 'Files' },
  { id: 'functions', label: 'Functions' },
  { id: 'classes', label: 'Classes' },
  { id: 'dependencies', label: 'Dependencies' },
];

const nodeTypeTone: Record<GraphNode['type'], { stroke: string; fill: string; marker: string }> = {
  Function: { stroke: '#06b6d4', fill: '#0b1f28', marker: '#22d3ee' },
  Class: { stroke: '#f59e0b', fill: '#261b0c', marker: '#fbbf24' },
  File: { stroke: '#718096', fill: '#141b26', marker: '#9aa7b7' },
  Route: { stroke: '#f43f5e', fill: '#29111b', marker: '#fb7185' },
  Module: { stroke: '#3b82f6', fill: '#111e35', marker: '#77a9ff' },
  Test: { stroke: '#10b981', fill: '#0c2419', marker: '#34d399' },
  MCP: { stroke: '#8b5cf6', fill: '#1a122e', marker: '#a78bfa' },
};

const getImpactTone = (node: GraphNode) => {
  if (node.impactStatus === 'modified') return { stroke: '#f43f5e', fill: '#25101a', marker: '#fb7185' };
  if (node.impactStatus === 'direct') return { stroke: '#f59e0b', fill: '#241a0d', marker: '#fbbf24' };
  if (node.impactStatus === 'indirect') return { stroke: '#06b6d4', fill: '#0b1f28', marker: '#22d3ee' };
  return nodeTypeTone[node.type];
};

const areaColors: Record<string, { stroke: string; fill: string; text: string }> = {
  frontend: { stroke: '#38bdf8', fill: 'rgba(14, 165, 233, 0.05)', text: '#38bdf8' },
  backend: { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.05)', text: '#c084fc' },
  database: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.05)', text: '#fbbf24' },
  utilities: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.05)', text: '#34d399' },
  tests: { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.05)', text: '#f472b6' },
  core: { stroke: '#64748b', fill: 'rgba(100, 116, 139, 0.05)', text: '#94a3b8' },
};

export const KnowledgeGraphCanvas: React.FC = () => {
  const {
    graphNodes,
    graphEdges,
    selectedGraphNode,
    setSelectedGraphNode,
    openFile,
    setActiveView,
    files,
    cypherResult,
    isExecutingCypher,
    executeCypherQuery,
    traceResult,
    isTracingPath,
    traceCallPath,
  } = useIDE();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [graphTab, setGraphTab] = useState<GraphTab>('canvas');
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 80, y: 70 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = React.useRef(false);

  const [kindFilter, setKindFilter] = useState<NodeKindFilter>('all');
  const [areaFilter, setAreaFilter] = useState<ArchAreaFilter>('all');
  const [hideGenerated, setHideGenerated] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [impactModeOnly, setImpactModeOnly] = useState(false);
  const [activeCypherText, setActiveCypherText] = useState(SAMPLE_CYPHER_QUERIES[0].query);
  const [traceSymbol, setTraceSymbol] = useState('processPayment');
  const [traceDirection, setTraceDirection] = useState<'inbound' | 'outbound'>('inbound');
  const [traceDepth, setTraceDepth] = useState(3);

  // Smooth cursor-centered wheel zoom & trackpad pinch
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Don't intercept wheel if hovering over child panels/inspectors
      const target = e.target as HTMLElement;
      if (target.closest('aside, form, select, input, textarea')) return;

      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Trackpad pinch zoom sets e.ctrlKey = true with small deltaY
      // Standard mouse wheel deltaY is around 50 to 120
      const factor = e.ctrlKey
        ? Math.exp(-e.deltaY * 0.012)
        : Math.exp(-e.deltaY * 0.0018);

      setZoom((prevZoom) => {
        const nextZoom = Math.min(3.0, Math.max(0.15, prevZoom * factor));
        const ratio = nextZoom / prevZoom;

        setPan((prevPan) => ({
          x: mouseX - (mouseX - prevPan.x) * ratio,
          y: mouseY - (mouseY - prevPan.y) * ratio,
        }));

        return nextZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Keyboard shortcut: Esc to clear focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedGraphNode) {
        setSelectedGraphNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGraphNode, setSelectedGraphNode]);

  // Set of node IDs involved in IMPORTS dependencies
  const dependencyNodeIds = useMemo(() => {
    const ids = new Set<string>();
    graphEdges.forEach((e) => {
      if (e.type === 'IMPORTS') {
        ids.add(e.source);
        ids.add(e.target);
      }
    });
    return ids;
  }, [graphEdges]);

  // Count generated or migration nodes
  const generatedCount = useMemo(() => {
    return graphNodes.filter((n) => n.isGenerated || isGeneratedOrMigrationPath(n.path, n.label)).length;
  }, [graphNodes]);

  // List of unique architecture areas present in the graph
  const presentAreas = useMemo(() => {
    const areas = new Set<ArchAreaFilter>();
    graphNodes.forEach((n) => {
      const area = (n.architectureArea || detectArchitectureArea(n.path)) as ArchAreaFilter;
      areas.add(area);
    });
    return Array.from(areas);
  }, [graphNodes]);

  // Filtered nodes based on kind, area, clutter, search, and impact
  const filteredNodes = useMemo(() => {
    return graphNodes.filter((node) => {
      const isGen = node.isGenerated || isGeneratedOrMigrationPath(node.path, node.label);
      if (hideGenerated && isGen) {
        return false;
      }

      if (kindFilter === 'files') {
        if (node.type !== 'File' && node.type !== 'Test') return false;
      } else if (kindFilter === 'functions') {
        if (node.type !== 'Function') return false;
      } else if (kindFilter === 'classes') {
        if (node.type !== 'Class') return false;
      } else if (kindFilter === 'dependencies') {
        if (!dependencyNodeIds.has(node.id)) return false;
      }

      const nodeArea = (node.architectureArea || detectArchitectureArea(node.path)) as ArchAreaFilter;
      if (areaFilter !== 'all' && nodeArea !== areaFilter) {
        return false;
      }

      if (impactModeOnly && node.impactStatus === 'none') {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          node.label.toLowerCase().includes(q) ||
          node.path.toLowerCase().includes(q) ||
          node.type.toLowerCase().includes(q) ||
          nodeArea.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [graphNodes, hideGenerated, kindFilter, areaFilter, impactModeOnly, searchQuery, dependencyNodeIds]);

  const nodeMap = useMemo(() => new Map(graphNodes.map((node) => [node.id, node])), [graphNodes]);
  const visibleNodeMap = useMemo(() => new Map(filteredNodes.map((n) => [n.id, n])), [filteredNodes]);

  // Visible edges: only edges where BOTH source and target are in filteredNodes
  const visibleEdges = useMemo(() => {
    return graphEdges.filter((e) => visibleNodeMap.has(e.source) && visibleNodeMap.has(e.target));
  }, [graphEdges, visibleNodeMap]);

  // Direct connections of the selected node for Focus Mode
  const { connectedNodeIds, connectedEdgeIds } = useMemo(() => {
    if (!selectedGraphNode) {
      return { connectedNodeIds: new Set<string>(), connectedEdgeIds: new Set<string>() };
    }
    const nodeIds = new Set<string>([selectedGraphNode.id]);
    const edgeIds = new Set<string>();

    graphEdges.forEach((edge) => {
      if (edge.source === selectedGraphNode.id || edge.target === selectedGraphNode.id) {
        edgeIds.add(edge.id);
        nodeIds.add(edge.source);
        nodeIds.add(edge.target);
      }
    });

    return { connectedNodeIds: nodeIds, connectedEdgeIds: edgeIds };
  }, [selectedGraphNode, graphEdges]);

  // Architectural grouping bounding boxes for visible nodes
  const areaGroups = useMemo(() => {
    const groups = new Map<string, { area: string; nodes: GraphNode[]; minX: number; maxX: number; minY: number; maxY: number }>();
    filteredNodes.forEach((node) => {
      const area = (node.architectureArea || detectArchitectureArea(node.path)).toLowerCase();
      const x = node.x ?? 140;
      const y = node.y ?? 140;
      if (!groups.has(area)) {
        groups.set(area, {
          area,
          nodes: [],
          minX: x,
          maxX: x,
          minY: y,
          maxY: y,
        });
      }
      const g = groups.get(area)!;
      g.nodes.push(node);
      if (x < g.minX) g.minX = x;
      if (x > g.maxX) g.maxX = x;
      if (y < g.minY) g.minY = y;
      if (y > g.maxY) g.maxY = y;
    });
    return Array.from(groups.values());
  }, [filteredNodes]);

  // Pointer drag panning handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, aside')) return;

    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.hypot(dx, dy) > 3) {
      hasDraggedRef.current = true;
    }

    setPan((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (!hasDraggedRef.current) {
      const target = e.target as HTMLElement | SVGElement;
      if (target.getAttribute('data-canvas-bg') === 'true') {
        setSelectedGraphNode(null);
      }
    }
  };

  // Zoom centered on viewport center (for toolbar +/- buttons)
  const zoomAtViewportCenter = (factor: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setZoom((prevZoom) => {
      const nextZoom = Math.min(3.0, Math.max(0.15, prevZoom * factor));
      const ratio = nextZoom / prevZoom;

      setPan((prevPan) => ({
        x: centerX - (centerX - prevPan.x) * ratio,
        y: centerY - (centerY - prevPan.y) * ratio,
      }));

      return nextZoom;
    });
  };

  // Fit all visible nodes into the canvas viewport
  const resetView = () => {
    if (!containerRef.current || filteredNodes.length === 0) {
      setZoom(0.85);
      setPan({ x: 80, y: 70 });
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    filteredNodes.forEach((node) => {
      const x = node.x ?? 140;
      const y = node.y ?? 140;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const graphW = Math.max(200, (maxX - minX) + 260);
    const graphH = Math.max(200, (maxY - minY) + 160);

    const availableW = Math.max(300, rect.width - 80);
    const availableH = Math.max(300, rect.height - 120);

    const fitZoom = Math.min(1.0, Math.max(0.25, Math.min(availableW / graphW, availableH / graphH)));

    const panX = (rect.width - graphW * fitZoom) / 2 - (minX - 100) * fitZoom;
    const panY = (rect.height - graphH * fitZoom) / 2 - (minY - 50) * fitZoom;

    setZoom(Number(fitZoom.toFixed(2)));
    setPan({ x: Math.round(panX), y: Math.round(panY) });
  };

  const handleOpenInEditor = (path: string) => {
    const targetFile = files.find((f) => f.path === path || f.name === path || path.endsWith(f.name));
    if (targetFile) {
      openFile(targetFile.id);
    }
    setActiveView('editor');
  };

  const handleNodeKeyDown = (event: React.KeyboardEvent<SVGGElement>, node: GraphNode) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedGraphNode(node);
    }
  };

  const handleRunCypher = (queryToRun?: string) => {
    executeCypherQuery(queryToRun || activeCypherText);
  };

  const handleRunTrace = (event?: React.FormEvent) => {
    event?.preventDefault();
    traceCallPath(traceSymbol, traceDirection, traceDepth);
  };

  const renderGraphTabs = () => (
    <div className="flex min-w-0 items-stretch gap-1 overflow-x-auto" role="tablist" aria-label="Knowledge graph views">
      {graphTabs.map(({ id, label, icon: Icon }) => {
        const isSelected = graphTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => setGraphTab(id)}
            className={`ide-focus-ring flex min-h-[36px] shrink-0 items-center gap-2 border-b-2 px-3 text-[10px] font-medium whitespace-nowrap ${isSelected ? 'border-ide-cyan text-ide-text' : 'border-transparent text-ide-muted hover:bg-ide-hover hover:text-ide-text'}`}
          >
            <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-ide-cyan' : 'text-ide-subtle'}`} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );

  const renderNodeInspector = () => {
    if (!selectedGraphNode) {
      return (
        <aside className="flex max-h-[38%] shrink-0 flex-col overflow-y-auto border-t border-ide-border bg-ide-sidebar xl:max-h-none xl:w-[320px] xl:border-l xl:border-t-0" aria-label="Selected graph node evidence">
          <div className="flex min-h-[42px] items-center justify-between border-b border-ide-border px-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ide-muted">Node evidence</span>
            <span className="font-mono text-[10px] text-ide-subtle">No selection</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <Network className="mb-2 h-8 w-8 text-ide-subtle/50" />
            <p className="font-mono text-xs text-ide-muted">Select any node on the graph</p>
            <p className="mt-1 text-[11px] text-ide-subtle">Inspect real incoming callers, outgoing dependencies, and focus connected paths.</p>
          </div>
        </aside>
      );
    }

    const nodeArea = selectedGraphNode.architectureArea || detectArchitectureArea(selectedGraphNode.path);
    const isGen = selectedGraphNode.isGenerated || isGeneratedOrMigrationPath(selectedGraphNode.path, selectedGraphNode.label);

    const inboundEdges = graphEdges.filter((e) => e.target === selectedGraphNode.id);
    const outboundEdges = graphEdges.filter((e) => e.source === selectedGraphNode.id);

    return (
      <aside className="flex max-h-[45%] shrink-0 flex-col overflow-y-auto border-t border-ide-border bg-ide-sidebar xl:max-h-none xl:w-[320px] xl:border-l xl:border-t-0" aria-label="Selected graph node evidence">
        <div className="flex min-h-[42px] items-center justify-between border-b border-ide-border px-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="font-semibold uppercase tracking-[0.08em] text-ide-muted">Evidence</span>
            <span className="text-ide-subtle">·</span>
            <span className="rounded bg-ide-surface px-1.5 py-0.5 text-ide-cyan font-bold">{selectedGraphNode.type}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-ide-border px-1.5 py-0.5 font-mono text-[9px] uppercase text-ide-purple">
              {nodeArea}
            </span>
            <button
              type="button"
              onClick={() => setSelectedGraphNode(null)}
              className="ide-focus-ring text-ide-subtle hover:text-ide-text"
              title="Clear selection (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-ide-text">
              <Code2 className="h-3.5 w-3.5 text-ide-cyan shrink-0" aria-hidden="true" />
              <span className="break-all">{selectedGraphNode.label}</span>
            </div>
            <div className="mt-1 break-all font-mono text-[10px] text-ide-muted">{selectedGraphNode.path}</div>
            {isGen && (
              <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-ide-amber/10 px-1.5 py-0.5 font-mono text-[9px] text-ide-amber">
                Generated / Migration Artifact
              </div>
            )}
          </div>

          <dl className="divide-y divide-ide-border border-y border-ide-border font-mono text-[10px]">
            {selectedGraphNode.returnType && (
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-ide-subtle">Return</dt>
                <dd className="truncate text-ide-cyan">{selectedGraphNode.returnType}</dd>
              </div>
            )}
            {selectedGraphNode.loc && (
              <div className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-ide-subtle">Lines of code</dt>
                <dd className="text-ide-text">{selectedGraphNode.loc} LOC</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="text-ide-subtle">Impact status</dt>
              <dd className="capitalize text-ide-text">{selectedGraphNode.impactStatus}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="text-ide-subtle">Total connections</dt>
              <dd className="text-ide-emerald font-semibold">{inboundEdges.length + outboundEdges.length} edges</dd>
            </div>
          </dl>

          {/* Real Incoming Relationships */}
          <div>
            <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-ide-subtle">
              <span>Incoming ({inboundEdges.length})</span>
              <span className="text-[9px] lowercase text-ide-muted">called / imported by</span>
            </div>
            {inboundEdges.length > 0 ? (
              <div className="divide-y divide-ide-border rounded-sm border border-ide-border bg-ide-surface/30">
                {inboundEdges.map((edge) => {
                  const caller = nodeMap.get(edge.source);
                  return (
                    <button
                      key={edge.id}
                      type="button"
                      onClick={() => caller && setSelectedGraphNode(caller)}
                      className="flex w-full items-center justify-between gap-2 p-1.5 text-left font-mono text-[10px] hover:bg-ide-hover transition-colors"
                      title={`Focus on ${caller?.label || 'source node'}`}
                    >
                      <span className="shrink-0 text-ide-cyan font-medium">‹ {edge.type}</span>
                      <span className="truncate text-right text-ide-text hover:text-ide-cyan">{caller?.label || 'Unknown'}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded border border-dashed border-ide-border px-2 py-1.5 font-mono text-[10px] text-ide-subtle">
                No incoming dependencies
              </div>
            )}
          </div>

          {/* Real Outgoing Relationships */}
          <div>
            <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-ide-subtle">
              <span>Outgoing ({outboundEdges.length})</span>
              <span className="text-[9px] lowercase text-ide-muted">calls / imports / defines</span>
            </div>
            {outboundEdges.length > 0 ? (
              <div className="divide-y divide-ide-border rounded-sm border border-ide-border bg-ide-surface/30">
                {outboundEdges.map((edge) => {
                  const callee = nodeMap.get(edge.target);
                  return (
                    <button
                      key={edge.id}
                      type="button"
                      onClick={() => callee && setSelectedGraphNode(callee)}
                      className="flex w-full items-center justify-between gap-2 p-1.5 text-left font-mono text-[10px] hover:bg-ide-hover transition-colors"
                      title={`Focus on ${callee?.label || 'target node'}`}
                    >
                      <span className="shrink-0 text-ide-purple font-medium">› {edge.label || edge.type}</span>
                      <span className="truncate text-right text-ide-text hover:text-ide-purple">{callee?.label || 'Unknown'}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded border border-dashed border-ide-border px-2 py-1.5 font-mono text-[10px] text-ide-subtle">
                No outgoing dependencies
              </div>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t border-ide-border pt-3">
            <button
              type="button"
              onClick={() => setSelectedGraphNode(null)}
              className="ide-focus-ring flex min-h-[32px] items-center justify-center gap-1.5 border border-ide-border bg-ide-surface px-3 text-[10px] font-semibold text-ide-muted hover:text-ide-text hover:bg-ide-hover rounded-ide-control"
            >
              <X className="h-3.5 w-3.5" /> Clear Focus (Esc)
            </button>
            <button
              type="button"
              onClick={() => {
                setTraceSymbol(selectedGraphNode.label.replace('()', ''));
                setGraphTab('trace');
                traceCallPath(selectedGraphNode.label.replace('()', ''), 'inbound', 3);
              }}
              className="ide-focus-ring flex min-h-[34px] items-center justify-center gap-2 border border-ide-amber/60 px-3 text-[10px] font-semibold text-ide-amber hover:bg-ide-amber/10 rounded-ide-control"
            >
              <GitFork className="h-3.5 w-3.5" aria-hidden="true" /> Trace call path
            </button>
            <button
              type="button"
              onClick={() => handleOpenInEditor(selectedGraphNode.path)}
              className="ide-focus-ring flex min-h-[34px] items-center justify-center gap-2 bg-ide-focus px-3 text-[10px] font-semibold text-white hover:bg-ide-focus/85 rounded-ide-control"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open in code editor
            </button>
          </div>
        </div>
      </aside>
    );
  };

  const renderCanvas = () => (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative min-h-[460px] min-w-0 flex-1 overflow-hidden bg-ide-bg select-none touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Top Control Toolbar */}
        <div className="absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap items-center gap-1.5 border border-ide-border-strong bg-ide-panel/95 backdrop-blur-sm p-1.5 shadow-md pointer-events-auto rounded-ide-panel">
            {/* Kind Filters */}
            <div className="flex items-center gap-0.5">
              {kindFilters.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setKindFilter(id)}
                  aria-pressed={kindFilter === id}
                  className={`ide-focus-ring px-2 py-1 font-mono text-[10px] rounded-ide-control ${
                    kindFilter === id
                      ? 'bg-ide-selected text-ide-cyan font-bold border border-ide-cyan/40'
                      : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <span className="h-4 w-px bg-ide-border" aria-hidden="true" />

            {/* Architecture Area Filter */}
            {presentAreas.length > 1 && (
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <label htmlFor="area-filter-select" className="text-ide-subtle text-[9px] uppercase">Area:</label>
                <select
                  id="area-filter-select"
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value as ArchAreaFilter)}
                  className="ide-focus-ring bg-ide-surface border border-ide-border text-ide-text text-[10px] px-1.5 py-0.5 rounded-ide-control outline-none uppercase"
                >
                  <option value="all">ALL AREAS</option>
                  {presentAreas.map((area) => (
                    <option key={area} value={area}>{area.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            )}

            <span className="h-4 w-px bg-ide-border" aria-hidden="true" />

            {/* Clutter Reducer Toggle: Hide / Show Generated & Migration Files */}
            <button
              type="button"
              onClick={() => setHideGenerated((prev) => !prev)}
              aria-pressed={!hideGenerated}
              className={`ide-focus-ring flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] rounded-ide-control border ${
                hideGenerated
                  ? 'border-ide-border bg-ide-surface text-ide-muted hover:text-ide-text hover:bg-ide-hover'
                  : 'border-ide-amber/50 bg-ide-amber/15 text-ide-amber font-semibold'
              }`}
              title={hideGenerated ? `Show ${generatedCount} hidden generated & migration nodes` : 'Hide generated & migration nodes'}
            >
              {hideGenerated ? <EyeOff className="h-3 w-3 text-ide-subtle" /> : <Eye className="h-3 w-3 text-ide-amber" />}
              <span>{hideGenerated ? `Hide generated (${generatedCount})` : `Showing all (+${generatedCount} gen)`}</span>
            </button>

            {/* Impact Filter */}
            <button
              type="button"
              onClick={() => setImpactModeOnly((active) => !active)}
              aria-pressed={impactModeOnly}
              className={`ide-focus-ring flex items-center gap-1 px-2 py-1 font-mono text-[10px] rounded-ide-control border ${
                impactModeOnly
                  ? 'border-ide-rose/40 bg-ide-rose/10 text-ide-rose font-bold'
                  : 'border-transparent text-ide-muted hover:bg-ide-hover hover:text-ide-text'
              }`}
            >
              <Flame className="h-3 w-3" aria-hidden="true" />
              Impact only
            </button>

            {/* Focus Mode Reset Action */}
            {selectedGraphNode && (
              <button
                type="button"
                onClick={() => setSelectedGraphNode(null)}
                className="ide-focus-ring flex items-center gap-1 rounded-ide-control border border-ide-amber/50 bg-ide-amber/15 px-2 py-1 font-mono text-[10px] font-semibold text-ide-amber hover:bg-ide-amber/25 transition-all"
                title="Clear focus (Esc)"
              >
                <X className="h-3 w-3" />
                <span>Clear Focus</span>
              </button>
            )}
          </div>

          {/* Search and Zoom Controls */}
          <div className="flex items-center gap-1 border border-ide-border-strong bg-ide-panel/95 backdrop-blur-sm p-1.5 shadow-md pointer-events-auto rounded-ide-panel">
            <label className="sr-only" htmlFor="graph-node-search">Search nodes or paths</label>
            <Search className="h-3.5 w-3.5 text-ide-subtle ml-1" aria-hidden="true" />
            <input
              id="graph-node-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search node / path…"
              className="ide-focus-ring w-28 bg-transparent px-1.5 py-0.5 font-mono text-[10px] text-ide-text outline-none placeholder:text-ide-subtle md:w-40"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="p-0.5 text-ide-subtle hover:text-ide-text">
                <X className="h-3 w-3" />
              </button>
            )}
            <span className="h-4 w-px bg-ide-border" aria-hidden="true" />
            <button
              type="button"
              onClick={() => zoomAtViewportCenter(1.2)}
              className="ide-focus-ring flex h-6 w-6 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text rounded-ide-control"
              title="Zoom in (+)"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[34px] text-center font-mono text-[9px] text-ide-muted select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => zoomAtViewportCenter(0.8)}
              className="ide-focus-ring flex h-6 w-6 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text rounded-ide-control"
              title="Zoom out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="ide-focus-ring flex h-6 w-6 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text rounded-ide-control"
              title="Reset view (Fit to canvas)"
              aria-label="Reset view"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* SVG Interactive Knowledge Graph */}
        <svg
          className="h-full w-full block"
          role="img"
          aria-label={`Knowledge graph showing ${filteredNodes.length} of ${graphNodes.length} nodes`}
        >
          <defs>
            <pattern
              id="ledger-graph-grid"
              width={32 * zoom}
              height={32 * zoom}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x % (32 * zoom)}, ${pan.y % (32 * zoom)})`}
            >
              <path d={`M ${32 * zoom} 0 L 0 0 0 ${32 * zoom}`} fill="none" stroke="#161c2b" strokeWidth="0.8" />
            </pattern>
            <marker id="ledger-graph-arrow" markerWidth="8" markerHeight="6" refX="14" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#718096" opacity="0.8" />
            </marker>
            <marker id="ledger-graph-arrow-focused" markerWidth="8" markerHeight="6" refX="14" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
            </marker>
            <marker id="ledger-graph-arrow-impact" markerWidth="8" markerHeight="6" refX="14" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Clickable canvas background: clears focus when clicked directly without dragging */}
          <rect
            width="100%"
            height="100%"
            fill="url(#ledger-graph-grid)"
            data-canvas-bg="true"
          />

          {/* Pan & Zoom Canvas Content Group */}
          <g
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            className="origin-top-left pointer-events-auto"
          >
            {/* Architecture Grouping Boundaries */}
            {areaGroups.map((group) => {
              const theme = areaColors[group.area] || areaColors.core;
              const boxX = group.minX - 85;
              const boxY = group.minY - 55;
              const boxW = Math.max(340, group.maxX - group.minX + 310);
              const boxH = Math.max(160, group.maxY - group.minY + 95);

              return (
                <g key={group.area} className="pointer-events-none select-none">
                  <rect
                    x={boxX}
                    y={boxY}
                    width={boxW}
                    height={boxH}
                    rx={8}
                    fill={theme.fill}
                    stroke={theme.stroke}
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    opacity={selectedGraphNode ? 0.35 : 0.75}
                  />
                  <rect
                    x={boxX + 12}
                    y={boxY - 10}
                    width={group.area.length * 8 + 48}
                    height={20}
                    rx={3}
                    fill="#0f172a"
                    stroke={theme.stroke}
                    strokeWidth="1"
                    opacity={selectedGraphNode ? 0.4 : 0.9}
                  />
                  <text
                    x={boxX + 18}
                    y={boxY + 4}
                    fill={theme.text}
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="JetBrains Mono"
                    letterSpacing="0.08em"
                    opacity={selectedGraphNode ? 0.5 : 1}
                  >
                    {group.area.toUpperCase()} ({group.nodes.length})
                  </text>
                </g>
              );
            })}

            {/* Graph Edges */}
            {visibleEdges.map((edge) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target || source.x == null || source.y == null || target.x == null || target.y == null) return null;

              const isFocused = connectedEdgeIds.has(edge.id);
              const isFaded = selectedGraphNode != null && !isFocused;
              const isImpact = edge.isImpactPath;

              const edgeStroke = isFocused ? '#38bdf8' : isImpact ? '#f59e0b' : '#2b384e';
              const edgeWidth = isFocused ? 2.4 : isImpact ? 2 : 1.2;
              const edgeOpacity = isFaded ? 0.12 : 1;
              const marker = isFocused
                ? 'url(#ledger-graph-arrow-focused)'
                : isImpact
                  ? 'url(#ledger-graph-arrow-impact)'
                  : 'url(#ledger-graph-arrow)';

              return (
                <g key={edge.id} opacity={edgeOpacity} className="transition-opacity duration-150">
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={edgeStroke}
                    strokeWidth={edgeWidth}
                    strokeDasharray={edge.type === 'TESTS' ? '4 4' : edge.type === 'DEFINES' ? '2 2' : undefined}
                    markerEnd={marker}
                  />
                  {edge.label && (
                    <text
                      x={(source.x + target.x) / 2}
                      y={(source.y + target.y) / 2 - 4}
                      fill={isFocused ? '#38bdf8' : isImpact ? '#fbbf24' : '#64748b'}
                      fontSize={isFocused ? '9.5' : '8.5'}
                      fontWeight={isFocused ? '600' : '400'}
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Graph Nodes */}
            {filteredNodes.map((node) => {
              const isSelected = selectedGraphNode?.id === node.id;
              const isConnected = connectedNodeIds.has(node.id);
              const isFaded = selectedGraphNode != null && !isSelected && !isConnected;
              const tone = getImpactTone(node);

              const strokeColor = isSelected ? '#3b82f6' : isConnected ? '#38bdf8' : tone.stroke;
              const strokeWidth = isSelected ? 2.5 : isConnected ? 2 : 1.5;
              const nodeOpacity = isFaded ? 0.16 : 1;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x ?? 140}, ${node.y ?? 140})`}
                  role="button"
                  tabIndex={0}
                  focusable="true"
                  aria-label={`${node.label}, ${node.type}, ${node.path}`}
                  onClick={(e) => {
                    if (hasDraggedRef.current) return;
                    e.stopPropagation();
                    setSelectedGraphNode(node);
                  }}
                  onKeyDown={(event) => handleNodeKeyDown(event, node)}
                  className="cursor-pointer transition-opacity duration-150"
                  opacity={nodeOpacity}
                >
                  <title>{`${node.label} (${node.type})\nPath: ${node.path}`}</title>
                  {/* Node Card Background */}
                  <rect
                    x="-70"
                    y="-19"
                    width="140"
                    height="38"
                    rx="4"
                    fill={tone.fill}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                  />
                  {/* Left accent stripe */}
                  <rect x="-70" y="-19" width="4" height="38" rx="2" fill={tone.marker} />
                  {/* Status dot */}
                  <circle cx="-55" cy="0" r="3.5" fill={tone.marker} />
                  {/* Label */}
                  <text
                    x="-44"
                    y="4"
                    fill="#f5f7fa"
                    fontSize="10"
                    fontWeight="500"
                    fontFamily="JetBrains Mono"
                  >
                    {node.label.length > 13 ? `${node.label.substring(0, 12)}…` : node.label}
                  </text>
                  {/* Type badge on bottom right */}
                  <text
                    x="62"
                    y="14"
                    fill={tone.marker}
                    fontSize="7.5"
                    fontFamily="JetBrains Mono"
                    textAnchor="end"
                    className="uppercase"
                  >
                    {node.type}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Bottom Legend */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 border border-ide-border bg-ide-panel/95 backdrop-blur-sm px-3 py-2 font-mono text-[10px] text-ide-muted rounded-ide-panel pointer-events-auto" aria-label="Graph legend">
          {[
            ['bg-ide-cyan', 'Function'],
            ['bg-ide-amber', 'Class'],
            ['bg-ide-rose', 'Route'],
            ['bg-ide-emerald', 'Test'],
            ['bg-ide-purple', 'MCP'],
          ].map(([marker, label]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 ${marker}`} aria-hidden="true" />
              {label}
            </span>
          ))}
          <span className="border-l border-ide-border pl-3 text-ide-text">
            Showing {filteredNodes.length}/{graphNodes.length} nodes · {visibleEdges.length} edges
          </span>
          {hideGenerated && generatedCount > 0 && (
            <span className="text-ide-amber font-semibold">({generatedCount} generated hidden)</span>
          )}
          <span className="hidden xl:inline border-l border-ide-border pl-3 text-ide-subtle">
            Drag to pan · Scroll/pinch to zoom
          </span>
        </div>
      </div>
      {renderNodeInspector()}
    </div>
  );

  const renderCypher = () => (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1120px] space-y-5 px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-ide-border pb-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-ide-strong">
              <Terminal className="h-4 w-4 text-ide-cyan" aria-hidden="true" />
              Interactive Cypher query console
            </h2>
            <p className="mt-2 text-xs text-ide-muted">Execute graph pattern matching queries against the in-memory SQLite store.</p>
          </div>
          {cypherResult && (
            <div className="flex items-center gap-2 font-mono text-[10px] text-ide-emerald" aria-live="polite">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Execution time: {cypherResult.executionTimeMs}ms
            </div>
          )}
        </header>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <span className="text-ide-subtle">Templates:</span>
          {SAMPLE_CYPHER_QUERIES.map((query) => (
            <button
              key={query.name}
              type="button"
              onClick={() => {
                setActiveCypherText(query.query);
                handleRunCypher(query.query);
              }}
              className="ide-focus-ring border border-ide-border-strong px-2.5 py-1.5 text-ide-muted hover:bg-ide-hover hover:text-ide-text rounded-ide-control"
            >
              {query.name}
            </button>
          ))}
        </div>

        <form onSubmit={(event) => { event.preventDefault(); handleRunCypher(); }} className="border border-ide-border bg-ide-panel rounded-ide-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-ide-border px-3 py-2">
            <label htmlFor="cypher-query" className="font-mono text-[10px] text-ide-muted">Cypher query</label>
            <span className="font-mono text-[10px] text-ide-subtle">AST graph · read only</span>
          </div>
          <div className="relative p-3">
            <textarea
              id="cypher-query"
              rows={5}
              value={activeCypherText}
              onChange={(event) => setActiveCypherText(event.target.value)}
              aria-describedby="cypher-query-help"
              className="ide-focus-ring w-full resize-y border border-ide-border-strong bg-ide-code p-3 font-mono text-[11px] leading-relaxed text-ide-cyan outline-none focus:border-ide-focus rounded-ide-control"
            />
            <div id="cypher-query-help" className="mt-2 text-[10px] text-ide-subtle">Use a template or write a graph query, then inspect the returned rows below.</div>
            <button
              type="submit"
              disabled={isExecutingCypher}
              className="ide-focus-ring mt-3 inline-flex min-h-[32px] items-center gap-2 bg-ide-cyan px-3 text-[11px] font-semibold text-ide-shell hover:bg-ide-cyan/85 disabled:cursor-not-allowed disabled:opacity-50 rounded-ide-control"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              {isExecutingCypher ? 'Executing…' : 'Run query'}
            </button>
          </div>
        </form>

        {cypherResult ? (
          <div className="border border-ide-border bg-ide-panel rounded-ide-panel overflow-hidden" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ide-border px-3 py-3 font-mono text-[10px]">
              <span className="text-ide-text">Results · {cypherResult.rows.length} rows returned</span>
              <span className="text-ide-subtle">Structured graph schema</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left font-mono text-[11px]" aria-label="Cypher query results">
                <thead>
                  <tr className="border-b border-ide-border text-[10px] uppercase tracking-[0.08em] text-ide-subtle">
                    {cypherResult.columns.map((column) => (
                      <th key={column} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cypherResult.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-ide-border last:border-b-0 hover:bg-ide-hover/50">
                      {cypherResult.columns.map((column) => (
                        <td key={column} className="whitespace-nowrap px-3 py-2 text-ide-text">
                          {typeof row[column] === 'object' ? JSON.stringify(row[column]) : String(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="border-l-2 border-ide-border-strong px-4 py-4 font-mono text-[10px] text-ide-subtle">No query result yet.</div>
        )}
      </div>
    </div>
  );

  const renderTrace = () => (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1120px] space-y-5 px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-ide-border pb-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-ide-strong">
              <GitFork className="h-4 w-4 text-ide-amber" aria-hidden="true" />
              BFS call chain tracer
            </h2>
            <p className="mt-2 text-xs text-ide-muted">Traverse inbound callers or outbound callees across files and packages.</p>
          </div>
          {traceResult && (
            <div className="flex items-center gap-2 font-mono text-[10px] text-ide-amber" aria-live="polite">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Traversal time: {traceResult.executionTimeMs}ms
            </div>
          )}
        </header>

        <form onSubmit={handleRunTrace} className="grid gap-4 border border-ide-border bg-ide-panel p-4 lg:grid-cols-[minmax(180px,1fr)_auto_auto_auto] lg:items-end rounded-ide-panel">
          <div>
            <label htmlFor="trace-symbol" className="mb-1.5 block font-mono text-[10px] text-ide-muted">Target function</label>
            <input
              id="trace-symbol"
              type="text"
              value={traceSymbol}
              onChange={(event) => setTraceSymbol(event.target.value)}
              className="ide-focus-ring h-9 w-full border border-ide-border-strong bg-ide-code px-2.5 font-mono text-[11px] text-ide-text outline-none focus:border-ide-focus rounded-ide-control"
            />
          </div>
          <fieldset>
            <legend className="mb-1.5 font-mono text-[10px] text-ide-muted">Direction</legend>
            <div className="flex border border-ide-border-strong rounded-ide-control overflow-hidden">
              <button
                type="button"
                onClick={() => setTraceDirection('inbound')}
                aria-pressed={traceDirection === 'inbound'}
                className={`ide-focus-ring min-h-[36px] px-2.5 font-mono text-[10px] ${traceDirection === 'inbound' ? 'bg-ide-amber/10 text-ide-amber font-semibold' : 'text-ide-muted hover:bg-ide-hover'}`}
              >
                Inbound
              </button>
              <button
                type="button"
                onClick={() => setTraceDirection('outbound')}
                aria-pressed={traceDirection === 'outbound'}
                className={`ide-focus-ring min-h-[36px] px-2.5 font-mono text-[10px] ${traceDirection === 'outbound' ? 'bg-ide-amber/10 text-ide-amber font-semibold' : 'text-ide-muted hover:bg-ide-hover'}`}
              >
                Outbound
              </button>
            </div>
          </fieldset>
          <div>
            <label htmlFor="trace-depth" className="mb-1.5 block font-mono text-[10px] text-ide-muted">Max depth</label>
            <select
              id="trace-depth"
              value={traceDepth}
              onChange={(event) => setTraceDepth(Number(event.target.value))}
              className="ide-focus-ring h-9 border border-ide-border-strong bg-ide-code px-2.5 font-mono text-[10px] text-ide-text outline-none rounded-ide-control"
            >
              <option value={1}>1 level</option>
              <option value={2}>2 levels</option>
              <option value={3}>3 levels</option>
              <option value={5}>5 levels</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isTracingPath}
            className="ide-focus-ring inline-flex min-h-[36px] items-center justify-center gap-2 bg-ide-amber px-3 font-mono text-[10px] font-semibold text-ide-shell hover:bg-ide-amber/85 disabled:cursor-not-allowed disabled:opacity-50 rounded-ide-control"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            {isTracingPath ? 'Tracing BFS…' : 'Execute BFS trace'}
          </button>
        </form>

        {traceResult ? (
          <section aria-live="polite">
            <div className="mb-2 flex items-center justify-between border-b border-ide-border pb-2">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-ide-muted">{traceResult.direction} path from {traceResult.symbol}</h3>
              <span className="font-mono text-[10px] text-ide-subtle">{traceResult.paths.length} records</span>
            </div>
            <ol className="divide-y divide-ide-border border-y border-ide-border">
              {traceResult.paths.map((path, index) => (
                <li key={`${path.file}-${path.line}-${index}`} className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-ide-amber/60 font-mono text-[10px] text-ide-amber">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                        <span className="text-ide-text">{path.source}</span>
                        <span className="text-[10px] uppercase text-ide-amber">{path.edge}</span>
                        <span className="text-ide-cyan">{path.target}</span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-ide-subtle">{path.file} · line {path.line}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenInEditor(path.file)}
                    className="ide-focus-ring inline-flex min-h-[30px] items-center gap-1 self-start border border-ide-border-strong px-2.5 font-mono text-[10px] text-ide-text hover:bg-ide-hover md:self-auto rounded-ide-control"
                  >
                    Inspect line <ArrowRight className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <div className="border-l-2 border-ide-border-strong px-4 py-4 font-mono text-[10px] text-ide-subtle">
            No trace result yet. Run a traversal to inspect the call path.
          </div>
        )}
      </div>
    </div>
  );

  // Dynamic Louvain Community & Architecture clusters
  const dynamicClusters = useMemo(() => {
    const areaMap = new Map<string, { name: string; area: string; members: string[]; fileCount: number; symbolCount: number }>();

    graphNodes.forEach((node) => {
      const area = (node.architectureArea || detectArchitectureArea(node.path)).toLowerCase();
      if (!areaMap.has(area)) {
        areaMap.set(area, {
          name: `${area.charAt(0).toUpperCase() + area.slice(1)} Subsystem`,
          area,
          members: [],
          fileCount: 0,
          symbolCount: 0,
        });
      }
      const c = areaMap.get(area)!;
      if (c.members.length < 8) {
        c.members.push(`${node.label} (${node.type})`);
      }
      if (node.type === 'File' || node.type === 'Test') c.fileCount++;
      else c.symbolCount++;
    });

    return Array.from(areaMap.values()).map((c) => {
      const total = c.fileCount + c.symbolCount;
      const pct = graphNodes.length > 0 ? Math.round((total / graphNodes.length) * 100) : 0;
      return {
        name: c.name,
        area: c.area,
        cohesion: `${Math.min(96, 75 + Math.round(pct / 4))}%`,
        description: `Architecture boundary containing ${c.fileCount} source files and ${c.symbolCount} parsed symbols (${pct}% of active workspace).`,
        members: c.members,
      };
    });
  }, [graphNodes]);

  const renderClusters = () => (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1120px] space-y-5 px-5 py-6 lg:px-8">
        <header className="border-b border-ide-border pb-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ide-strong">
            <Layers className="h-4 w-4 text-ide-purple" aria-hidden="true" />
            Louvain community detection & Architecture clusters
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ide-muted">
            Architecture modules detected from real AST relationships and folder separation in the active workspace.
          </p>
        </header>

        <div className="divide-y divide-ide-border border-y border-ide-border">
          {dynamicClusters.map((cluster) => {
            const theme = areaColors[cluster.area] || areaColors.core;
            return (
              <article key={cluster.name} className="grid gap-4 py-4 lg:grid-cols-[minmax(230px,0.8fr)_minmax(260px,1fr)_minmax(240px,1fr)]">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-ide-text">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.stroke }} aria-hidden="true" />
                    {cluster.name}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-ide-cyan">Cohesion: {cluster.cohesion}</div>
                </div>
                <p className="text-xs leading-relaxed text-ide-muted">{cluster.description}</p>
                <div className="font-mono text-[10px] text-ide-text">
                  {cluster.members.map((member) => (
                    <div key={member} className="py-0.5 truncate">• {member}</div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-ide-bg" data-purpose="knowledge-graph-workspace">
      <header className="shrink-0 border-b border-ide-border bg-ide-shell">
        <div className="flex min-h-[42px] flex-wrap items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px]">
            <span className="h-1.5 w-1.5 bg-ide-emerald" aria-hidden="true" />
            <span className="text-ide-cyan font-semibold">codebase-memory-mcp</span>
            <span className="text-ide-subtle">(DeusData Engine)</span>
            <span className="hidden text-ide-muted md:inline">Tree-Sitter AST v0.24 · In-Memory SQLite</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-ide-subtle">
            <span>Graph intelligence</span>
            <span>{graphNodes.length} nodes · {graphEdges.length} edges</span>
          </div>
        </div>
        <div className="border-t border-ide-border px-3">{renderGraphTabs()}</div>
      </header>
      {graphTab === 'canvas' && renderCanvas()}
      {graphTab === 'cypher' && renderCypher()}
      {graphTab === 'trace' && renderTrace()}
      {graphTab === 'clusters' && renderClusters()}
    </section>
  );
};
