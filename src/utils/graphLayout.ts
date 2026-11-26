import type { GraphEdge, GraphNode } from '../types/ide';

export type GraphExplorationMode = 'overview' | 'files' | 'symbols' | 'focus';

export type GraphEdgeKind = 'contains' | 'defines' | 'imports' | 'calls' | 'aggregate';

export interface PositionedGraphNode extends GraphNode {
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  isGroup?: boolean;
  isExpanded?: boolean;
  isExpandable?: boolean;
  groupKind?: 'folder' | 'architecture';
  groupKey?: string;
  parentGroupId?: string;
  parentGroupKey?: string;
  parentFileId?: string;
  fileCount?: number;
  symbolCount?: number;
  hiddenChildCount?: number;
  childIds?: string[];
  degree: number;
}

export interface AggregatedGraphEdge extends Omit<GraphEdge, 'type'> {
  type: GraphEdge['type'] | 'CONTAINS';
  weight: number;
  edgeKind: GraphEdgeKind;
  underlyingTypes?: string[];
  countsByType?: Record<string, number>;
  underlyingEdges?: GraphEdge[];
}

function formatEdgeTypeNoun(type: string, count: number): string {
  const upper = type.toUpperCase();
  const singular =
    upper === 'IMPORTS'
      ? 'import'
      : upper === 'CALLS'
        ? 'call'
        : upper === 'DEFINES'
          ? 'definition'
          : upper === 'EXTENDS'
            ? 'extends'
            : upper === 'IMPLEMENTS'
              ? 'implements'
              : upper === 'RENDERS'
                ? 'render'
                : upper === 'TYPE_REFERENCE'
                  ? 'type ref'
                  : upper === 'TEST_REFERENCE' || upper === 'TESTS'
                    ? 'test'
                    : upper === 'REFERENCES'
                      ? 'reference'
                      : type.toLowerCase();
  if (count === 1 || singular === 'extends' || singular === 'implements') {
    return `${count} ${singular}`;
  }
  return `${count} ${singular}s`;
}

/**
 * Formats an understandable summary label for aggregated directional edges
 * (e.g. "3 imports", "1 import · 2 calls", "4 relationships").
 */
export function formatAggregatedEdgeLabel(
  countsByType: Record<string, number>,
  totalWeight: number,
): string {
  const entries = Object.entries(countsByType).filter(([, c]) => c > 0);
  if (entries.length === 0) return totalWeight === 1 ? '1 relationship' : `${totalWeight} relationships`;
  if (entries.length === 1) {
    return formatEdgeTypeNoun(entries[0][0], entries[0][1]);
  }
  if (entries.length === 2) {
    return entries.map(([t, c]) => formatEdgeTypeNoun(t, c)).join(' · ');
  }
  return `${totalWeight} relationships`;
}

export interface GraphLayoutResult {
  nodes: PositionedGraphNode[];
  edges: AggregatedGraphEdge[];
  bounds: { width: number; height: number; minX: number; minY: number };
}

export interface GroupExpansionMeta {
  groupId: string;
  groupKey: string;
  label: string;
  kind: 'folder' | 'architecture';
  files: GraphNode[];
  symbolCount: number;
}

/**
 * Extracts a normalized folder key from a workspace path.
 * Preserves top-level and two-level folder distinctions (e.g. `idcard` vs `idcard/src`, `core`, `anas`).
 */
