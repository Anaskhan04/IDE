import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Code2,
  ExternalLink,
  FileCode,
  Flame,
  GitFork,
  Layers,
  Network,
  Play,
  RotateCcw,
  Search,
  Terminal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import type { GraphNode } from '../../types/ide';
import { SAMPLE_CYPHER_QUERIES } from '../../data/mockGraph';

type GraphTab = 'canvas' | 'cypher' | 'trace' | 'clusters';
type GraphFilter = 'all' | 'services' | 'components' | 'tests' | 'integrations';

const graphTabs: Array<{ id: GraphTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'canvas', label: '2D Graph', icon: Network },
  { id: 'cypher', label: 'Cypher Console', icon: Terminal },
  { id: 'trace', label: 'Call Tracer (BFS)', icon: GitFork },
  { id: 'clusters', label: 'Louvain Clusters', icon: Layers },
];

const graphFilters: GraphFilter[] = ['all', 'services', 'components', 'tests', 'integrations'];

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

const clusterRecords = [
  {
    name: 'Cluster 1: Billing & Payments',
    tone: 'text-ide-purple',
    marker: 'bg-ide-purple',
    cohesion: '94%',
    description: 'Encapsulates financial charge logic, card verification, and external payment gateway MCP bindings.',
    members: ['processPayment() (Function)', 'validateCard() (Function)', 'paymentService.ts (File)', 'POST /api/v2/charge (Route)'],
  },
  {
    name: 'Cluster 2: Client Experience & Cart',
    tone: 'text-ide-focus',
    marker: 'bg-ide-focus',
    cohesion: '91%',
    description: 'User interface components and local client state stores for order assembly and user confirmation.',
    members: ['CheckoutPage.tsx (Component)', 'cartStore.ts (State Store)', 'orderService.ts (Service)'],
  },
  {
    name: 'Cluster 3: Identity & Authentication',
    tone: 'text-ide-emerald',
    marker: 'bg-ide-emerald',
    cohesion: '88%',
    description: 'Token validation, session management, and credential lifecycle enforcement.',
    members: ['authService.ts (Service)', 'SessionManager (Class)', 'LoginPage.tsx (Component)'],
  },
];

