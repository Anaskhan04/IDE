import type {
  CIAResult,
  CypherQueryResult,
  GraphEdge,
  GraphNode,
  ProjectFile,
  TracePathResult,
} from '../types/ide';

export interface GraphQueryTemplate {
  name: string;
  query: string;
}

export const GRAPH_QUERY_TEMPLATES: GraphQueryTemplate[] = [
  {
    name: 'All Files',
    query: 'MATCH (n:File) RETURN n LIMIT 25',
  },
  {
    name: 'Functions & Classes',
    query: 'MATCH (n:Function) RETURN n LIMIT 25',
  },
  {
    name: 'Cross-File Imports',
    query: 'MATCH (a)-[r:IMPORTS]->(b) RETURN a, r, b LIMIT 25',
  },
  {
    name: 'Function Call Graph',
    query: 'MATCH (a)-[r:CALLS]->(b) RETURN a, r, b LIMIT 25',
  },
];

function stripParens(label: string): string {
  return label.replace(/\(\)$/, '').trim();
}

function findSymbolLine(files: ProjectFile[], filePath: string, symbolLabel: string): number {
  const cleanName = stripParens(symbolLabel).split('.').pop() || symbolLabel;
  const file = files.find((f) => f.path === filePath);
  if (!file) return 1;
  const sym = file.symbols?.find((s) => s.name === cleanName || s.name === symbolLabel);
  if (sym?.line) return sym.line;
  const idx = file.content.split('\n').findIndex((ln) => ln.includes(cleanName));
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Real BFS Call & Dependency Path Tracer over GraphNodes and GraphEdges.
 * Handles circular graphs safely with a visited set and returns empty paths honestly if none exist.
 */
export function traceSymbolCallPath(
  symbolName: string,
  direction: 'inbound' | 'outbound',
  maxDepth: number,
  files: ProjectFile[],
  nodes: GraphNode[],
  edges: GraphEdge[]
): TracePathResult {
  const t0 = performance.now();
  const query = stripParens(symbolName).toLowerCase();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  if (!query) {
    return {
      symbol: symbolName,
      direction,
      depth: maxDepth,
      executionTimeMs: 0,
      paths: [],
    };
  }

  // Find starting nodes (prefer exact symbol match, then substring match)
  let startNodes = nodes.filter(
    (n) => stripParens(n.label).toLowerCase() === query || n.path.toLowerCase() === query
  );
  if (startNodes.length === 0) {
    startNodes = nodes.filter(
      (n) =>
        stripParens(n.label).toLowerCase().includes(query) ||
        n.path.toLowerCase().includes(query)
    );
  }

  const paths: TracePathResult['paths'] = [];
  const seenEdges = new Set<string>();
  const visitedNodes = new Set<string>(startNodes.map((n) => n.id));
  const queue: { nodeId: string; depth: number }[] = startNodes.map((n) => ({
    nodeId: n.id,
    depth: 0,
  }));

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    for (const edge of edges) {
      if (edge.type !== 'CALLS' && edge.type !== 'IMPORTS') continue;

      if (direction === 'inbound' && edge.target === nodeId) {
        const srcNode = nodeMap.get(edge.source);
        const tgtNode = nodeMap.get(edge.target);
        if (!srcNode || !tgtNode) continue;

        const edgeKey = `${edge.source}->${edge.target}:${edge.type}`;
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey);
          paths.push({
            source: `${srcNode.label} (${srcNode.path})`,
            target: tgtNode.label,
            edge: edge.label || edge.type,
            file: srcNode.path,
            line: findSymbolLine(files, srcNode.path, srcNode.label),
          });
        }

        if (!visitedNodes.has(edge.source)) {
          visitedNodes.add(edge.source);
          queue.push({ nodeId: edge.source, depth: depth + 1 });
        }
      } else if (direction === 'outbound' && edge.source === nodeId) {
        const srcNode = nodeMap.get(edge.source);
        const tgtNode = nodeMap.get(edge.target);
        if (!srcNode || !tgtNode) continue;

        const edgeKey = `${edge.source}->${edge.target}:${edge.type}`;
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey);
          paths.push({
            source: srcNode.label,
            target: `${tgtNode.label} (${tgtNode.path})`,
            edge: edge.label || edge.type,
            file: tgtNode.path,
            line: findSymbolLine(files, tgtNode.path, tgtNode.label),
          });
        }

        if (!visitedNodes.has(edge.target)) {
          visitedNodes.add(edge.target);
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }
  }

  return {
    symbol: symbolName,
    direction,
    depth: maxDepth,
    executionTimeMs: Number((performance.now() - t0).toFixed(2)),
    paths,
  };
}