export function getFolderModuleKey(nodePath: string): { key: string; label: string; kind: 'folder' | 'architecture' } {
  const clean = (nodePath || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
  const parts = clean.split('/').filter(Boolean);
  if (parts.length >= 3) {
    const key = `${parts[0]}/${parts[1]}`;
    return { key, label: key, kind: 'folder' };
  }
  if (parts.length === 2) {
    return { key: parts[0], label: parts[0], kind: 'folder' };
  }
  return { key: 'root', label: 'root', kind: 'folder' };
}

export function classifyEdgeKind(edgeType: string): GraphEdgeKind {
  const upper = (edgeType || '').toUpperCase();
  if (upper === 'CONTAINS') return 'contains';
  if (upper === 'DEFINES') return 'defines';
  if (upper === 'CALLS') return 'calls';
  return 'imports';
}

/**
 * Collects folder/architecture group buckets from a list of graph nodes.
 */
export function collectArchitectureGroups(allNodes: GraphNode[]): Map<string, GroupExpansionMeta> {
  const fileNodes = allNodes.filter((n) => n.type === 'File' || n.type === 'Route' || n.type === 'Test');
  const symbolNodes = allNodes.filter((n) => n.type !== 'File' && n.type !== 'Route' && n.type !== 'Test');

  const groupBuckets = new Map<string, GroupExpansionMeta>();

  for (const fn of fileNodes) {
    const folder = getFolderModuleKey(fn.path);
    const bucketKey = folder.key !== 'root' ? folder.key : fn.architectureArea || 'root';
    const kind: 'folder' | 'architecture' =
      folder.key !== 'root' ? 'folder' : fn.architectureArea ? 'architecture' : 'folder';
    const label = folder.key !== 'root' ? folder.label : fn.architectureArea || 'root';

    let bucket = groupBuckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        groupId: `group:${bucketKey}`,
        groupKey: bucketKey,
        label,
        kind,
        files: [],
        symbolCount: 0,
      };
      groupBuckets.set(bucketKey, bucket);
    }
    bucket.files.push(fn);
  }

  for (const sym of symbolNodes) {
    const folder = getFolderModuleKey(sym.path);
    const bucketKey = folder.key !== 'root' ? folder.key : sym.architectureArea || 'root';
    const bucket = groupBuckets.get(bucketKey);
    if (bucket) {
      bucket.symbolCount += 1;
    }
  }

  return groupBuckets;
}

/**
 * Builds the Architecture Overview graph with PERSISTENT parent nodes:
 * - Every folder/architecture group ALWAYS remains visible in the graph.
 * - Expanded groups keep their parent node and reveal child file nodes beside them with `CONTAINS` edges.
 * - Expanded files (via `expandedFileIds`) additionally reveal their defined symbols with `DEFINES` edges.
 * - `CONTAINS` edges are purely visual hierarchy and never mutate underlying dependency edges.
 */
