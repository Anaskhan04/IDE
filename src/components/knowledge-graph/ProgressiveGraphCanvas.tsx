import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  Crosshair,
  Eye,
  EyeOff,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { GraphEdge, GraphNode, ProjectFile } from '../../types/ide';
import type {
  AggregatedGraphEdge,
  GraphExplorationMode,
  GraphLayoutResult,
  PositionedGraphNode,
} from '../../utils/graphLayout';
import { computeElkLayeredLayout } from '../../utils/elkGraphLayout';
import { parseWorkspaceDragPayload } from '../../utils/workspaceDragDrop';
import { SemanticGraphNode, type SemanticNodeData } from './SemanticGraphNode';
import { SemanticGraphEdge, type SemanticEdgeData } from './SemanticGraphEdge';
import { Button, IconButton } from '../ui';

interface ProgressiveGraphCanvasProps {
  allNodes: GraphNode[];
  allEdges: GraphEdge[];
  files: ProjectFile[];
  workspaceDragId: string;
  layoutResult: GraphLayoutResult;
  explorationMode: GraphExplorationMode;
  onChangeMode: (mode: GraphExplorationMode) => void;
  focusDepth: 1 | 2 | 3;
  onChangeFocusDepth: (depth: 1 | 2 | 3) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  focusedNodeId: string | null;
  scopedGroupKey: string | null;
  onEnterScopedGroup: (groupKey: string) => void;
  onExitScopedGroup: () => void;
  onSelectNode: (node: PositionedGraphNode | null) => void;
  onSelectEdge: (edge: AggregatedGraphEdge | null) => void;
  onOpenFile: (node: GraphNode) => void;
  onOpenSourceLocation: (filePath: string, line?: number) => void;
  onRevealInExplorer: (node: GraphNode) => void;
  onAddToAiContext: (node: GraphNode) => void;
  onAnalyzeImpact: (node: GraphNode) => void;
  onTraceCalls: (node: GraphNode) => void;
  onDropWorkspaceFile: (file: ProjectFile) => void;
  onToggleGroup: (groupKey: string) => void;
  onToggleFile: (fileId: string) => void;
  onShowMoreInGroup: (groupKey: string) => void;
  onExpandAllGroups: () => void;
  onCollapseAllGroups: () => void;
  expandedGroupKeys: Set<string>;
  expandedFileIds: Set<string>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLocateSearchMatch?: (node: GraphNode) => void;
  edgeTypeFilter: 'all' | 'IMPORTS' | 'CALLS';
  onEdgeTypeFilterChange: (filter: 'all' | 'IMPORTS' | 'CALLS') => void;
  hideGenerated: boolean;
  onToggleHideGenerated: () => void;
  generatedCount: number;
  onFocusNode: (node: GraphNode) => void;
  initialViewport?: { x: number; y: number; zoom: number } | null;
  onViewportChange?: (viewport: { x: number; y: number; zoom: number } | null) => void;
  manualPositionsRecord?: Record<string, { x: number; y: number }>;
  onManualPositionsChange?: (positions: Record<string, { x: number; y: number }>) => void;
  onOpenGuide?: () => void;
}

const nodeTypes = {
  semanticNode: SemanticGraphNode,
};

const edgeTypes = {
  semanticEdge: SemanticGraphEdge,
};