export const KnowledgeGraphCanvas: React.FC = () => {
  const {
    graphNodes,
    graphEdges,
    selectedGraphNode,
    setSelectedGraphNode,
    openFile,
    setActiveView,
    cypherResult,
    isExecutingCypher,
    executeCypherQuery,
    traceResult,
    isTracingPath,
    traceCallPath,
  } = useIDE();

  const [graphTab, setGraphTab] = useState<GraphTab>('canvas');
  const [zoom, setZoom] = useState(1);
  const [filterModule, setFilterModule] = useState<GraphFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [impactModeOnly, setImpactModeOnly] = useState(false);
  const [activeCypherText, setActiveCypherText] = useState(SAMPLE_CYPHER_QUERIES[0].query);
  const [traceSymbol, setTraceSymbol] = useState('processPayment');
  const [traceDirection, setTraceDirection] = useState<'inbound' | 'outbound'>('inbound');
  const [traceDepth, setTraceDepth] = useState(3);

  const filteredNodes = useMemo(() => graphNodes.filter((node) => {
    const matchesModule = filterModule === 'all' || node.module === filterModule;
    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch = node.label.toLowerCase().includes(normalizedQuery) || node.path.toLowerCase().includes(normalizedQuery);
    const matchesImpact = !impactModeOnly || node.impactStatus !== 'none';
    return matchesModule && matchesSearch && matchesImpact;
  }), [filterModule, graphNodes, impactModeOnly, searchQuery]);

  const nodeMap = useMemo(() => new Map(graphNodes.map((node) => [node.id, node])), [graphNodes]);

  const handleOpenInEditor = (path: string) => {
    const fileId = path.includes('payment') ? 'payment-service'
      : path.includes('Checkout') ? 'checkout-page'
        : path.includes('cart') ? 'cart-controller'
          : path.includes('auth') ? 'auth-service'
            : path.includes('order') ? 'order-service'
              : 'payment-service';
    openFile(fileId);
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

  const renderNodeInspector = () => (
    <aside className="flex max-h-[38%] shrink-0 flex-col overflow-y-auto border-t border-ide-border bg-ide-sidebar xl:max-h-none xl:w-[310px] xl:border-l xl:border-t-0" aria-label="Selected graph node evidence">
      <div className="flex min-h-[42px] items-center justify-between border-b border-ide-border px-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ide-muted">Node evidence</span>
        {selectedGraphNode && <span className="font-mono text-[10px] text-ide-cyan">{selectedGraphNode.type}</span>}
      </div>
      {!selectedGraphNode ? (
        <div className="px-4 py-5 font-mono text-[10px] text-ide-subtle">Select a node to inspect relationships.</div>
      ) : (
        <div className="flex min-h-0 flex-col gap-4 p-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-ide-text"><Code2 className="h-3.5 w-3.5 text-ide-cyan" aria-hidden="true" />{selectedGraphNode.label}</div>
            <div className="mt-1 truncate font-mono text-[10px] text-ide-muted">{selectedGraphNode.path}</div>
          </div>

          {selectedGraphNode.cluster && (
            <div className="flex items-center justify-between border-y border-ide-border py-2 font-mono text-[10px]">
              <span className="text-ide-subtle">Louvain community</span>
              <span className="max-w-[150px] truncate text-ide-purple">{selectedGraphNode.cluster}</span>
            </div>
          )}

          <dl className="divide-y divide-ide-border border-y border-ide-border font-mono text-[10px]">
            {selectedGraphNode.returnType && <div className="flex items-center justify-between gap-3 py-2"><dt className="text-ide-subtle">Return signature</dt><dd className="truncate text-ide-cyan">{selectedGraphNode.returnType}</dd></div>}
            {selectedGraphNode.loc && <div className="flex items-center justify-between gap-3 py-2"><dt className="text-ide-subtle">Lines of code</dt><dd className="text-ide-text">{selectedGraphNode.loc} LOC</dd></div>}
            <div className="flex items-center justify-between gap-3 py-2"><dt className="text-ide-subtle">Connections</dt><dd className="text-ide-emerald">{selectedGraphNode.connectionsCount || 3} edges</dd></div>
          </dl>

          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ide-subtle">Relationships</div>
            <div className="divide-y divide-ide-border border-y border-ide-border">
              {graphEdges.filter((edge) => edge.source === selectedGraphNode.id || edge.target === selectedGraphNode.id).map((edge) => {
                const isOutbound = edge.source === selectedGraphNode.id;
                const otherNode = nodeMap.get(isOutbound ? edge.target : edge.source);
                return (
                  <div key={edge.id} className="flex items-center justify-between gap-2 py-2 font-mono text-[10px]">
                    <span className="shrink-0 text-ide-cyan">{isOutbound ? `› ${edge.label || edge.type}` : '‹ called by'}</span>
                    <span className="truncate text-right text-ide-text">{otherNode?.label || 'Unknown node'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t border-ide-border pt-3">
            <button
              type="button"
              onClick={() => {
                setTraceSymbol(selectedGraphNode.label.replace('()', ''));
                setGraphTab('trace');
                traceCallPath(selectedGraphNode.label.replace('()', ''), 'inbound', 3);
              }}
              className="ide-focus-ring flex min-h-[34px] items-center justify-center gap-2 border border-ide-amber/60 px-3 text-[10px] font-semibold text-ide-amber hover:bg-ide-amber/10"
            >
              <GitFork className="h-3.5 w-3.5" aria-hidden="true" /> Trace call path
            </button>
            <button type="button" onClick={() => handleOpenInEditor(selectedGraphNode.path)} className="ide-focus-ring flex min-h-[34px] items-center justify-center gap-2 bg-ide-focus px-3 text-[10px] font-semibold text-white hover:bg-ide-focus/85">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open in code editor
            </button>
          </div>
        </div>
      )}
    </aside>
  );

  const renderCanvas = () => (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
      <div className="relative min-h-[460px] min-w-0 flex-1 overflow-auto bg-ide-bg">
        <div className="absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1 border border-ide-border-strong bg-ide-panel px-2 py-1">
            <span className="mr-1 font-mono text-[10px] text-ide-subtle">Filter</span>
            {graphFilters.map((filter) => (
              <button key={filter} type="button" onClick={() => setFilterModule(filter)} aria-pressed={filterModule === filter} className={`ide-focus-ring px-2 py-1 font-mono text-[10px] capitalize ${filterModule === filter ? 'bg-ide-selected text-ide-cyan' : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'}`}>{filter}</button>
            ))}
            <span className="mx-1 h-4 w-px bg-ide-border" aria-hidden="true" />
            <button type="button" onClick={() => setImpactModeOnly((active) => !active)} aria-pressed={impactModeOnly} className={`ide-focus-ring flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] ${impactModeOnly ? 'bg-ide-rose/10 text-ide-rose' : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'}`}><Flame className="h-3 w-3" aria-hidden="true" />Impact only</button>
          </div>

          <div className="flex items-center gap-1 border border-ide-border-strong bg-ide-panel px-2 py-1">
            <label className="sr-only" htmlFor="graph-node-search">Search nodes or paths</label>
            <Search className="h-3.5 w-3.5 text-ide-subtle" aria-hidden="true" />
            <input id="graph-node-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search node / path…" className="ide-focus-ring w-32 bg-transparent px-1 py-1 font-mono text-[10px] text-ide-text outline-none placeholder:text-ide-subtle md:w-44" />
            <button type="button" onClick={() => setZoom((current) => Math.min(current + 0.15, 1.8))} className="ide-focus-ring flex h-7 w-7 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text" title="Zoom in" aria-label="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => setZoom((current) => Math.max(current - 0.15, 0.6))} className="ide-focus-ring flex h-7 w-7 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text" title="Zoom out" aria-label="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => setZoom(1)} className="ide-focus-ring flex h-7 w-7 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text" title="Reset zoom" aria-label="Reset zoom"><RotateCcw className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        <div className="flex h-full min-h-[520px] min-w-[900px] items-center justify-center px-2 pt-16">
          <svg className="h-full w-full min-w-[900px]" viewBox="0 0 950 600" role="img" aria-label={`Knowledge graph showing ${filteredNodes.length} of ${graphNodes.length} nodes`} style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
            <defs>
              <pattern id="ledger-graph-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#161c2b" strokeWidth="0.8" /></pattern>
              <marker id="ledger-graph-arrow" markerWidth="8" markerHeight="6" refX="14" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#718096" opacity="0.8" /></marker>
              <marker id="ledger-graph-arrow-impact" markerWidth="8" markerHeight="6" refX="14" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#f59e0b" /></marker>
            </defs>
            <rect width="100%" height="100%" fill="url(#ledger-graph-grid)" />
            {graphEdges.map((edge) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target || source.x == null || source.y == null || target.x == null || target.y == null) return null;
              const isImpact = edge.isImpactPath;
              return (
                <g key={edge.id}>
                  <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={isImpact ? '#f59e0b' : '#2b384e'} strokeWidth={isImpact ? '2' : '1.2'} strokeDasharray={edge.type === 'TESTS' ? '4,4' : undefined} markerEnd={isImpact ? 'url(#ledger-graph-arrow-impact)' : 'url(#ledger-graph-arrow)'} />
                  {edge.label && <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 4} fill={isImpact ? '#fbbf24' : '#718096'} fontSize="8.5" fontFamily="JetBrains Mono" textAnchor="middle">{edge.label}</text>}
                </g>
              );
            })}
            {filteredNodes.map((node) => {
              const isSelected = selectedGraphNode?.id === node.id;
              const tone = getImpactTone(node);
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x ?? 100}, ${node.y ?? 100})`}
                  role="button"
                  tabIndex={0}
                  focusable="true"
                  aria-label={`${node.label}, ${node.type}, ${node.path}`}
                  onClick={() => setSelectedGraphNode(node)}
                  onKeyDown={(event) => handleNodeKeyDown(event, node)}
                  className="cursor-pointer"
                >
                  <rect x="-65" y="-20" width="130" height="40" fill={tone.fill} stroke={isSelected ? '#3b82f6' : tone.stroke} strokeWidth={isSelected ? '2.5' : '1.5'} />
                  <rect x="-65" y="-20" width="4" height="40" fill={tone.marker} />
                  <circle cx="-50" cy="0" r="3.5" fill={tone.marker} />
                  <text x="-40" y="4" fill="#f5f7fa" fontSize="10" fontWeight="500" fontFamily="JetBrains Mono">{node.label.length > 14 ? `${node.label.substring(0, 13)}..` : node.label}</text>
                  <text x="56" y="15" fill={tone.marker} fontSize="7.5" fontFamily="JetBrains Mono" textAnchor="end" className="uppercase">{node.type}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 border border-ide-border bg-ide-panel px-3 py-2 font-mono text-[10px] text-ide-muted" aria-label="Graph legend">
          {[['bg-ide-cyan', 'Function'], ['bg-ide-amber', 'Class'], ['bg-ide-rose', 'Route'], ['bg-ide-emerald', 'Test'], ['bg-ide-purple', 'MCP']].map(([marker, label]) => <span key={label} className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 ${marker}`} aria-hidden="true" />{label}</span>)}
          <span className="border-l border-ide-border pl-3">Showing {filteredNodes.length}/{graphNodes.length}</span>
        </div>
      </div>
      {renderNodeInspector()}
    </div>
  );

  const renderCypher = () => (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1120px] space-y-5 px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-ide-border pb-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div><h2 className="flex items-center gap-2 text-base font-semibold text-ide-strong"><Terminal className="h-4 w-4 text-ide-cyan" aria-hidden="true" />Interactive Cypher query console</h2><p className="mt-2 text-xs text-ide-muted">Execute graph pattern matching queries against the in-memory SQLite store.</p></div>
          {cypherResult && <div className="flex items-center gap-2 font-mono text-[10px] text-ide-emerald" aria-live="polite"><Clock className="h-3.5 w-3.5" aria-hidden="true" />Execution time: {cypherResult.executionTimeMs}ms</div>}
        </header>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]"><span className="text-ide-subtle">Templates:</span>{SAMPLE_CYPHER_QUERIES.map((query) => <button key={query.name} type="button" onClick={() => { setActiveCypherText(query.query); handleRunCypher(query.query); }} className="ide-focus-ring border border-ide-border-strong px-2.5 py-1.5 text-ide-muted hover:bg-ide-hover hover:text-ide-text">{query.name}</button>)}</div>

        <form onSubmit={(event) => { event.preventDefault(); handleRunCypher(); }} className="border border-ide-border bg-ide-panel">
          <div className="flex items-center justify-between border-b border-ide-border px-3 py-2"><label htmlFor="cypher-query" className="font-mono text-[10px] text-ide-muted">Cypher query</label><span className="font-mono text-[10px] text-ide-subtle">AST graph · read only</span></div>
          <div className="relative p-3"><textarea id="cypher-query" rows={5} value={activeCypherText} onChange={(event) => setActiveCypherText(event.target.value)} aria-describedby="cypher-query-help" className="ide-focus-ring w-full resize-y border border-ide-border-strong bg-ide-code p-3 font-mono text-[11px] leading-relaxed text-ide-cyan outline-none focus:border-ide-focus" /><div id="cypher-query-help" className="mt-2 text-[10px] text-ide-subtle">Use a template or write a graph query, then inspect the returned rows below.</div><button type="submit" disabled={isExecutingCypher} className="ide-focus-ring mt-3 inline-flex min-h-[32px] items-center gap-2 bg-ide-cyan px-3 text-[11px] font-semibold text-ide-shell hover:bg-ide-cyan/85 disabled:cursor-not-allowed disabled:opacity-50"><Play className="h-3.5 w-3.5" aria-hidden="true" />{isExecutingCypher ? 'Executing…' : 'Run query'}</button></div>
        </form>

        {cypherResult ? (
          <div className="border border-ide-border bg-ide-panel" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ide-border px-3 py-3 font-mono text-[10px]"><span className="text-ide-text">Results · {cypherResult.rows.length} rows returned</span><span className="text-ide-subtle">Structured graph schema</span></div>
            <div className="overflow-x-auto"><table className="min-w-full border-collapse text-left font-mono text-[11px]" aria-label="Cypher query results"><thead><tr className="border-b border-ide-border text-[10px] uppercase tracking-[0.08em] text-ide-subtle">{cypherResult.columns.map((column) => <th key={column} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">{column}</th>)}</tr></thead><tbody>{cypherResult.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-ide-border last:border-b-0 hover:bg-ide-hover/50">{cypherResult.columns.map((column) => <td key={column} className="whitespace-nowrap px-3 py-2 text-ide-text">{typeof row[column] === 'object' ? JSON.stringify(row[column]) : String(row[column])}</td>)}</tr>)}</tbody></table></div>
          </div>
        ) : <div className="border-l-2 border-ide-border-strong px-4 py-4 font-mono text-[10px] text-ide-subtle">No query result yet.</div>}
      </div>
    </div>
  );

  const renderTrace = () => (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1120px] space-y-5 px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-ide-border pb-4 2xl:flex-row 2xl:items-end 2xl:justify-between"><div><h2 className="flex items-center gap-2 text-base font-semibold text-ide-strong"><GitFork className="h-4 w-4 text-ide-amber" aria-hidden="true" />BFS call chain tracer</h2><p className="mt-2 text-xs text-ide-muted">Traverse inbound callers or outbound callees across files and packages.</p></div>{traceResult && <div className="flex items-center gap-2 font-mono text-[10px] text-ide-amber" aria-live="polite"><Clock className="h-3.5 w-3.5" aria-hidden="true" />Traversal time: {traceResult.executionTimeMs}ms</div>}</header>

        <form onSubmit={handleRunTrace} className="grid gap-4 border border-ide-border bg-ide-panel p-4 lg:grid-cols-[minmax(180px,1fr)_auto_auto_auto] lg:items-end">
          <div><label htmlFor="trace-symbol" className="mb-1.5 block font-mono text-[10px] text-ide-muted">Target function</label><input id="trace-symbol" type="text" value={traceSymbol} onChange={(event) => setTraceSymbol(event.target.value)} className="ide-focus-ring h-9 w-full border border-ide-border-strong bg-ide-code px-2.5 font-mono text-[11px] text-ide-text outline-none focus:border-ide-focus" /></div>
          <fieldset><legend className="mb-1.5 font-mono text-[10px] text-ide-muted">Direction</legend><div className="flex border border-ide-border-strong"><button type="button" onClick={() => setTraceDirection('inbound')} aria-pressed={traceDirection === 'inbound'} className={`ide-focus-ring min-h-[36px] px-2.5 font-mono text-[10px] ${traceDirection === 'inbound' ? 'bg-ide-amber/10 text-ide-amber' : 'text-ide-muted hover:bg-ide-hover'}`}>Inbound</button><button type="button" onClick={() => setTraceDirection('outbound')} aria-pressed={traceDirection === 'outbound'} className={`ide-focus-ring min-h-[36px] px-2.5 font-mono text-[10px] ${traceDirection === 'outbound' ? 'bg-ide-amber/10 text-ide-amber' : 'text-ide-muted hover:bg-ide-hover'}`}>Outbound</button></div></fieldset>
          <div><label htmlFor="trace-depth" className="mb-1.5 block font-mono text-[10px] text-ide-muted">Max depth</label><select id="trace-depth" value={traceDepth} onChange={(event) => setTraceDepth(Number(event.target.value))} className="ide-focus-ring h-9 border border-ide-border-strong bg-ide-code px-2.5 font-mono text-[10px] text-ide-text outline-none"><option value={1}>1 level</option><option value={2}>2 levels</option><option value={3}>3 levels</option><option value={5}>5 levels</option></select></div>
          <button type="submit" disabled={isTracingPath} className="ide-focus-ring inline-flex min-h-[36px] items-center justify-center gap-2 bg-ide-amber px-3 font-mono text-[10px] font-semibold text-ide-shell hover:bg-ide-amber/85 disabled:cursor-not-allowed disabled:opacity-50"><Play className="h-3.5 w-3.5" aria-hidden="true" />{isTracingPath ? 'Tracing BFS…' : 'Execute BFS trace'}</button>
        </form>

        {traceResult ? <section aria-live="polite"><div className="mb-2 flex items-center justify-between border-b border-ide-border pb-2"><h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-ide-muted">{traceResult.direction} path from {traceResult.symbol}</h3><span className="font-mono text-[10px] text-ide-subtle">{traceResult.paths.length} records</span></div><ol className="divide-y divide-ide-border border-y border-ide-border">{traceResult.paths.map((path, index) => <li key={`${path.file}-${path.line}-${index}`} className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center border border-ide-amber/60 font-mono text-[10px] text-ide-amber">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 font-mono text-xs"><span className="text-ide-text">{path.source}</span><span className="text-[10px] uppercase text-ide-amber">{path.edge}</span><span className="text-ide-cyan">{path.target}</span></div><div className="mt-1 font-mono text-[10px] text-ide-subtle">{path.file} · line {path.line}</div></div></div><button type="button" onClick={() => handleOpenInEditor(path.file)} className="ide-focus-ring inline-flex min-h-[30px] items-center gap-1 self-start border border-ide-border-strong px-2.5 font-mono text-[10px] text-ide-text hover:bg-ide-hover md:self-auto">Inspect line <ArrowRight className="h-3 w-3" /></button></li>)}</ol></section> : <div className="border-l-2 border-ide-border-strong px-4 py-4 font-mono text-[10px] text-ide-subtle">No trace result yet. Run a traversal to inspect the call path.</div>}
      </div>
    </div>
  );

  const renderClusters = () => (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1120px] space-y-5 px-5 py-6 lg:px-8">
        <header className="border-b border-ide-border pb-4"><h2 className="flex items-center gap-2 text-base font-semibold text-ide-strong"><Layers className="h-4 w-4 text-ide-purple" aria-hidden="true" />Louvain community detection</h2><p className="mt-2 max-w-2xl text-xs leading-relaxed text-ide-muted">Review the existing architecture clusters identified from graph edge density.</p></header>
        <div className="divide-y divide-ide-border border-y border-ide-border">{clusterRecords.map((cluster) => <article key={cluster.name} className="grid gap-4 py-4 lg:grid-cols-[minmax(230px,0.8fr)_minmax(260px,1fr)_minmax(240px,1fr)]"><div><div className="flex items-center gap-2 text-xs font-semibold text-ide-text"><span className={`h-1.5 w-1.5 ${cluster.marker}`} aria-hidden="true" />{cluster.name}</div><div className={`mt-2 font-mono text-[10px] ${cluster.tone}`}>Cohesion {cluster.cohesion}</div></div><p className="text-xs leading-relaxed text-ide-muted">{cluster.description}</p><div className="font-mono text-[10px] text-ide-text">{cluster.members.map((member) => <div key={member} className="py-0.5">• {member}</div>)}</div></article>)}</div>
      </div>
    </div>
  );

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-ide-bg" data-purpose="knowledge-graph-workspace">
      <header className="shrink-0 border-b border-ide-border bg-ide-shell">
        <div className="flex min-h-[42px] flex-wrap items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px]"><span className="h-1.5 w-1.5 bg-ide-emerald" aria-hidden="true" /><span className="text-ide-cyan">codebase-memory-mcp</span><span className="text-ide-subtle">(DeusData Engine)</span><span className="hidden text-ide-muted md:inline">Tree-Sitter AST v0.24 · In-Memory SQLite</span></div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-ide-subtle"><span>Graph intelligence</span><span>{graphNodes.length} nodes · {graphEdges.length} edges</span></div>
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