export function buildArchitectureOverview(
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  expandedGroupKeys: Set<string>,
  options?: {
    expandedFileIds?: Set<string>;
    groupRevealLimits?: Map<string, number>;
    defaultGroupLimit?: number;
  },
): { nodes: PositionedGraphNode[]; edges: AggregatedGraphEdge[] } {
  const expandedFileIds = options?.expandedFileIds ?? new Set<string>();
  const groupRevealLimits = options?.groupRevealLimits ?? new Map<string, number>();
  const defaultGroupLimit = options?.defaultGroupLimit ?? 16;

  const fileNodes = allNodes.filter((n) => n.type === 'File' || n.type === 'Route' || n.type === 'Test');
  const symbolNodes = allNodes.filter((n) => n.type !== 'File' && n.type !== 'Route' && n.type !== 'Test');
  const groupBuckets = collectArchitectureGroups(allNodes);

  const symbolsByFilePath = new Map<string, GraphNode[]>();
  for (const sym of symbolNodes) {
    const norm = (sym.path || '').replace(/\\/g, '/');
    const list = symbolsByFilePath.get(norm) || [];
    list.push(sym);
    symbolsByFilePath.set(norm, list);
  }

  const nodeToRep = new Map<string, string>();
  const overviewNodes: PositionedGraphNode[] = [];
  const hierarchyEdges: AggregatedGraphEdge[] = [];
  const fileByPath = new Map<string, GraphNode>();
  for (const fn of fileNodes) fileByPath.set((fn.path || '').replace(/\\/g, '/'), fn);

  for (const bucket of groupBuckets.values()) {
    const isExpanded = expandedGroupKeys.has(bucket.groupKey);
    const groupId = bucket.groupId;
    const limit = groupRevealLimits.get(bucket.groupKey) ?? defaultGroupLimit;
    const visibleFiles = isExpanded ? bucket.files.slice(0, limit) : [];
    const hiddenChildCount = isExpanded ? Math.max(0, bucket.files.length - visibleFiles.length) : 0;

    // 1. Always keep the persistent parent group node
    overviewNodes.push({
      id: groupId,
      label: bucket.label,
      type: 'Module',
      module: bucket.label,
      impactStatus: 'none',
      path: bucket.groupKey,
      architectureArea: bucket.kind === 'architecture' ? (bucket.label as GraphNode['architectureArea']) : undefined,
      x: 0,
      y: 0,
      width: 236,
      height: 74,
      layer: 0,
      isGroup: true,
      isExpanded,
      isExpandable: bucket.files.length > 0,
      groupKind: bucket.kind,
      groupKey: bucket.groupKey,
      fileCount: bucket.files.length,
      symbolCount: bucket.symbolCount,
      hiddenChildCount,
      childIds: bucket.files.map((f) => f.id),
      degree: 0,
    });

    // Map collapsed files to parent group; expanded files to themselves
    for (const fn of bucket.files) {
      if (isExpanded && visibleFiles.some((vf) => vf.id === fn.id)) {
        nodeToRep.set(fn.id, fn.id);
      } else {
        nodeToRep.set(fn.id, groupId);
      }
    }

    // 2. Add revealed children + CONTAINS edges when expanded
    if (isExpanded) {
      for (const fn of visibleFiles) {
        const normPath = (fn.path || '').replace(/\\/g, '/');
        const fileSymbols = symbolsByFilePath.get(normPath) || [];
        const isFileExpanded = expandedFileIds.has(fn.id);

        overviewNodes.push({
          ...fn,
          x: 0,
          y: 0,
          width: 214,
          height: 54,
          layer: 1,
          parentGroupId: groupId,
          parentGroupKey: bucket.groupKey,
          groupKey: bucket.groupKey,
          isExpanded: isFileExpanded,
          isExpandable: fileSymbols.length > 0,
          symbolCount: fileSymbols.length,
          degree: 0,
        });

        hierarchyEdges.push({
          id: `contains:${groupId}->${fn.id}`,
          source: groupId,
          target: fn.id,
          type: 'CONTAINS',
          label: 'contains',
          weight: 1,
          edgeKind: 'contains',
        });

        if (isFileExpanded) {
          for (const sym of fileSymbols) {
            nodeToRep.set(sym.id, sym.id);
            overviewNodes.push({
              ...sym,
              x: 0,
              y: 0,
              width: 204,
              height: 50,
              layer: 2,
              parentGroupId: groupId,
              parentGroupKey: bucket.groupKey,
              parentFileId: fn.id,
              degree: 0,
            });
            hierarchyEdges.push({
              id: `defines:${fn.id}->${sym.id}`,
              source: fn.id,
              target: sym.id,
              type: 'DEFINES',
              label: 'defines',
              weight: 1,
              edgeKind: 'defines',
            });
          }
        }
      }
    }
  }

  // Map unrevealed symbols to their parent file's representative (group or expanded file)
  for (const sym of symbolNodes) {
    if (nodeToRep.has(sym.id)) continue;
    const parentFile = fileByPath.get((sym.path || '').replace(/\\/g, '/'));
    if (parentFile && nodeToRep.has(parentFile.id)) {
      nodeToRep.set(sym.id, nodeToRep.get(parentFile.id)!);
    }
  }

  // Aggregate code dependency edges between visible representatives (strictly directional: A->B never merges with B->A)
  const edgeAgg = new Map<string, AggregatedGraphEdge>();
  for (const e of allEdges) {
    if (String(e.type) === 'CONTAINS') continue;
    const repSrc = nodeToRep.get(e.source);
    const repTgt = nodeToRep.get(e.target);
    if (!repSrc || !repTgt || repSrc === repTgt) continue;
    const aggKey = `${repSrc}->${repTgt}`;
    const existing = edgeAgg.get(aggKey);
    if (existing) {
      existing.weight += 1;
      existing.underlyingEdges = existing.underlyingEdges || [];
      existing.underlyingEdges.push(e);
      existing.countsByType = existing.countsByType || {};
      existing.countsByType[e.type] = (existing.countsByType[e.type] || 0) + 1;
      if (existing.underlyingTypes && !existing.underlyingTypes.includes(e.type)) {
        existing.underlyingTypes.push(e.type);
      }
      existing.label = formatAggregatedEdgeLabel(existing.countsByType, existing.weight);
      if (existing.underlyingTypes && existing.underlyingTypes.length > 1) {
        existing.edgeKind = 'aggregate';
      }
      if (e.isImpactPath) existing.isImpactPath = true;
    } else {
      const countsByType: Record<string, number> = { [e.type]: 1 };
      edgeAgg.set(aggKey, {
        id: `agg:${aggKey}`,
        source: repSrc,
        target: repTgt,
        type: e.type,
        label: e.label || formatAggregatedEdgeLabel(countsByType, 1),
        weight: 1,
        edgeKind: classifyEdgeKind(e.type),
        underlyingTypes: [e.type],
        countsByType,
        underlyingEdges: [e],
        sourceFilePath: e.sourceFilePath,
        sourceLine: e.sourceLine,
        resolutionStatus: e.resolutionStatus,
        evidence: e.evidence,
        isImpactPath: e.isImpactPath,
      });
    }
  }

  return { nodes: overviewNodes, edges: [...hierarchyEdges, ...Array.from(edgeAgg.values())] };
}

