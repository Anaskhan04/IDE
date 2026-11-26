import ELK from 'elkjs/lib/elk.bundled.js';
import type { AggregatedGraphEdge, GraphLayoutResult, PositionedGraphNode } from './graphLayout';

const elk = new ELK();

export interface ElkLayoutMetrics {
  layoutTimeMs: number;
  nodeCount: number;
  edgeCount: number;
}

/**
 * Computes a directed layered layout using Eclipse Layout Kernel (ELK.js) `elk.layered`.
 * - Preserves actual semantic edge source/target direction (ELK cycle-breaking only affects coordinates).
 * - Handles cycles, disconnected components, and multi-edges cleanly.
 * - Returns positioned nodes + measured layout time.
 */
export async function computeElkLayeredLayout(
  nodes: PositionedGraphNode[],
  edges: AggregatedGraphEdge[],
): Promise<{ result: GraphLayoutResult; metrics: ElkLayoutMetrics }> {
  const t0 = performance.now();
  if (nodes.length === 0) {
    return {
      result: { nodes: [], edges: [], bounds: { width: 800, height: 500, minX: 0, minY: 0 } },
      metrics: { layoutTimeMs: 0, nodeCount: 0, edgeCount: 0 },
    };
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter((e) => e.source !== e.target && nodeIds.has(e.source) && nodeIds.has(e.target));

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.spacing.nodeNode': '42',
      'elk.layered.spacing.nodeNodeBetweenLayers': '115',
      'elk.spacing.edgeNode': '26',
      'elk.separateConnectedComponents': 'true',
      'elk.spacing.componentComponent': '56',
      'elk.padding': '[top=48,left=48,bottom=48,right=48]',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: n.width || (n.isGroup ? 240 : 220),
      height: n.height || (n.isGroup ? 76 : 56),
    })),
    edges: validEdges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const laidOut = (await elk.layout(elkGraph)) as {
    width?: number;
    height?: number;
    children?: Array<{ id: string; x?: number; y?: number; width?: number; height?: number }>;
  };
  const coordMap = new Map<string, { x: number; y: number }>();
  let maxRight = 600;
  let maxBottom = 420;

  for (const child of laidOut.children || []) {
    const x = Math.round(child.x ?? 48);
    const y = Math.round(child.y ?? 48);
    const w = child.width ?? 220;
    const h = child.height ?? 56;
    coordMap.set(child.id, { x, y });
    maxRight = Math.max(maxRight, x + w + 48);
    maxBottom = Math.max(maxBottom, y + h + 48);
  }

  const positionedNodes = nodes.map((n) => {
    const pos = coordMap.get(n.id);
    return pos ? { ...n, x: pos.x, y: pos.y } : n;
  });

  const elapsed = performance.now() - t0;
  return {
    result: {
      nodes: positionedNodes,
      edges: validEdges,
      bounds: {
        minX: 0,
        minY: 0,
        width: laidOut.width ? Math.max(600, Math.round(laidOut.width)) : maxRight,
        height: laidOut.height ? Math.max(420, Math.round(laidOut.height)) : maxBottom,
      },
    },
    metrics: {
      layoutTimeMs: Number(elapsed.toFixed(2)),
      nodeCount: positionedNodes.length,
      edgeCount: validEdges.length,
    },
  };
}