const ProgressiveGraphCanvasInner: React.FC<ProgressiveGraphCanvasProps> = ({
  allNodes,
  allEdges,
  files,
  workspaceDragId,
  layoutResult,
  explorationMode,
  onChangeMode,
  focusDepth,
  onChangeFocusDepth,
  selectedNodeId,
  selectedEdgeId,
  focusedNodeId,
  scopedGroupKey,
  onEnterScopedGroup,
  onExitScopedGroup,
  onSelectNode,
  onSelectEdge,
  onOpenFile,
  onOpenSourceLocation,
  onRevealInExplorer,
  onAddToAiContext,
  onAnalyzeImpact,
  onTraceCalls,
  onDropWorkspaceFile,
  onToggleGroup,
  onToggleFile,
  onShowMoreInGroup,
  onExpandAllGroups,
  onCollapseAllGroups,
  expandedGroupKeys,
  expandedFileIds,
  searchQuery,
  onSearchChange,
  onLocateSearchMatch,
  edgeTypeFilter,
  onEdgeTypeFilterChange,
  hideGenerated,
  onToggleHideGenerated,
  generatedCount,
  onFocusNode,
  initialViewport = null,
  onViewportChange,
  manualPositionsRecord,
  onManualPositionsChange,
  onOpenGuide,
}) => {
  const rf = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutReqIdRef = useRef(0);
  const hoverNodeTimerRef = useRef<number | null>(null);

  const [elkPositioned, setElkPositioned] = useState<GraphLayoutResult | null>(null);
  const [layoutMs, setLayoutMs] = useState<number | null>(null);
  const [localManualPositions, setLocalManualPositions] = useState<Map<string, { x: number; y: number }>>(() => new Map());
  const manualPositions = useMemo(
    () => (manualPositionsRecord ? new Map(Object.entries(manualPositionsRecord)) : localManualPositions),
    [manualPositionsRecord, localManualPositions]
  );
  const updateManualPositions = (updater: (prev: Map<string, { x: number; y: number }>) => Map<string, { x: number; y: number }>) => {
    const next = updater(manualPositions);
    if (onManualPositionsChange) {
      onManualPositionsChange(Object.fromEntries(next.entries()));
    } else {
      setLocalManualPositions(next);
    }
  };
  const [zoomPct, setZoomPct] = useState(() => (initialViewport ? Math.round(initialViewport.zoom * 100) : 92));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dropState, setDropState] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [dropNotice, setDropNotice] = useState<string | null>(null);

  const [hoveredNodePreview, setHoveredNodePreview] = useState<{
    node: PositionedGraphNode;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredEdgePreview, setHoveredEdgePreview] = useState<{
    edge: AggregatedGraphEdge;
    x: number;
    y: number;
  } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    kind: 'node' | 'edge';
    node?: PositionedGraphNode;
    edge?: AggregatedGraphEdge;
  } | null>(null);

  // Clear manual node drag offsets only when mode/scope changes after mount
  const prevManualScopeRef = useRef<string>(`${explorationMode}:${scopedGroupKey || ''}`);
  useEffect(() => {
    const sig = `${explorationMode}:${scopedGroupKey || ''}`;
    if (prevManualScopeRef.current !== sig) {
      prevManualScopeRef.current = sig;
      updateManualPositions(() => new Map());
    }
  }, [explorationMode, scopedGroupKey]);

  useEffect(() => {
    if (explorationMode === 'focus' && !scopedGroupKey) {
      setElkPositioned(null);
      return;
    }
    if (layoutResult.nodes.length === 0) {
      setElkPositioned(layoutResult);
      return;
    }

    const reqId = ++layoutReqIdRef.current;
    let cancelled = false;

    computeElkLayeredLayout(layoutResult.nodes, layoutResult.edges)
      .then(({ result, metrics }) => {
        if (cancelled || layoutReqIdRef.current !== reqId) return;
        setElkPositioned(result);
        setLayoutMs(metrics.layoutTimeMs);
      })
      .catch(() => {
        if (!cancelled && layoutReqIdRef.current === reqId) {
          setElkPositioned(layoutResult);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [layoutResult, explorationMode, scopedGroupKey]);

  const activeLayout = useMemo(() => {
    const base =
      explorationMode === 'focus' && !scopedGroupKey
        ? layoutResult
        : elkPositioned && elkPositioned.nodes.length === layoutResult.nodes.length
          ? elkPositioned
          : layoutResult;

    if (manualPositions.size === 0) return base;
    return {
      ...base,
      nodes: base.nodes.map((n) => {
        const override = manualPositions.get(n.id);
        return override ? { ...n, x: override.x, y: override.y } : n;
      }),
    };
  }, [elkPositioned, layoutResult, explorationMode, scopedGroupKey, manualPositions]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, PositionedGraphNode>();
    activeLayout.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [activeLayout.nodes]);

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null;
  const selectedEdge = useMemo(
    () => (selectedEdgeId ? activeLayout.edges.find((e) => e.id === selectedEdgeId) ?? null : null),
    [selectedEdgeId, activeLayout.edges],
  );

  const connectedToSelection = useMemo(() => {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    if (selectedNodeId) {
      nodeIds.add(selectedNodeId);
      for (const e of activeLayout.edges) {
        if (e.source === selectedNodeId || e.target === selectedNodeId) {
          edgeIds.add(e.id);
          nodeIds.add(e.source);
          nodeIds.add(e.target);
        }
      }
    }
    if (selectedEdge) {
      edgeIds.add(selectedEdge.id);
      nodeIds.add(selectedEdge.source);
      nodeIds.add(selectedEdge.target);
    }
    return { nodeIds, edgeIds };
  }, [selectedNodeId, selectedEdge, activeLayout.edges]);

  const focusNeighborhood = useMemo(() => {
    if (explorationMode !== 'focus' || !focusedNodeId || !nodeMap.has(focusedNodeId)) {
      return null;
    }
    const ids = new Set<string>([focusedNodeId]);
    for (const e of activeLayout.edges) {
      if (e.source === focusedNodeId || e.target === focusedNodeId) {
        ids.add(e.source);
        ids.add(e.target);
      }
    }
    return ids;
  }, [explorationMode, focusedNodeId, activeLayout.edges, nodeMap]);

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allNodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.path.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [allNodes, searchQuery]);

  // Fit ONLY on initial mount (when no saved viewport exists) or explicit mode/scope transitions
  const prevScopeRef = useRef<string>(initialViewport ? `${explorationMode}:${scopedGroupKey || ''}` : '');
  useEffect(() => {
    const sig = `${explorationMode}:${scopedGroupKey || ''}`;
    if (prevScopeRef.current !== sig && activeLayout.nodes.length > 0) {
      prevScopeRef.current = sig;
      const timer = window.setTimeout(() => {
        rf.fitView({ padding: 0.22, duration: 180 });
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [explorationMode, scopedGroupKey, activeLayout.nodes.length, rf]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onEsc);
    };
  }, [contextMenu]);

  useEffect(() => {
    return () => {
      if (hoverNodeTimerRef.current) window.clearTimeout(hoverNodeTimerRef.current);
    };
  }, []);

  const handleNodeHover = (node: PositionedGraphNode | null, pos?: { x: number; y: number }) => {
    if (hoverNodeTimerRef.current) {
      window.clearTimeout(hoverNodeTimerRef.current);
      hoverNodeTimerRef.current = null;
    }
    if (!node || !pos) {
      setHoveredNodePreview(null);
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    const relX = rect ? pos.x - rect.left : pos.x;
    const relY = rect ? pos.y - rect.top : pos.y;
    hoverNodeTimerRef.current = window.setTimeout(() => {
      setHoveredNodePreview({ node, x: relX, y: relY });
    }, 360);
  };

  const handleEdgeHover = (edge: AggregatedGraphEdge | null, pos?: { x: number; y: number }) => {
    if (!edge || !pos) {
      setHoveredEdgePreview(null);
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    setHoveredEdgePreview({
      edge,
      x: rect ? pos.x - rect.left : pos.x,
      y: rect ? pos.y - rect.top : pos.y,
    });
  };

  const handleDoubleClickEdge = (edge: AggregatedGraphEdge) => {
    onSelectEdge(edge);
    const list = edge.underlyingEdges || [];
    if (list.length === 1 && list[0].sourceFilePath) {
      onOpenSourceLocation(list[0].sourceFilePath, list[0].sourceLine);
    }
  };

  const showEdgeLabelsByDefault =
    activeLayout.edges.length <= 20 || explorationMode === 'focus' || Boolean(scopedGroupKey);
  const showMinimap = activeLayout.nodes.length > 18;

  const rfNodes: Node<SemanticNodeData>[] = useMemo(() => {
    return activeLayout.nodes.map((n) => {
      const isSelected = selectedNodeId === n.id;
      const isExpanded = Boolean(n.isExpanded);
      const isRelated =
        (selectedNodeId !== null || selectedEdge !== null) &&
        connectedToSelection.nodeIds.has(n.id) &&
        !isSelected;
      const isDimmedByFocus = focusNeighborhood !== null && !focusNeighborhood.has(n.id);

      return {
        id: n.id,
        type: 'semanticNode',
        position: { x: n.x, y: n.y },
        initialWidth: n.width || (n.isGroup ? 240 : 220),
        initialHeight: n.height || (n.isGroup ? 74 : 56),
        data: {
          node: n,
          isSelected,
          isExpanded,
          isRelated,
          isDimmedByFocus,
          showFileExpandToggle: explorationMode === 'overview' && !scopedGroupKey,
          onSelect: (clicked) => {
            onSelectEdge(null);
            onSelectNode(clicked);
          },
          onDoubleClickNode: (clicked) => {
            if (clicked.isGroup && clicked.groupKey) {
              onToggleGroup(clicked.groupKey);
            } else {
              onOpenFile(clicked);
            }
          },
          onToggleGroup,
          onToggleFile,
          onShowMore: onShowMoreInGroup,
        },
        selected: isSelected,
        draggable: true,
      };
    });
  }, [
    activeLayout.nodes,
    selectedNodeId,
    selectedEdge,
    connectedToSelection.nodeIds,
    focusNeighborhood,
    explorationMode,
    scopedGroupKey,
    onSelectNode,
    onSelectEdge,
    onOpenFile,
    onToggleGroup,
    onToggleFile,
    onShowMoreInGroup,
  ]);

  const rfEdges: Edge<SemanticEdgeData>[] = useMemo(() => {
    return activeLayout.edges.map((e: AggregatedGraphEdge) => {
      const isSelected = selectedEdgeId === e.id;
      const isHighlighted =
        isSelected ||
        ((selectedNodeId !== null || selectedEdge !== null) && connectedToSelection.edgeIds.has(e.id));
      const isContains = e.edgeKind === 'contains' || e.type === 'CONTAINS';
      const showLabel = isSelected || isHighlighted || (!isContains && showEdgeLabelsByDefault);
      const srcNode = nodeMap.get(e.source);
      const tgtNode = nodeMap.get(e.target);

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'semanticEdge',
        markerEnd: isContains
          ? undefined
          : {
              type: MarkerType.ArrowClosed,
              width: 14,
              height: 14,
              color: isSelected || isHighlighted
                ? 'rgb(var(--ide-focus))'
                : e.type === 'CALLS'
                  ? 'rgb(var(--graph-class))'
                  : e.type === 'TEST_REFERENCE'
                    ? 'rgb(var(--graph-test))'
                    : 'rgb(var(--graph-file))',
            },
        data: {
          edge: e,
          isSelected,
          isHighlighted,
          showLabel,
          sourceLabel: srcNode?.label || e.source,
          targetLabel: tgtNode?.label || e.target,
          onSelectEdge: (clickedEdge) => {
            onSelectNode(null);
            onSelectEdge(clickedEdge);
          },
          onHoverEdge: handleEdgeHover,
          onDoubleClickEdge: handleDoubleClickEdge,
        },
      };
    });
  }, [
    activeLayout.edges,
    selectedEdgeId,
    selectedNodeId,
    selectedEdge,
    connectedToSelection.edgeIds,
    showEdgeLabelsByDefault,
    nodeMap,
    onSelectEdge,
    onSelectNode,
  ]);

  const modes: { id: GraphExplorationMode; label: string; disabled?: boolean }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'files', label: 'Files' },
    { id: 'symbols', label: 'Symbols' },
    { id: 'focus', label: 'Focus', disabled: !focusedNodeId && !selectedNode },
  ];

  // Compute node hover stats from authoritative graphEdges
  const hoveredNodeStats = useMemo(() => {
    if (!hoveredNodePreview) return null;
    const n = hoveredNodePreview.node;
    const incoming = allEdges.filter((e) => e.target === n.id && String(e.type) !== 'CONTAINS').length;
    const outgoing = allEdges.filter((e) => e.source === n.id && String(e.type) !== 'CONTAINS').length;
    const definedCount =
      n.type === 'File' || n.type === 'Test'
        ? allNodes.filter((s) => s.id !== n.id && s.path === n.path && s.type !== 'File').length
        : 0;
    return { incoming, outgoing, definedCount };
  }, [hoveredNodePreview, allEdges, allNodes]);

  return (
    <div
      className={`relative flex min-h-0 flex-1 flex-col overflow-hidden bg-ide-bg ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Single Compact Exploration Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ide-border bg-ide-panel px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {scopedGroupKey ? (
            <div className="inline-flex items-center gap-1.5 rounded-ide-control border border-ide-border-strong bg-ide-shell px-2 py-1 text-xs">
              <button
                type="button"
                onClick={onExitScopedGroup}
                className="ide-focus-ring inline-flex items-center gap-1 rounded-ide-small px-1.5 py-0.5 text-ide-muted hover:bg-ide-hover hover:text-ide-text"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Overview</span>
              </button>
              <span className="text-ide-subtle">/</span>
              <span className="font-mono font-semibold text-ide-strong">{scopedGroupKey}</span>
            </div>
          ) : (
            <div
              className="inline-flex items-center rounded-ide-control border border-ide-border bg-ide-shell p-0.5"
              role="group"
              aria-label="Graph exploration mode"
            >
              {modes.map((m) => {
                const active = explorationMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={m.disabled}
                    onClick={() => {
                      if (m.id === 'focus' && selectedNode && !selectedNode.isGroup) {
                        onFocusNode(selectedNode);
                      } else {
                        onChangeMode(m.id);
                      }
                    }}
                    className={`ide-focus-ring rounded-ide-small px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-ide-selected text-ide-strong'
                        : m.disabled
                          ? 'cursor-not-allowed text-ide-subtle opacity-50'
                          : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          )}

          {explorationMode === 'focus' && !scopedGroupKey && (
            <div className="inline-flex items-center gap-1 rounded-ide-control border border-ide-border bg-ide-shell px-2 py-0.5 text-xs">
              <Crosshair className="h-3.5 w-3.5 text-ide-focus" aria-hidden="true" />
              <span className="text-ide-muted">Depth</span>
              {([1, 2, 3] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChangeFocusDepth(d)}
                  className={`ide-focus-ring rounded-ide-small px-1.5 py-0.5 font-mono text-[11px] ${
                    focusDepth === d ? 'bg-ide-focus text-ide-onAccent' : 'text-ide-muted hover:bg-ide-hover'
                  }`}
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onChangeMode('overview')}
                className="ide-focus-ring ml-1 rounded-ide-small px-1.5 py-0.5 text-[11px] text-ide-muted hover:bg-ide-hover hover:text-ide-text"
              >
                Overview
              </button>
            </div>
          )}

          {/* Search & locate */}
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-ide-subtle" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchMatches.length > 0 && onLocateSearchMatch) {
                  e.preventDefault();
                  onLocateSearchMatch(searchMatches[0]);
                }
              }}
              placeholder="Find file, symbol, folder..."
              aria-label="Search graph nodes"
              className="ide-focus-ring h-7 w-48 rounded-ide-control border border-ide-border-strong bg-ide-bg pl-8 pr-2 text-xs text-ide-text placeholder:text-ide-subtle"
            />
            {searchQuery.trim() && searchMatches.length > 0 && onLocateSearchMatch && (
              <div
                className="absolute left-0 top-8 z-30 w-64 rounded-ide-panel border border-ide-border-strong bg-ide-panel p-1 shadow-lg"
                role="listbox"
                aria-label="Matching graph nodes"
              >
                {searchMatches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onLocateSearchMatch(m)}
                    className="ide-focus-ring flex w-full items-center justify-between gap-2 rounded-ide-small px-2 py-1.5 text-left text-xs hover:bg-ide-hover"
                  >
                    <span className="truncate font-medium text-ide-strong">{m.label}</span>
                    <span className="truncate font-mono text-[10px] text-ide-subtle">{m.path}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <select
            aria-label="Filter graph relationships"
            value={edgeTypeFilter}
            onChange={(e) => onEdgeTypeFilterChange(e.target.value as 'all' | 'IMPORTS' | 'CALLS')}
            className="ide-focus-ring h-7 rounded-ide-control border border-ide-border-strong bg-ide-bg px-2 text-xs text-ide-text"
          >
            <option value="all">All relationships</option>
            <option value="IMPORTS">Imports only</option>
            <option value="CALLS">Calls only</option>
          </select>

          {explorationMode === 'overview' && !scopedGroupKey && (
            <div className="inline-flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={onExpandAllGroups}>
                Expand all
              </Button>
              {expandedGroupKeys.size > 0 && (
                <Button size="sm" variant="ghost" onClick={onCollapseAllGroups}>
                  Collapse
                </Button>
              )}
            </div>
          )}

          {generatedCount > 0 && (
            <button
              type="button"
              onClick={onToggleHideGenerated}
              aria-pressed={hideGenerated}
              className={`ide-focus-ring inline-flex h-7 items-center gap-1 rounded-ide-control border px-2 text-xs transition-colors ${
                hideGenerated
                  ? 'border-ide-border bg-ide-shell text-ide-muted hover:text-ide-text'
                  : 'border-ide-focus bg-ide-selected text-ide-strong'
              }`}
              title="Toggle generated or migration files"
            >
              {hideGenerated ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>{hideGenerated ? `Hidden (${generatedCount})` : 'Generated shown'}</span>
            </button>
          )}
        </div>

        {/* Zoom, Fit, Reset, Fullscreen */}
        <div className="flex items-center gap-1">
          <IconButton label="Zoom out" size="sm" onClick={() => rf.zoomOut({ duration: 150 })}>
            <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
          <span className="min-w-[40px] text-center font-mono text-[11px] text-ide-muted">{zoomPct}%</span>
          <IconButton label="Zoom in" size="sm" onClick={() => rf.zoomIn({ duration: 150 })}>
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
          <Button size="sm" variant="ghost" onClick={() => rf.fitView({ padding: 0.22, duration: 180 })} title="Fit graph to viewport">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Fit</span>
          </Button>
          <IconButton
            label="Reset view"
            size="sm"
            onClick={() => {
              onSearchChange('');
              onEdgeTypeFilterChange('all');
              onSelectNode(null);
              onSelectEdge(null);
              updateManualPositions(() => new Map());
              onViewportChange?.(null);
              if (scopedGroupKey) onExitScopedGroup();
              else if (explorationMode === 'focus') onChangeMode('overview');
              rf.fitView({ padding: 0.22, duration: 180 });
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
          {onOpenGuide && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onOpenGuide}
              title="Open Knowledge Graph Guide"
              data-testid="graph-guide-button"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Guide</span>
            </Button>
          )}
          <IconButton
            label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen graph'}
            size="sm"
            onClick={() => setIsFullscreen((v) => !v)}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
          </IconButton>
        </div>
      </div>

      {/* React Flow Interactive Canvas + Explorer-to-Graph Drop Target */}
      <div
        ref={containerRef}
        data-testid="graph-drop-zone"
        onDragOver={(e) => {
          e.preventDefault();
          setDropState('valid');
        }}
        onDragLeave={() => setDropState('idle')}
        onDrop={(e) => {
          e.preventDefault();
          setDropState('idle');
          const parsed = parseWorkspaceDragPayload(e.dataTransfer, workspaceDragId, files);
          if (!parsed.valid) {
            setDropState('invalid');
            setDropNotice(parsed.reason);
            window.setTimeout(() => {
              setDropState('idle');
              setDropNotice(null);
            }, 2200);
            return;
          }
          if (parsed.file) {
            onDropWorkspaceFile(parsed.file);
            setDropNotice(`Revealed ${parsed.file.path}`);
            window.setTimeout(() => setDropNotice(null), 1800);
          }
        }}
        className={`relative min-h-[420px] flex-1 bg-ide-bg transition-colors ${
          dropState === 'valid'
            ? 'ring-2 ring-inset ring-ide-focus'
            : dropState === 'invalid'
              ? 'ring-2 ring-inset ring-ide-rose'
              : ''
        }`}
      >
        {dropNotice && (
          <div
            role="status"
            className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-ide-panel border border-ide-borderStrong bg-ide-panel px-3 py-1.5 text-xs font-medium text-ide-strong shadow-md"
          >
            {dropNotice}
          </div>
        )}

        {activeLayout.nodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <Layers className="h-8 w-8 text-ide-subtle" aria-hidden="true" />
            <p className="text-sm font-medium text-ide-strong">No graph nodes match the current filter</p>
            <p className="max-w-md text-xs text-ide-muted">
              Try switching back to Overview mode, clearing your search query, or changing the relationship filter.
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onSearchChange('');
                onEdgeTypeFilterChange('all');
                if (scopedGroupKey) onExitScopedGroup();
                onChangeMode('overview');
              }}
            >
              Reset to Overview
            </Button>
          </div>
        ) : (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            minZoom={0.18}
            maxZoom={2.5}
            nodesConnectable={false}
            zoomOnDoubleClick={false}
            elementsSelectable
            defaultViewport={initialViewport ?? undefined}
            fitView={!initialViewport}
            fitViewOptions={{ padding: 0.22 }}
            onMoveEnd={(_evt, viewport) => {
              setZoomPct(Math.round(viewport.zoom * 100));
              onViewportChange?.({ x: viewport.x, y: viewport.y, zoom: viewport.zoom });
            }}
            onPaneClick={() => {
              setContextMenu(null);
              onSelectNode(null);
              onSelectEdge(null);
            }}
            onNodeMouseEnter={(event, rfNode) => {
              const gNode = nodeMap.get(rfNode.id);
              if (gNode) handleNodeHover(gNode, { x: event.clientX, y: event.clientY });
            }}
            onNodeMouseLeave={() => {
              handleNodeHover(null);
            }}
            onNodeDragStop={(_evt, rfNode) => {
              // Visual-only node repositioning; never mutates source files on disk
              updateManualPositions((prev) => {
                const next = new Map(prev);
                next.set(rfNode.id, { x: Math.round(rfNode.position.x), y: Math.round(rfNode.position.y) });
                return next;
              });
            }}
            onNodeContextMenu={(event, rfNode) => {
              event.preventDefault();
              const gNode = nodeMap.get(rfNode.id);
              if (!gNode) return;
              onSelectEdge(null);
              onSelectNode(gNode);
              const rect = containerRef.current?.getBoundingClientRect();
              setContextMenu({
                x: rect ? event.clientX - rect.left : 120,
                y: rect ? event.clientY - rect.top : 120,
                kind: 'node',
                node: gNode,
              });
            }}
            onEdgeContextMenu={(event, rfEdge) => {
              event.preventDefault();
              const gEdge = activeLayout.edges.find((e) => e.id === rfEdge.id);
              if (!gEdge) return;
              onSelectNode(null);
              onSelectEdge(gEdge);
              const rect = containerRef.current?.getBoundingClientRect();
              setContextMenu({
                x: rect ? event.clientX - rect.left : 120,
                y: rect ? event.clientY - rect.top : 120,
                kind: 'edge',
                edge: gEdge,
              });
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={22}
              size={1}
              color="rgb(var(--ide-border))"
            />
            {showMinimap && (
              <MiniMap
                ariaLabel="Graph minimap"
                pannable
                zoomable
                nodeColor={(n) =>
                  n.selected ? 'rgb(var(--ide-focus))' : 'rgb(var(--ide-text-subtle))'
                }
                maskColor="rgb(var(--ide-bg) / 0.65)"
                className="!rounded-ide-panel !border !border-ide-border-strong !bg-ide-panel/95"
              />
            )}
          </ReactFlow>
        )}

        {/* Viewport-aware Node Hover Preview */}
        {hoveredNodePreview && hoveredNodeStats && !contextMenu && (
          <div
            role="tooltip"
            data-testid="node-hover-preview"
            style={{
              left: Math.min(Math.max(12, hoveredNodePreview.x + 14), 560),
              top: Math.min(Math.max(12, hoveredNodePreview.y + 14), 340),
            }}
            className="pointer-events-none absolute z-30 w-64 rounded-ide-panel border border-ide-borderStrong bg-ide-panel p-2.5 shadow-lg"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold text-ide-strong">
                {hoveredNodePreview.node.label}
              </span>
              <span className="rounded bg-ide-surface px-1.5 py-0.5 text-[10px] font-medium text-ide-muted">
                {hoveredNodePreview.node.isGroup ? 'Module' : hoveredNodePreview.node.type}
              </span>
            </div>
            <div className="mt-0.5 truncate font-mono text-[10px] text-ide-subtle">
              {hoveredNodePreview.node.path}
              {hoveredNodePreview.node.line ? `:${hoveredNodePreview.node.line}` : ''}
            </div>
            <div className="mt-2 flex items-center gap-3 border-t border-ide-border pt-1.5 font-mono text-[10px] text-ide-muted">
              <span>In: {hoveredNodeStats.incoming}</span>
              <span>Out: {hoveredNodeStats.outgoing}</span>
              {hoveredNodePreview.node.isGroup ? (
                <span>{hoveredNodePreview.node.fileCount || 0} files</span>
              ) : hoveredNodeStats.definedCount > 0 ? (
                <span>{hoveredNodeStats.definedCount} symbols</span>
              ) : null}
            </div>
          </div>
        )}

        {/* Viewport-aware Edge Hover Preview */}
        {hoveredEdgePreview && !contextMenu && (
          <div
            role="tooltip"
            data-testid="edge-hover-preview"
            style={{
              left: Math.min(Math.max(12, hoveredEdgePreview.x + 12), 540),
              top: Math.min(Math.max(12, hoveredEdgePreview.y + 12), 360),
            }}
            className="pointer-events-none absolute z-30 max-w-xs rounded-ide-panel border border-ide-borderStrong bg-ide-panel p-2.5 shadow-lg"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ide-strong">
              <span className="truncate">{nodeMap.get(hoveredEdgePreview.edge.source)?.label || hoveredEdgePreview.edge.source}</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-ide-focus" aria-hidden="true" />
              <span className="truncate">{nodeMap.get(hoveredEdgePreview.edge.target)?.label || hoveredEdgePreview.edge.target}</span>
            </div>
            <div className="mt-1 font-mono text-[10px] text-ide-muted">
              {hoveredEdgePreview.edge.label || hoveredEdgePreview.edge.type}
            </div>
            <div className="mt-1 text-[10px] text-ide-subtle">Click to inspect source evidence</div>
          </div>
        )}

        {/* Right-click context menu */}
        {contextMenu && (
          <div
            role="menu"
            style={{ left: Math.min(contextMenu.x, 680), top: Math.min(contextMenu.y, 340) }}
            className="absolute z-40 min-w-[188px] rounded-ide-panel border border-ide-borderStrong bg-ide-panel p-1 shadow-lg"
          >
            {contextMenu.kind === 'edge' && contextMenu.edge ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSelectEdge(contextMenu.edge!);
                    setContextMenu(null);
                  }}
                  className="ide-focus-ring flex w-full items-center rounded-ide-small px-2.5 py-1.5 text-left text-xs text-ide-text hover:bg-ide-hover"
                >
                  Inspect relationships
                </button>
                {contextMenu.edge.underlyingEdges?.[0]?.sourceFilePath && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      const first = contextMenu.edge!.underlyingEdges![0];
                      onOpenSourceLocation(first.sourceFilePath!, first.sourceLine);
                      setContextMenu(null);
                    }}
                    className="ide-focus-ring flex w-full items-center rounded-ide-small px-2.5 py-1.5 text-left text-xs text-ide-text hover:bg-ide-hover"
                  >
                    Open source evidence
                  </button>
                )}
              </>
            ) : contextMenu.node?.isGroup && contextMenu.node.groupKey ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleGroup(contextMenu.node!.groupKey!);
                    setContextMenu(null);
                  }}
                  className="ide-focus-ring flex w-full items-center rounded-ide-small px-2.5 py-1.5 text-left text-xs text-ide-text hover:bg-ide-hover"
                >
                  {contextMenu.node.isExpanded ? 'Collapse group' : 'Expand group'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onEnterScopedGroup(contextMenu.node!.groupKey!);
                    setContextMenu(null);
                  }}
                  className="ide-focus-ring flex w-full items-center rounded-ide-small px-2.5 py-1.5 text-left text-xs text-ide-text hover:bg-ide-hover"
                >
                  Explore group
                </button>
              </>
            ) : contextMenu.node ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onOpenFile(contextMenu.node!);
                    setContextMenu(null);
                  }}
                  className="ide-focus-ring flex w-full items-center rounded-ide-small px-2.5 py-1.5 text-left text-xs text-ide-text hover:bg-ide-hover"
                >
                  {contextMenu.node.type === 'File' || contextMenu.node.type === 'Test'
                    ? 'Open in editor'
                    : 'Go to definition'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onRevealInExplorer(contextMenu.node!);
                    setContextMenu(null);
                  }}
                  className="ide-focus-ring flex w-full items-center rounded-ide-small px-2.5 py-1.5 text-left text-xs text-ide-text hover:bg-ide-hover"
                >
                  Reveal in Explorer
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onFocusNode(contextMenu.node!);
                    setContextMenu(null);
                  }}
                  className="ide-focus-ring flex w-full items-center rounded-ide-small px-2.5 py-1.5 text-left text-xs text-ide-text hover:bg-ide-hover"
                >
                  Focus relationships
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onTraceCalls(contextMenu.node!);
                    setContextMenu(null);
                  }}
                  className="ide-focus-ring flex w-full items-center rounded-ide-small px-2.5 py-1.5 text-left text-xs text-ide-text hover:bg-ide-hover"
                >
                  Trace calls
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onAnalyzeImpact(contextMenu.node!);
                    setContextMenu(null);
                  }}
                  className="ide-focus-ring flex w-full items-center rounded-ide-small px-2.5 py-1.5 text-left text-xs text-ide-text hover:bg-ide-hover"
                >
                  Analyze impact
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onAddToAiContext(contextMenu.node!);
                    setContextMenu(null);
                  }}
                  className="ide-focus-ring flex w-full items-center rounded-ide-small px-2.5 py-1.5 text-left text-xs text-ide-text hover:bg-ide-hover"
                >
                  Add to AI context
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    navigator.clipboard?.writeText(contextMenu.node!.path).catch(() => {});
                    setContextMenu(null);
                  }}
                  className="ide-focus-ring flex w-full items-center rounded-ide-small px-2.5 py-1.5 text-left text-xs text-ide-text hover:bg-ide-hover"
                >
                  Copy source path
                </button>
              </>
            ) : null}
          </div>
        )}

        {/* Bottom Semantic Relationship Legend */}
        <div
          className="pointer-events-auto absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-3 rounded-ide-panel border border-ide-border bg-ide-panel/95 px-3 py-1.5 text-[11px] text-ide-muted shadow-sm"
          aria-label="Graph legend"
        >
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 border-t-2" style={{ borderColor: 'rgb(var(--graph-file))' }} aria-hidden="true" />
            Imports
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 border-t-2" style={{ borderColor: 'rgb(var(--graph-class))' }} aria-hidden="true" />
            Calls
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 border-t-2 border-dotted" style={{ borderColor: 'rgb(var(--graph-function))' }} aria-hidden="true" />
            Defines
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 border-t border-dashed border-ide-borderStrong" aria-hidden="true" />
            Contains
          </span>
          <span className="border-l border-ide-border pl-3 font-mono text-[10px] text-ide-text">
            {activeLayout.nodes.length} visible ({allNodes.length} total) · {activeLayout.edges.length} links ({allEdges.length} raw)
            {layoutMs !== null ? ` · ELK ${layoutMs}ms` : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export const ProgressiveGraphCanvas: React.FC<ProgressiveGraphCanvasProps> = (props) => (
  <ReactFlowProvider>
    <ProgressiveGraphCanvasInner {...props} />
  </ReactFlowProvider>
);