/**
 * Connected expansion layout for Architecture Overview:
 * 1. Lays out top-level parent nodes (groups) using deterministic hierarchical layout.
 * 2. Places each expanded group's children in a connected column immediately to the right of their parent.
 * 3. Places any expanded file's symbols immediately to the right of that file.
 * 4. Resolves vertical spacing cleanly so parents, children, and sibling groups never overlap.
 */
export function computeConnectedOverviewLayout(
  overviewNodes: PositionedGraphNode[],
  overviewEdges: AggregatedGraphEdge[],
): GraphLayoutResult {
  if (overviewNodes.length === 0) {
    return { nodes: [], edges: [], bounds: { width: 800, height: 500, minX: 0, minY: 0 } };
  }

  const topLevelNodes = overviewNodes.filter((n) => !n.parentGroupId);
  const childFilesByGroup = new Map<string, PositionedGraphNode[]>();
  const symbolsByFile = new Map<string, PositionedGraphNode[]>();

  for (const n of overviewNodes) {
    if (n.parentFileId) {
      const list = symbolsByFile.get(n.parentFileId) || [];
      list.push(n);
      symbolsByFile.set(n.parentFileId, list);
    } else if (n.parentGroupId) {
      const list = childFilesByGroup.get(n.parentGroupId) || [];
      list.push(n);
      childFilesByGroup.set(n.parentGroupId, list);
    }
  }

  // Dependency-only edges between top-level nodes for primary architectural flow
  const topIds = new Set(topLevelNodes.map((n) => n.id));
  const topEdges = overviewEdges.filter(
    (e) => e.edgeKind !== 'contains' && e.edgeKind !== 'defines' && topIds.has(e.source) && topIds.has(e.target),
  );

  // Compute generous vertical slots for top-level nodes that have expanded children
  const baseLayout = computeHierarchicalLayout(topLevelNodes, topEdges, {
    horizontalGap: 290,
    verticalGap: 48,
  });

  // Sort nodes within each layer and expand vertical spacing to accommodate child subtrees without overlap
  const byLayer = new Map<number, PositionedGraphNode[]>();
  for (const n of baseLayout.nodes) {
    const list = byLayer.get(n.layer) || [];
    list.push(n);
    byLayer.set(n.layer, list);
  }

  const nodeMap = new Map<string, PositionedGraphNode>();
  const childGapY = 18;
  const groupGapY = 44;
  const childOffsetX = 286;
  const symbolOffsetX = 264;

  // Calculate subtree height for each top-level node
  const getFileSubtreeHeight = (fileNode: PositionedGraphNode): number => {
    const syms = symbolsByFile.get(fileNode.id) || [];
    if (syms.length === 0) return fileNode.height;
    const symsH = syms.reduce((s, sym) => s + sym.height, 0) + Math.max(0, syms.length - 1) * 14;
    return Math.max(fileNode.height, symsH);
  };

  const getGroupSubtreeHeight = (groupNode: PositionedGraphNode): number => {
    const children = childFilesByGroup.get(groupNode.id) || [];
    if (children.length === 0) return groupNode.height;
    const childrenH = children.reduce((s, ch) => s + getFileSubtreeHeight(ch), 0) + Math.max(0, children.length - 1) * childGapY;
    return Math.max(groupNode.height, childrenH);
  };

  const layerNums = Array.from(byLayer.keys()).sort((a, b) => a - b);
  let maxRight = 0;
  let maxBottom = 0;
  let currentX = 60;

  for (const l of layerNums) {
    const list = (byLayer.get(l) || []).sort((a, b) => a.y - b.y);
    let currentY = 60;
    let layerMaxRight = currentX + 236;

    for (const parent of list) {
      const subtreeH = getGroupSubtreeHeight(parent);
      parent.x = Math.round(currentX);
      parent.y = Math.round(currentY + (subtreeH - parent.height) / 2);
      nodeMap.set(parent.id, parent);
      layerMaxRight = Math.max(layerMaxRight, parent.x + parent.width);

      const children = (childFilesByGroup.get(parent.id) || []).sort((a, b) => a.label.localeCompare(b.label));
      let childY = currentY;
      for (const child of children) {
        const fileSubH = getFileSubtreeHeight(child);
        child.x = Math.round(parent.x + childOffsetX);
        child.y = Math.round(childY + (fileSubH - child.height) / 2);
        nodeMap.set(child.id, child);
        layerMaxRight = Math.max(layerMaxRight, child.x + child.width);

        const syms = (symbolsByFile.get(child.id) || []).sort((a, b) => a.label.localeCompare(b.label));
        let symY = childY;
        for (const sym of syms) {
          sym.x = Math.round(child.x + symbolOffsetX);
          sym.y = Math.round(symY);
          nodeMap.set(sym.id, sym);
          layerMaxRight = Math.max(layerMaxRight, sym.x + sym.width);
          symY += sym.height + 14;
        }

        childY += fileSubH + childGapY;
      }

      currentY += subtreeH + groupGapY;
      maxBottom = Math.max(maxBottom, currentY);
    }

    maxRight = Math.max(maxRight, layerMaxRight);
    currentX = layerMaxRight + 110;
  }

  // Refresh degrees across all visible edges
  const validEdges: AggregatedGraphEdge[] = [];
  for (const e of overviewEdges) {
    const s = nodeMap.get(e.source);
    const t = nodeMap.get(e.target);
    if (!s || !t || s.id === t.id) continue;
    s.degree += 1;
    t.degree += 1;
    validEdges.push(e);
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: validEdges,
    bounds: {
      minX: 0,
      minY: 0,
      width: Math.max(640, maxRight + 60),
      height: Math.max(420, maxBottom + 40),
    },
  };
}