/**
 * Real Change Impact Analysis using reverse-dependency BFS over the AST Knowledge Graph.
 * Safely handles circular dependencies and derives blast radius strictly from graph reachability.
 */
export function analyzeChangeImpact(
  targetIdOrPath: string,
  files: ProjectFile[],
  nodes: GraphNode[],
  edges: GraphEdge[]
): { result: CIAResult; impactedStatusByNodeId: Map<string, 'modified' | 'direct' | 'indirect'> } {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const impactedStatusByNodeId = new Map<string, 'modified' | 'direct' | 'indirect'>();

  const targetFile =
    files.find((f) => f.id === targetIdOrPath || f.path === targetIdOrPath || f.name === targetIdOrPath) ||
    files.find((f) => f.isModified) ||
    files[0];

  const targetNode =
    nodes.find((n) => n.id === targetIdOrPath) ||
    (targetFile ? nodes.find((n) => n.id === `node-file-${targetFile.id}` || n.path === targetFile.path) : undefined);

  if (!targetFile && !targetNode) {
    return {
      result: {
        targetId: targetIdOrPath,
        targetName: 'No target selected',
        targetPath: '',
        blastRadiusScore: 0,
        severity: 'low',
        directAffected: [],
        indirectAffected: [],
        recommendedTests: [],
      },
      impactedStatusByNodeId,
    };
  }

  const targetPath = targetFile?.path || targetNode?.path || '';
  const targetName = targetFile?.name || targetNode?.label || targetPath;
  const targetId = targetFile?.id || targetNode?.id || targetIdOrPath;

  // Seed BFS with the target file node AND all symbols defined in that file
  const seedNodeIds = new Set<string>();
  for (const n of nodes) {
    if (n.path === targetPath || n.id === targetNode?.id) {
      seedNodeIds.add(n.id);
      impactedStatusByNodeId.set(n.id, 'modified');
    }
  }

  // Build reverse dependency map: targetId -> [{ dependentId, edge }]
  const reverseDeps = new Map<string, { dependentId: string; edge: GraphEdge }[]>();
  for (const edge of edges) {
    // If A IMPORTS B, changing B impacts A.
    // If A CALLS B, changing B impacts A.
    // If File DEFINES Symbol, changing Symbol impacts File.
    const list = reverseDeps.get(edge.target) || [];
    list.push({ dependentId: edge.source, edge });
    reverseDeps.set(edge.target, list);
  }

  // Also map symbol -> its defining file so traversing into a symbol also reaches its file
  const symbolToFileNode = new Map<string, string>();
  for (const edge of edges) {
    if (edge.type === 'DEFINES') {
      symbolToFileNode.set(edge.target, edge.source);
    }
  }

  const visited = new Set<string>(seedNodeIds);
  const queue: { nodeId: string; depth: number; via: string }[] = Array.from(seedNodeIds).map((id) => ({
    nodeId: id,
    depth: 0,
    via: targetName,
  }));

  const directAffected: CIAResult['directAffected'] = [];
  const indirectAffected: CIAResult['indirectAffected'] = [];
  const seenAffectedPaths = new Set<string>([targetPath]);

  while (queue.length > 0) {
    const { nodeId, depth, via } = queue.shift()!;

    const incoming = reverseDeps.get(nodeId) || [];
    for (const { dependentId, edge } of incoming) {
      if (visited.has(dependentId)) continue;
      visited.add(dependentId);

      const depNode = nodeMap.get(dependentId);
      if (!depNode) continue;

      const nextDepth = depth === 0 ? 1 : depth + 1;
      const status = nextDepth === 1 ? 'direct' : 'indirect';
      if (!impactedStatusByNodeId.has(dependentId)) {
        impactedStatusByNodeId.set(dependentId, status);
      }

      // If we hit a symbol in another file, also mark its owning file
      const ownerFileNodeId = symbolToFileNode.get(dependentId);
      if (ownerFileNodeId && !visited.has(ownerFileNodeId)) {
        visited.add(ownerFileNodeId);
        impactedStatusByNodeId.set(ownerFileNodeId, status);
        queue.push({ nodeId: ownerFileNodeId, depth: nextDepth, via: depNode.label });
      }

      if (!seenAffectedPaths.has(depNode.path)) {
        seenAffectedPaths.add(depNode.path);
        const edgeDesc = edge.label || edge.type;

        if (nextDepth === 1) {
          const area = depNode.architectureArea || 'service';
          const mappedType: 'component' | 'service' | 'state' | 'controller' =
            area === 'frontend'
              ? 'component'
              : area === 'database'
                ? 'state'
                : area === 'backend'
                  ? 'controller'
                  : 'service';

          directAffected.push({
            id: depNode.id,
            name: depNode.label,
            path: depNode.path,
            reason: `Directly depends on ${via} via ${edgeDesc}`,
            type: mappedType,
          });
        } else {
          indirectAffected.push({
            id: depNode.id,
            name: depNode.label,
            path: depNode.path,
            depth: nextDepth,
            reason: `Transitive dependent (depth ${nextDepth}) reached via ${via} (${edgeDesc})`,
          });
        }
      }

      queue.push({ nodeId: dependentId, depth: nextDepth, via: depNode.label });
    }
  }

  const recommendedTests: CIAResult['recommendedTests'] = [];
  const allAffected = [
    ...directAffected.map((d) => ({ ...d, isDirect: true })),
    ...indirectAffected.map((d) => ({ ...d, isDirect: false })),
  ];

  for (const item of allAffected) {
    const isTestFile =
      item.path.includes('.test.') ||
      item.path.includes('.spec.') ||
      item.path.toLowerCase().startsWith('tests/') ||
      item.path.toLowerCase().includes('/tests/');
    if (isTestFile) {
      recommendedTests.push({
        id: `test-rec-${item.id}`,
        file: item.path,
        testSuite: item.name,
        priority: item.isDirect ? 'urgent' : 'high',
        reason: item.reason,
      });
    }
  }

  const totalWorkspaceFiles = Math.max(1, files.length);
  const weightedHits = directAffected.length * 2 + indirectAffected.length;
  const blastRadiusScore =
    weightedHits === 0 ? 0 : Math.min(100, Math.round((weightedHits / totalWorkspaceFiles) * 50));

  const severity: CIAResult['severity'] =
    blastRadiusScore >= 75
      ? 'critical'
      : blastRadiusScore >= 50
        ? 'high'
        : blastRadiusScore >= 25
          ? 'moderate'
          : 'low';

  return {
    result: {
      targetId,
      targetName,
      targetPath,
      blastRadiusScore,
      severity,
      directAffected,
      indirectAffected,
      recommendedTests,
    },
    impactedStatusByNodeId,
  };
}

