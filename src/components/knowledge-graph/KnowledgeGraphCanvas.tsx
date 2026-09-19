import React, { useState } from 'react';
import { useIDE } from '../../context/IDEContext';
import { GraphNode, GraphEdge } from '../../types/ide';
import { SAMPLE_CYPHER_QUERIES } from '../../data/mockGraph';
import { 
  GitFork, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  FileCode, 
  Code2, 
  ShieldAlert, 
  Play, 
  Terminal, 
  Cpu, 
  ExternalLink, 
  Flame, 
  Network, 
  Layers, 
  Check, 
  ArrowRight, 
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';

export const KnowledgeGraphCanvas: React.FC = () => {
  const { 
    graphNodes, 
    graphEdges, 
    selectedGraphNode, 
    setSelectedGraphNode, 
    openFile, 
    setActiveView, 
    runChangeImpactAnalysis,
    cypherResult,
    isExecutingCypher,
    executeCypherQuery,
    traceResult,
    isTracingPath,
    traceCallPath
  } = useIDE();

  const [graphTab, setGraphTab] = useState<'canvas' | 'cypher' | 'trace' | 'clusters'>('canvas');
  const [zoom, setZoom] = useState(1);
  const [filterModule, setFilterModule] = useState<'all' | 'services' | 'components' | 'tests' | 'integrations'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [impactModeOnly, setImpactModeOnly] = useState(false);
  
  // Cypher query state
  const [activeCypherText, setActiveCypherText] = useState(SAMPLE_CYPHER_QUERIES[0].query);

  // Trace path state
  const [traceSymbol, setTraceSymbol] = useState('processPayment');
  const [traceDirection, setTraceDirection] = useState<'inbound' | 'outbound'>('inbound');
  const [traceDepth, setTraceDepth] = useState(3);

  // Filtered nodes
  const filteredNodes = graphNodes.filter(node => {
    const matchesModule = filterModule === 'all' || node.module === filterModule;
    const matchesSearch = node.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          node.path.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesImpact = !impactModeOnly || node.impactStatus !== 'none';
    return matchesModule && matchesSearch && matchesImpact;
  });

  const nodeMap = new Map<string, GraphNode>();
  graphNodes.forEach(n => nodeMap.set(n.id, n));

  const handleOpenInEditor = (path: string) => {
    const fileId = path.includes('payment') ? 'payment-service' :
                   path.includes('Checkout') ? 'checkout-page' :
                   path.includes('cart') ? 'cart-controller' :
                   path.includes('auth') ? 'auth-service' :
                   path.includes('order') ? 'order-service' : 'payment-service';
    openFile(fileId);
    setActiveView('editor');
  };

  const handleRunCypher = (queryToRun?: string) => {
    const q = queryToRun || activeCypherText;
    executeCypherQuery(q);
  };

  const handleRunTrace = () => {
    traceCallPath(traceSymbol, traceDirection, traceDepth);
  };

  return (
    <div className="flex-1 flex flex-col bg-ide-bg h-[calc(100vh-3.5rem-1.75rem)] overflow-hidden select-none font-sans">
      {/* Top Engine Banner (DeusData codebase-memory-mcp) */}
      <div className="h-10 bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-ide-sidebar border-b border-ide-border px-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-white font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-cyan-400">codebase-memory-mcp</span>
            <span className="text-slate-400 font-normal text-[11px]">(DeusData Engine)</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Tree-Sitter AST v0.24</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">In-Memory SQLite</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Query Latency &lt; 1ms
            </span>
          </div>
        </div>

        {/* Knowledge Graph Sub-Tabs */}
        <div className="flex items-center gap-1 bg-ide-panel/80 p-1 rounded-lg border border-ide-border text-xs font-mono">
          <button
            onClick={() => setGraphTab('canvas')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              graphTab === 'canvas' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3 h-3" />
            <span>2D Graph</span>
          </button>
          <button
            onClick={() => setGraphTab('cypher')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              graphTab === 'cypher' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span>Cypher Console</span>
          </button>
          <button
            onClick={() => setGraphTab('trace')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              graphTab === 'trace' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitFork className="w-3 h-3 text-amber-400" />
            <span>Call Tracer (BFS)</span>
          </button>
          <button
            onClick={() => setGraphTab('clusters')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              graphTab === 'clusters' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3 text-purple-400" />
            <span>Louvain Clusters</span>
          </button>
        </div>
      </div>

      {/* Main Content Area based on Sub-Tab */}
      <div className="flex-1 flex overflow-hidden relative">
        {graphTab === 'canvas' && (
          <>
            {/* Visual SVG Canvas */}
            <div className="flex-1 relative flex flex-col overflow-hidden">
              {/* Controls Toolbar */}
              <div className="absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
                {/* Filter Bar */}
                <div className="flex items-center gap-2 bg-ide-panel/90 backdrop-blur-md p-1.5 rounded-xl border border-ide-border shadow-xl pointer-events-auto">
                  <div className="flex items-center space-x-1">
                    {(['all', 'services', 'components', 'tests', 'integrations'] as const).map((mod) => (
                      <button
                        key={mod}
                        onClick={() => setFilterModule(mod)}
                        className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                          filterModule === mod
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>

                  <div className="h-4 w-px bg-ide-border" />

                  <button
                    onClick={() => setImpactModeOnly(!impactModeOnly)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      impactModeOnly
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Flame className="w-3 h-3 text-rose-400" />
                    <span>Blast Radius Only</span>
                  </button>
                </div>

                {/* Search & Zoom Controls */}
                <div className="flex items-center gap-2 bg-ide-panel/90 backdrop-blur-md p-1.5 rounded-xl border border-ide-border shadow-xl pointer-events-auto">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search node / path..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-ide-card text-xs text-slate-200 pl-7 pr-2 py-1 rounded-md border border-ide-border focus:outline-none focus:border-cyan-500/60 font-mono w-32 md:w-44"
                    />
                  </div>

                  <button
                    onClick={() => setZoom(prev => Math.min(prev + 0.15, 1.8))}
                    className="p-1.5 rounded hover:bg-ide-hover text-slate-400 hover:text-white"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoom(prev => Math.max(prev - 0.15, 0.6))}
                    className="p-1.5 rounded hover:bg-ide-hover text-slate-400 hover:text-white"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    className="p-1.5 rounded hover:bg-ide-hover text-slate-400 hover:text-white"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Legend indicator */}
              <div className="absolute bottom-3 left-4 z-20 bg-ide-panel/80 backdrop-blur-md p-2 rounded-xl border border-ide-border shadow-lg text-[10px] font-mono flex items-center gap-3 text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Function</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Class</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>Route</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Test</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>MCP Gateway</span>
                </div>
              </div>

              {/* Interactive SVG */}
              <div className="w-full h-full overflow-hidden flex items-center justify-center">
                <svg 
                  className="w-full h-full transition-transform duration-150 cursor-grab active:cursor-grabbing"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                  viewBox="0 0 950 600"
                >
                  <defs>
                    <pattern id="cbm-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#161c2b" strokeWidth="0.8" />
                    </pattern>
                    <marker id="cbm-arrow" markerWidth="8" markerHeight="6" refX="14" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" opacity="0.6" />
                    </marker>
                    <marker id="cbm-arrow-impact" markerWidth="8" markerHeight="6" refX="14" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
                    </marker>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#cbm-grid)" />

                  {/* Edges */}
                  {graphEdges.map((edge) => {
                    const src = nodeMap.get(edge.source);
                    const tgt = nodeMap.get(edge.target);
                    if (!src || !tgt || !src.x || !src.y || !tgt.x || !tgt.y) return null;

                    const isImpact = edge.isImpactPath;

                    return (
                      <g key={edge.id}>
                        <line
                          x1={src.x}
                          y1={src.y}
                          x2={tgt.x}
                          y2={tgt.y}
                          stroke={isImpact ? '#f59e0b' : '#2b364e'}
                          strokeWidth={isImpact ? '2' : '1.2'}
                          strokeDasharray={edge.type === 'TESTS' ? '4,4' : undefined}
                          markerEnd={isImpact ? 'url(#cbm-arrow-impact)' : 'url(#cbm-arrow)'}
                        />
                        {edge.label && (
                          <text
                            x={(src.x + tgt.x) / 2}
                            y={(src.y + tgt.y) / 2 - 4}
                            fill={isImpact ? '#fbbf24' : '#64748b'}
                            fontSize="8.5"
                            fontFamily="JetBrains Mono"
                            textAnchor="middle"
                            className="select-none"
                          >
                            {edge.label}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Nodes */}
                  {filteredNodes.map((node) => {
                    const isSelected = selectedGraphNode?.id === node.id;
                    const isModified = node.impactStatus === 'modified';
                    const isDirect = node.impactStatus === 'direct';

                    let strokeColor = '#334155';
                    let fillColor = '#101520';
                    let badgeColor = '#64748b';

                    if (isModified) {
                      strokeColor = '#f43f5e';
                      fillColor = '#25101a';
                      badgeColor = '#fb7185';
                    } else if (isDirect) {
                      strokeColor = '#f59e0b';
                      fillColor = '#241a0d';
                      badgeColor = '#fbbf24';
                    } else if (node.type === 'Function') {
                      strokeColor = '#06b6d4';
                      fillColor = '#0b1f28';
                      badgeColor = '#22d3ee';
                    } else if (node.type === 'Route') {
                      strokeColor = '#f43f5e';
                      fillColor = '#29111b';
                      badgeColor = '#fb7185';
                    } else if (node.type === 'Class') {
                      strokeColor = '#f59e0b';
                      fillColor = '#261b0c';
                      badgeColor = '#fbbf24';
                    } else if (node.type === 'Test') {
                      strokeColor = '#10b981';
                      fillColor = '#0c2419';
                      badgeColor = '#34d399';
                    } else if (node.type === 'MCP') {
                      strokeColor = '#8b5cf6';
                      fillColor = '#1a122e';
                      badgeColor = '#a78bfa';
                    }

                    if (isSelected) {
                      strokeColor = '#38bdf8';
                    }

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x || 100}, ${node.y || 100})`}
                        onClick={() => setSelectedGraphNode(node)}
                        className="cursor-pointer group"
                      >
                        {(isModified || isDirect) && (
                          <circle r="34" fill="none" stroke={isModified ? '#f43f5e' : '#f59e0b'} strokeWidth="1.5" opacity="0.3" className="animate-ping" />
                        )}

                        <rect
                          x="-65"
                          y="-20"
                          width="130"
                          height="40"
                          rx="8"
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? '2.5' : '1.5'}
                          className="transition-all duration-200 group-hover:brightness-125"
                        />

                        <circle cx="-50" cy="0" r="4" fill={badgeColor} />

                        <text x="-40" y="4" fill="#f1f5f9" fontSize="10" fontWeight="500" fontFamily="JetBrains Mono" className="select-none">
                          {node.label.length > 14 ? node.label.substring(0, 13) + '..' : node.label}
                        </text>

                        <text x="56" y="15" fill={badgeColor} fontSize="7.5" fontFamily="JetBrains Mono" textAnchor="end" className="select-none uppercase opacity-80">
                          {node.type}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Right Drawer: Node Deep Inspector */}
            {selectedGraphNode && (
              <div className="w-80 bg-ide-sidebar border-l border-ide-border p-4 flex flex-col justify-between overflow-y-auto z-20 animate-in slide-in-from-right duration-200">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                      <span className="uppercase tracking-wider">codebase-memory AST Node</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {selectedGraphNode.type}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate">{selectedGraphNode.label}</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono truncate mt-1">
                      {selectedGraphNode.path}
                    </p>
                  </div>

                  {selectedGraphNode.cluster && (
                    <div className="p-2.5 rounded-lg bg-purple-950/20 border border-purple-500/30 text-purple-300 text-xs font-mono flex items-center justify-between">
                      <span>Louvain Community:</span>
                      <span className="font-bold text-white">{selectedGraphNode.cluster}</span>
                    </div>
                  )}

                  <div className="space-y-2 text-xs font-mono">
                    {selectedGraphNode.returnType && (
                      <div className="p-2 rounded bg-ide-card border border-ide-border flex justify-between">
                        <span className="text-slate-400">Return Signature:</span>
                        <span className="text-cyan-300 truncate max-w-[140px]">{selectedGraphNode.returnType}</span>
                      </div>
                    )}
                    {selectedGraphNode.loc && (
                      <div className="p-2 rounded bg-ide-card border border-ide-border flex justify-between">
                        <span className="text-slate-400">Lines of Code:</span>
                        <span className="text-slate-200">{selectedGraphNode.loc} LOC</span>
                      </div>
                    )}
                    <div className="p-2 rounded bg-ide-card border border-ide-border flex justify-between">
                      <span className="text-slate-400">Inbound/Outbound Degree:</span>
                      <span className="text-emerald-400">{selectedGraphNode.connectionsCount || 3} edges</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-mono uppercase text-slate-400">Relationships in PKG</h4>
                    <div className="space-y-1 text-[11px] font-mono max-h-40 overflow-y-auto">
                      {graphEdges
                        .filter(e => e.source === selectedGraphNode.id || e.target === selectedGraphNode.id)
                        .map(e => {
                          const isOutbound = e.source === selectedGraphNode.id;
                          const otherNode = nodeMap.get(isOutbound ? e.target : e.source);
                          return (
                            <div key={e.id} className="p-1.5 rounded bg-ide-card/60 border border-ide-border flex items-center justify-between text-slate-300">
                              <span className="text-cyan-400">{isOutbound ? '› ' + e.label : '‹ called by'}</span>
                              <span className="text-slate-200 font-medium truncate max-w-[140px]">{otherNode?.label}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-ide-border space-y-2">
                  <button
                    onClick={() => {
                      setTraceSymbol(selectedGraphNode.label.replace('()', ''));
                      setGraphTab('trace');
                      traceCallPath(selectedGraphNode.label.replace('()', ''), 'inbound', 3);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <GitFork className="w-3.5 h-3.5 text-amber-400" />
                    <span>Trace Call Path (trace_path)</span>
                  </button>

                  <button
                    onClick={() => handleOpenInEditor(selectedGraphNode.path)}
                    className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Code Editor</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Cypher Query Console (DeusData codebase-memory-mcp query_cypher) */}
        {graphTab === 'cypher' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-ide-border">
              <div>
                <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Interactive Cypher Graph Query Console (`query_cypher`)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Execute direct Cypher graph pattern matching queries on the in-memory SQLite store in &lt;1ms.
                </p>
              </div>

              {cypherResult && (
                <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Execution Time: {cypherResult.executionTimeMs}ms</span>
                </div>
              )}
            </div>

            {/* Pre-canned query picker */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-slate-400">Templates:</span>
              {SAMPLE_CYPHER_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveCypherText(q.query);
                    handleRunCypher(q.query);
                  }}
                  className="px-2.5 py-1 rounded bg-ide-card hover:bg-ide-hover border border-ide-border text-xs text-slate-300 font-mono transition-colors"
                >
                  {q.name}
                </button>
              ))}
            </div>

            {/* Query Editor & Run Button */}
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  rows={3}
                  value={activeCypherText}
                  onChange={(e) => setActiveCypherText(e.target.value)}
                  className="w-full bg-code p-3 rounded-lg border border-ide-border text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500/60 leading-relaxed"
                />
                <button
                  onClick={() => handleRunCypher()}
                  disabled={isExecutingCypher}
                  className="absolute right-2.5 bottom-3 px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Play className="w-3 h-3" />
                  <span>{isExecutingCypher ? 'Executing...' : 'Run Query (<1ms)'}</span>
                </button>
              </div>
            </div>

            {/* Results Table */}
            {cypherResult && (
              <div className="space-y-2 bg-ide-panel border border-ide-border rounded-xl p-4">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Results ({cypherResult.rows.length} rows returned)</span>
                  <span className="text-slate-500">Structured Graph Schema</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-ide-border text-slate-400 bg-ide-card/50">
                        {cypherResult.columns.map((col) => (
                          <th key={col} className="p-2.5 uppercase font-semibold text-[10px] tracking-wider">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ide-border/60">
                      {cypherResult.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-ide-card/40 transition-colors">
                          {cypherResult.columns.map((col) => (
                            <td key={col} className="p-2.5 text-slate-200">
                              {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Call Chain BFS Tracer (DeusData codebase-memory-mcp trace_path) */}
        {graphTab === 'trace' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-ide-border">
              <div>
                <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-amber-400" />
                  <span>BFS Call Chain Tracer (`trace_path`)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Traverse call chains inbound (callers) or outbound (callees) across files and packages with type inference.
                </p>
              </div>

              {traceResult && (
                <div className="flex items-center gap-2 font-mono text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Traversal Time: {traceResult.executionTimeMs}ms (BFS)</span>
                </div>
              )}
            </div>

            {/* Trace Controls */}
            <div className="p-4 rounded-xl bg-ide-panel border border-ide-border flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Target Function:</span>
                <input
                  type="text"
                  value={traceSymbol}
                  onChange={(e) => setTraceSymbol(e.target.value)}
                  className="bg-code px-3 py-1.5 rounded border border-ide-border text-slate-100 focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Direction:</span>
                <div className="flex rounded border border-ide-border overflow-hidden">
                  <button
                    onClick={() => setTraceDirection('inbound')}
                    className={`px-3 py-1.5 transition-colors ${
                      traceDirection === 'inbound' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    Inbound (Callers)
                  </button>
                  <button
                    onClick={() => setTraceDirection('outbound')}
                    className={`px-3 py-1.5 transition-colors ${
                      traceDirection === 'outbound' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    Outbound (Callees)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Max Depth:</span>
                <select
                  value={traceDepth}
                  onChange={(e) => setTraceDepth(Number(e.target.value))}
                  className="bg-code px-2.5 py-1.5 rounded border border-ide-border text-slate-100"
                >
                  <option value={1}>1 level</option>
                  <option value={2}>2 levels</option>
                  <option value={3}>3 levels</option>
                  <option value={5}>5 levels</option>
                </select>
              </div>

              <button
                onClick={handleRunTrace}
                disabled={isTracingPath}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors ml-auto shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isTracingPath ? 'Tracing BFS...' : 'Execute BFS Trace'}</span>
              </button>
            </div>

            {/* Trace Output Tree */}
            {traceResult && (
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                  Traced Path Hierarchy ({traceResult.direction.toUpperCase()} from {traceResult.symbol})
                </h3>

                <div className="space-y-2">
                  {traceResult.paths.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-ide-panel border border-ide-border hover:border-amber-500/40 transition-all flex items-center justify-between font-mono text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                          0{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-200 font-bold">{p.source}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-400">
                              {p.edge}
                            </span>
                            <span className="text-cyan-300 font-bold">{p.target}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {p.file} <span className="text-slate-500">(Line {p.line})</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenInEditor(p.file)}
                        className="px-3 py-1 rounded bg-ide-card hover:bg-ide-hover border border-ide-border text-slate-300 hover:text-white transition-colors"
                      >
                        Inspect Line →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Louvain Community Clusters View */}
        {graphTab === 'clusters' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="pb-3 border-b border-ide-border">
              <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Louvain Community Detection (`get_architecture`)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Automatic modular decomposition of the codebase by clustering call graph edge density into cohesive functional communities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-ide-panel border border-purple-500/40 space-y-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-purple-300 font-bold">Cluster 1: Billing & Payments</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">Cohesion: 94%</span>
                </div>
                <p className="text-xs text-slate-400">
                  Encapsulates financial charge logic, card verification, and external payment gateway MCP bindings.
                </p>
                <div className="space-y-1 font-mono text-[11px] text-slate-300 pt-2 border-t border-ide-border">
                  <div>• processPayment() (Function)</div>
                  <div>• validateCard() (Function)</div>
                  <div>• paymentService.ts (File)</div>
                  <div>• POST /api/v2/charge (Route)</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-ide-panel border border-blue-500/40 space-y-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-blue-300 font-bold">Cluster 2: Client Experience & Cart</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">Cohesion: 91%</span>
                </div>
                <p className="text-xs text-slate-400">
                  User interface components and local client state stores for order assembly and user confirmation.
                </p>
                <div className="space-y-1 font-mono text-[11px] text-slate-300 pt-2 border-t border-ide-border">
                  <div>• CheckoutPage.tsx (Component)</div>
                  <div>• cartStore.ts (State Store)</div>
                  <div>• orderService.ts (Service)</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-ide-panel border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-emerald-300 font-bold">Cluster 3: Identity & Authentication</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Cohesion: 88%</span>
                </div>
                <p className="text-xs text-slate-400">
                  Token validation, session management, and credential lifecycle enforcement.
                </p>
                <div className="space-y-1 font-mono text-[11px] text-slate-300 pt-2 border-t border-ide-border">
                  <div>• authService.ts (Service)</div>
                  <div>• SessionManager (Class)</div>
                  <div>• LoginPage.tsx (Component)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