/**
 * Builds a dedicated scoped subgraph for a single group (folder or architecture area).
 * Shows all files inside the group, their defined symbols (if expanded or small enough),
 * and internal relationships without cluttering the main overview.
 */
export function buildScopedGroupGraph(
  groupKey: string,
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  includeSymbols = true,
): GraphLayoutResult {
  const buckets = collectArchitectureGroups(allNodes);
  const bucket = buckets.get(groupKey);
  if (!bucket) {
    return { nodes: [], edges: [], bounds: { width: 800, height: 500, minX: 0, minY: 0 } };
  }

  const fileIds = new Set(bucket.files.map((f) => f.id));
  const filePaths = new Set(bucket.files.map((f) => (f.path || '').replace(/\\/g, '/')));
  const scopedNodes: GraphNode[] = [...bucket.files];

  if (includeSymbols) {
    for (const n of allNodes) {
      if (n.type !== 'File' && n.type !== 'Route' && n.type !== 'Test') {
        const norm = (n.path || '').replace(/\\/g, '/');
        if (filePaths.has(norm) && !fileIds.has(n.id)) {
          scopedNodes.push(n);
        }
      }
    }
  }

  const scopedIdSet = new Set(scopedNodes.map((n) => n.id));
  const scopedEdges = allEdges.filter((e) => scopedIdSet.has(e.source) && scopedIdSet.has(e.target));
  return computeHierarchicalLayout(scopedNodes, scopedEdges, { horizontalGap: 110, verticalGap: 30 });
}

/**
 * Deterministic cycle-safe hierarchical layered layout (Sugiyama-style):
 * 1. Breaks cycles using DFS back-edge detection.
 * 2. Assigns longest-path topological layers (left-to-right architectural flow).
 * 3. Orders nodes inside each layer using a barycenter heuristic (2 passes) to minimize crossings.
 * 4. Computes collision-free coordinates with generous spacing.
 */