/**
 * Real Graph Query Engine over GraphNodes and GraphEdges.
 * Supports:
 * - MATCH (n[:Type]) [WHERE n.label|path CONTAINS '...'] RETURN ... [LIMIT N]
 * - MATCH (a)-[r[:TYPE]]->(b) [WHERE ...] RETURN ... [LIMIT N]
 * - Plain keyword search across node labels & paths
 */
export function executeGraphQuery(
  rawQuery: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): CypherQueryResult {
  const t0 = performance.now();
  const query = rawQuery.trim();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  if (!query) {
    return {
      query: rawQuery,
      executionTimeMs: 0,
      columns: ['notice'],
      rows: [{ notice: 'Enter a graph query or keyword to search workspace nodes and edges.' }],
    };
  }

  const limitMatch = query.match(/\bLIMIT\s+(\d+)\b/i);
  const limit = limitMatch ? Math.max(1, Math.min(200, parseInt(limitMatch[1], 10))) : 50;

  // 1. Relationship pattern: MATCH (a[:Type])-[r[:EDGE]]->(b[:Type]) ...
  const relMatch = query.match(
    /^MATCH\s*\(\s*(\w*)(?::(\w+))?\s*\)\s*-\s*\[\s*(\w*)(?::(\w+))?\s*\]\s*->\s*\(\s*(\w*)(?::(\w+))?\s*\)/i
  );
  if (relMatch) {
    const [, , srcType, , edgeType, , tgtType] = relMatch;
    const whereMatch = query.match(/\bWHERE\s+(.+?)(?:\bRETURN\b|\bLIMIT\b|$)/i);
    const containsMatch = whereMatch?.[1]?.match(/CONTAINS\s+['"]([^'"]+)['"]/i);
    const filterTerm = containsMatch ? containsMatch[1].toLowerCase() : null;

    const rows: Record<string, any>[] = [];
    for (const edge of edges) {
      if (edgeType && edge.type.toLowerCase() !== edgeType.toLowerCase() && (edge.label || '').toLowerCase() !== edgeType.toLowerCase()) {
        continue;
      }
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;
      if (srcType && src.type.toLowerCase() !== srcType.toLowerCase()) continue;
      if (tgtType && tgt.type.toLowerCase() !== tgtType.toLowerCase()) continue;

      if (filterTerm) {
        const hay = `${src.label} ${src.path} ${tgt.label} ${tgt.path} ${edge.type} ${edge.label}`.toLowerCase();
        if (!hay.includes(filterTerm)) continue;
      }

      rows.push({
        source: src.label,
        sourcePath: src.path,
        relationship: edge.label || edge.type,
        target: tgt.label,
        targetPath: tgt.path,
      });
      if (rows.length >= limit) break;
    }

    return {
      query: rawQuery,
      executionTimeMs: Number((performance.now() - t0).toFixed(2)),
      columns: ['source', 'sourcePath', 'relationship', 'target', 'targetPath'],
      rows,
    };
  }

  // 2. Node pattern: MATCH (n[:Type]) [WHERE ...]
  const nodePattern = query.match(/^MATCH\s*\(\s*(\w*)(?::(\w+))?\s*\)/i);
  if (nodePattern) {
    const [, , nodeType] = nodePattern;
    const whereMatch = query.match(/\bWHERE\s+(.+?)(?:\bRETURN\b|\bLIMIT\b|$)/i);
    const containsMatch = whereMatch?.[1]?.match(/CONTAINS\s+['"]([^'"]+)['"]/i);
    const filterTerm = containsMatch ? containsMatch[1].toLowerCase() : null;

    const rows: Record<string, any>[] = [];
    for (const n of nodes) {
      if (nodeType && n.type.toLowerCase() !== nodeType.toLowerCase()) continue;
      if (filterTerm) {
        const hay = `${n.label} ${n.path} ${n.cluster}`.toLowerCase();
        if (!hay.includes(filterTerm)) continue;
      }
      rows.push({
        label: n.label,
        type: n.type,
        path: n.path,
        cluster: n.cluster,
        connections: n.connectionsCount,
      });
      if (rows.length >= limit) break;
    }

    return {
      query: rawQuery,
      executionTimeMs: Number((performance.now() - t0).toFixed(2)),
      columns: ['label', 'type', 'path', 'cluster', 'connections'],
      rows,
    };
  }

  // 3. Reject unsupported write/mutating Cypher keywords honestly
  if (/^\s*(CREATE|MERGE|DELETE|SET|REMOVE|DROP)\b/i.test(query)) {
    return {
      query: rawQuery,
      executionTimeMs: Number((performance.now() - t0).toFixed(2)),
      columns: ['error'],
      rows: [
        {
          error:
            'Write/mutating Cypher clauses are not supported. Read-only queries supported: MATCH (n[:Type]), MATCH (a)-[r[:TYPE]]->(b), WHERE ... CONTAINS "...", LIMIT N, or plain keyword search.',
        },
      ],
    };
  }

  // 4. Plain keyword search across nodes
  const kw = query.toLowerCase();
  const matchedRows = nodes
    .filter((n) => `${n.label} ${n.path} ${n.cluster}`.toLowerCase().includes(kw))
    .slice(0, limit)
    .map((n) => ({
      label: n.label,
      type: n.type,
      path: n.path,
      cluster: n.cluster,
      connections: n.connectionsCount,
    }));

  return {
    query: rawQuery,
    executionTimeMs: Number((performance.now() - t0).toFixed(2)),
    columns: ['label', 'type', 'path', 'cluster', 'connections'],
    rows: matchedRows,
  };
}