export function computeHierarchicalLayout(
  rawNodes: Array<GraphNode & Partial<PositionedGraphNode>>,
  rawEdges: Array<Omit<GraphEdge, 'type'> & { type: GraphEdge['type'] | 'CONTAINS'; weight?: number; edgeKind?: GraphEdgeKind; underlyingTypes?: string[] }>,
  options?: { horizontalGap?: number; verticalGap?: number; defaultWidth?: number; defaultHeight?: number },
): GraphLayoutResult {
  const horizontalGap = options?.horizontalGap ?? 110;
  const verticalGap = options?.verticalGap ?? 34;
  const defaultWidth = options?.defaultWidth ?? 214;
  const defaultHeight = options?.defaultHeight ?? 54;

  if (rawNodes.length === 0) {
    return { nodes: [], edges: [], bounds: { width: 800, height: 500, minX: 0, minY: 0 } };
  }

  const nodeMap = new Map<string, PositionedGraphNode>();
  for (const n of rawNodes) {
    nodeMap.set(n.id, {
      ...n,
      x: 0,
      y: 0,
      width: n.width ?? (n.isGroup ? 236 : defaultWidth),
      height: n.height ?? (n.isGroup ? 74 : defaultHeight),
      layer: 0,
      degree: 0,
    });
  }

  // Group multi-edges per directional endpoint pair (A->B) so edges never overlap invisibly
  const dedupEdges = new Map<string, AggregatedGraphEdge>();
  for (const e of rawEdges) {
    if (e.source === e.target) continue;
    if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) continue;
    const key = `${e.source}->${e.target}`;
    const existing = dedupEdges.get(key);
    if (existing) {
      existing.weight += e.weight ?? 1;
      existing.underlyingEdges = existing.underlyingEdges || [];
      if ('underlyingEdges' in e && Array.isArray((e as AggregatedGraphEdge).underlyingEdges)) {
        existing.underlyingEdges.push(...(e as AggregatedGraphEdge).underlyingEdges!);
      } else {
        existing.underlyingEdges.push(e as GraphEdge);
      }
      existing.countsByType = existing.countsByType || {};
      existing.countsByType[e.type] = (existing.countsByType[e.type] || 0) + (e.weight ?? 1);
      existing.underlyingTypes = existing.underlyingTypes || [existing.type];
      if (!existing.underlyingTypes.includes(e.type)) {
        existing.underlyingTypes.push(e.type);
        existing.edgeKind = 'aggregate';
      }
      existing.label = formatAggregatedEdgeLabel(existing.countsByType, existing.weight);
    } else {
      const countsByType: Record<string, number> =
        'countsByType' in e && (e as AggregatedGraphEdge).countsByType
          ? { ...(e as AggregatedGraphEdge).countsByType }
          : { [e.type]: e.weight ?? 1 };
      const underlyingEdges: GraphEdge[] =
        'underlyingEdges' in e && Array.isArray((e as AggregatedGraphEdge).underlyingEdges)
          ? [...(e as AggregatedGraphEdge).underlyingEdges!]
          : [e as GraphEdge];
      dedupEdges.set(key, {
        ...e,
        weight: e.weight ?? 1,
        edgeKind: e.edgeKind ?? classifyEdgeKind(e.type),
        countsByType,
        underlyingEdges,
        underlyingTypes: [e.type],
        label: e.label || formatAggregatedEdgeLabel(countsByType, e.weight ?? 1),
      });
    }
    nodeMap.get(e.source)!.degree += 1;
    nodeMap.get(e.target)!.degree += 1;
  }

  const edges = Array.from(dedupEdges.values());
  const adj = new Map<string, string[]>();
  const revAdj = new Map<string, string[]>();
  for (const id of nodeMap.keys()) {
    adj.set(id, []);
    revAdj.set(id, []);
  }
  for (const e of edges) {
    adj.get(e.source)!.push(e.target);
    revAdj.get(e.target)!.push(e.source);
  }

  // Step 1: Cycle-breaking DFS to identify acyclic forward edges
  const state = new Map<string, 0 | 1 | 2>();
  const forwardAdj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const id of nodeMap.keys()) {
    state.set(id, 0);
    forwardAdj.set(id, []);
    inDegree.set(id, 0);
  }

  const dfs = (u: string) => {
    state.set(u, 1);
    for (const v of adj.get(u)!) {
      const s = state.get(v);
      if (s === 0) {
        forwardAdj.get(u)!.push(v);
        inDegree.set(v, (inDegree.get(v) || 0) + 1);
        dfs(v);
      } else if (s === 2) {
        forwardAdj.get(u)!.push(v);
        inDegree.set(v, (inDegree.get(v) || 0) + 1);
      }
    }
    state.set(u, 2);
  };

  const sortedIds = Array.from(nodeMap.keys()).sort((a, b) => {
    const inA = revAdj.get(a)!.length;
    const inB = revAdj.get(b)!.length;
    if (inA !== inB) return inA - inB;
    return a.localeCompare(b);
  });
  for (const id of sortedIds) {
    if (state.get(id) === 0) dfs(id);
  }

  // Step 2: Longest-path layer assignment on the forward DAG
  const queue: string[] = [];
  for (const id of sortedIds) {
    if ((inDegree.get(id) || 0) === 0) queue.push(id);
  }

  const layerMap = new Map<string, number>();
  for (const id of sortedIds) layerMap.set(id, 0);

  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    const uLayer = layerMap.get(u)!;
    for (const v of forwardAdj.get(u)!) {
      if (uLayer + 1 > layerMap.get(v)!) {
        layerMap.set(v, uLayer + 1);
      }
      const nextIn = (inDegree.get(v) || 1) - 1;
      inDegree.set(v, nextIn);
      if (nextIn === 0) queue.push(v);
    }
  }

  const layers = new Map<number, PositionedGraphNode[]>();
  for (const n of nodeMap.values()) {
    const l = layerMap.get(n.id) ?? 0;
    n.layer = l;
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l)!.push(n);
  }

  const maxLayer = Math.max(0, ...Array.from(layers.keys()));

  // Step 3: Barycenter crossing minimization
  for (let l = 0; l <= maxLayer; l++) {
    const list = layers.get(l) || [];
    list.sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label));
  }

  const orderIndex = new Map<string, number>();
  const refreshOrderIndex = () => {
    for (const [l, list] of layers.entries()) {
      list.forEach((n, idx) => orderIndex.set(n.id, idx));
      layers.set(l, list);
    }
  };
  refreshOrderIndex();

  for (let pass = 0; pass < 2; pass++) {
    for (let l = 1; l <= maxLayer; l++) {
      const list = layers.get(l) || [];
      list.sort((a, b) => {
        const predsA = revAdj.get(a.id) || [];
        const predsB = revAdj.get(b.id) || [];
        const avgA = predsA.length ? predsA.reduce((s, p) => s + (orderIndex.get(p) ?? 0), 0) / predsA.length : 0;
        const avgB = predsB.length ? predsB.reduce((s, p) => s + (orderIndex.get(p) ?? 0), 0) / predsB.length : 0;
        if (Math.abs(avgA - avgB) > 0.01) return avgA - avgB;
        return a.label.localeCompare(b.label);
      });
      refreshOrderIndex();
    }
    for (let l = maxLayer - 1; l >= 0; l--) {
      const list = layers.get(l) || [];
      list.sort((a, b) => {
        const succsA = adj.get(a.id) || [];
        const succsB = adj.get(b.id) || [];
        const avgA = succsA.length ? succsA.reduce((s, p) => s + (orderIndex.get(p) ?? 0), 0) / succsA.length : 0;
        const avgB = succsB.length ? succsB.reduce((s, p) => s + (orderIndex.get(p) ?? 0), 0) / succsB.length : 0;
        if (Math.abs(avgA - avgB) > 0.01) return avgA - avgB;
        return a.label.localeCompare(b.label);
      });
      refreshOrderIndex();
    }
  }

  // Step 4: Assign coordinates
  const layerHeights = new Map<number, number>();
  let maxColHeight = 0;
  for (let l = 0; l <= maxLayer; l++) {
    const list = layers.get(l) || [];
    const colH = list.reduce((sum, n) => sum + n.height, 0) + Math.max(0, list.length - 1) * verticalGap;
    layerHeights.set(l, colH);
    if (colH > maxColHeight) maxColHeight = colH;
  }

  const paddingX = 60;
  const paddingY = 60;
  let currentX = paddingX;
  let maxRight = 0;
  let maxBottom = 0;

  for (let l = 0; l <= maxLayer; l++) {
    const list = layers.get(l) || [];
    if (list.length === 0) continue;
    const colWidth = Math.max(...list.map((n) => n.width));
    const colH = layerHeights.get(l) || 0;
    let currentY = paddingY + Math.max(0, (maxColHeight - colH) / 2);

    for (const node of list) {
      node.x = Math.round(currentX);
      node.y = Math.round(currentY);
      currentY += node.height + verticalGap;
      maxRight = Math.max(maxRight, node.x + node.width);
      maxBottom = Math.max(maxBottom, node.y + node.height);
    }

    currentX += colWidth + horizontalGap;
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
    bounds: {
      minX: 0,
      minY: 0,
      width: Math.max(600, maxRight + paddingX),
      height: Math.max(420, maxBottom + paddingY),
    },
  };
}

/**
 * Computes a radial/concentric neighborhood layout around `centerNodeId` up to `depth` (1..3).
 */
export function computeRadialFocusLayout(
  centerNodeId: string,
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  depth = 1,
): GraphLayoutResult {
  const clampedDepth = Math.max(1, Math.min(3, depth));
  const nodeMap = new Map<string, GraphNode>();
  for (const n of allNodes) nodeMap.set(n.id, n);

  const center = nodeMap.get(centerNodeId);
  if (!center) {
    return { nodes: [], edges: [], bounds: { width: 800, height: 500, minX: 0, minY: 0 } };
  }

  const visitedDist = new Map<string, number>([[centerNodeId, 0]]);
  const queue: string[] = [centerNodeId];
  let head = 0;

  while (head < queue.length) {
    const u = queue[head++];
    const dist = visitedDist.get(u)!;
    if (dist >= clampedDepth) continue;

    for (const e of allEdges) {
      if (String(e.type) === 'CONTAINS') continue;
      const neighbor = e.source === u ? e.target : e.target === u ? e.source : null;
      if (neighbor && nodeMap.has(neighbor) && !visitedDist.has(neighbor)) {
        visitedDist.set(neighbor, dist + 1);
        queue.push(neighbor);
      }
    }
  }

  const rings = new Map<number, PositionedGraphNode[]>();
  const positionedMap = new Map<string, PositionedGraphNode>();

  for (const [id, dist] of visitedDist.entries()) {
    const raw = nodeMap.get(id)!;
    const pNode: PositionedGraphNode = {
      ...raw,
      x: 0,
      y: 0,
      width: id === centerNodeId ? 230 : 204,
      height: id === centerNodeId ? 62 : 52,
      layer: dist,
      degree: 0,
    };
    positionedMap.set(id, pNode);
    if (!rings.has(dist)) rings.set(dist, []);
    rings.get(dist)!.push(pNode);
  }

  const subEdges: AggregatedGraphEdge[] = [];
  for (const e of allEdges) {
    if (String(e.type) === 'CONTAINS') continue;
    if (e.source !== e.target && positionedMap.has(e.source) && positionedMap.has(e.target)) {
      subEdges.push({ ...e, weight: 1, edgeKind: classifyEdgeKind(e.type) });
      positionedMap.get(e.source)!.degree += 1;
      positionedMap.get(e.target)!.degree += 1;
    }
  }

  const centerX = 620;
  const centerY = 420;
  const baseRadius = 260;

  const centerNode = positionedMap.get(centerNodeId)!;
  centerNode.x = Math.round(centerX - centerNode.width / 2);
  centerNode.y = Math.round(centerY - centerNode.height / 2);

  let minX = centerNode.x;
  let minY = centerNode.y;
  let maxX = centerNode.x + centerNode.width;
  let maxY = centerNode.y + centerNode.height;

  for (let d = 1; d <= clampedDepth; d++) {
    const ringNodes = rings.get(d) || [];
    if (ringNodes.length === 0) continue;
    ringNodes.sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label));
    const radius = Math.max(baseRadius * d, (ringNodes.length * 140) / (2 * Math.PI));
    const step = (2 * Math.PI) / ringNodes.length;

    ringNodes.forEach((n, idx) => {
      const angle = -Math.PI / 2 + idx * step;
      n.x = Math.round(centerX + radius * Math.cos(angle) - n.width / 2);
      n.y = Math.round(centerY + radius * Math.sin(angle) - n.height / 2);
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });
  }

  const shiftX = minX < 60 ? 60 - minX : 0;
  const shiftY = minY < 60 ? 60 - minY : 0;
  for (const n of positionedMap.values()) {
    n.x += shiftX;
    n.y += shiftY;
  }

  return {
    nodes: Array.from(positionedMap.values()),
    edges: subEdges,
    bounds: {
      minX: 0,
      minY: 0,
      width: Math.max(800, maxX + shiftX + 80),
      height: Math.max(540, maxY + shiftY + 80),
    },
  };
}
