import { ProjectFile, GraphNode, GraphEdge } from '../types/ide';

/**
 * Client-Side AST & Dependency Graph Extractor
 * Inspired by Tree-Sitter AST analysis from DeusData/codebase-memory-mcp
 */
export function buildGraphFromFiles(files: ProjectFile[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  files.forEach((file, fIdx) => {
    // 1. Add File Node
    const fileNodeId = `node-file-${file.id}`;
    const isC = file.name.endsWith('.c') || file.name.endsWith('.h');
    const isTest = file.path.includes('test');

    const fileNode: GraphNode = {
      id: fileNodeId,
      label: file.name,
      type: isTest ? 'Test' : 'File',
      module: file.path.split('/')[1] || 'root',
      cluster: isC ? getCbmCluster(file.path) : getProjectCluster(file.path),
      path: file.path,
      impactStatus: file.isModified ? 'modified' : file.impactLevel || 'none',
      connectionsCount: 0,
      x: 150 + (fIdx % 4) * 220,
      y: 120 + Math.floor(fIdx / 4) * 160,
      loc: file.content.split('\n').length
    };
    nodes.push(fileNode);

    // 2. Extract AST Function & Class Symbols from content
    const lines = file.content.split('\n');
    lines.forEach((line, lineIdx) => {
      // Detect C function definitions: e.g. int cbm_cypher_execute(...) or void foo(...)
      const cFuncMatch = line.match(/^\s*(?:int|void|bool|char\*|cbm_store_t\*)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      // Detect TS/JS functions: e.g. export async function processPayment(...) or function foo(...)
      const tsFuncMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      
      const funcName = (cFuncMatch && cFuncMatch[1]) || (tsFuncMatch && tsFuncMatch[1]);
      if (funcName && !['if', 'while', 'for', 'switch'].includes(funcName)) {
        const funcNodeId = `node-func-${funcName}`;
        if (!nodes.find(n => n.id === funcNodeId)) {
          nodes.push({
            id: funcNodeId,
            label: `${funcName}()`,
            type: 'Function',
            module: fileNode.module,
            cluster: fileNode.cluster,
            path: file.path,
            impactStatus: file.isModified ? 'modified' : 'none',
            connectionsCount: 1,
            x: fileNode.x! + 60,
            y: fileNode.y! - 40,
            loc: 25
          });

          // Edge: File DEFINES Function
          edges.push({
            id: `edge-def-${file.id}-${funcName}`,
            source: fileNodeId,
            target: funcNodeId,
            type: 'DEFINES',
            label: 'DEFINES'
          });
        }
      }

      // Detect function calls: e.g. cbm_cypher_execute(...) or processPayment(...)
      if (line.includes('(')) {
        nodes.forEach(existingNode => {
          if (existingNode.type === 'Function' && existingNode.id !== `node-func-${file.name}`) {
            const cleanName = existingNode.label.replace('()', '');
            if (line.includes(cleanName) && !line.includes(`function ${cleanName}`)) {
              const callEdgeId = `edge-call-${file.id}-${cleanName}-${lineIdx}`;
              if (!edges.some(e => e.source === fileNodeId && e.target === existingNode.id)) {
                edges.push({
                  id: callEdgeId,
                  source: fileNodeId,
                  target: existingNode.id,
                  type: 'CALLS',
                  label: 'CALLS',
                  isImpactPath: file.isModified
                });
              }
            }
          }
        });
      }
    });
  });

  // Recalculate connection counts
  nodes.forEach(n => {
    n.connectionsCount = edges.filter(e => e.source === n.id || e.target === n.id).length;
  });

  return { nodes, edges };
}

function getCbmCluster(path: string): string {
  if (path.includes('cypher')) return 'Cypher Query Engine';
  if (path.includes('mcp')) return 'MCP Protocol Server';
  if (path.includes('store')) return 'In-Memory SQLite Store';
  if (path.includes('traces')) return 'Call Graph & BFS Pathfinder';
  if (path.includes('daemon')) return 'Session Coordination Daemon';
  return 'Entry & CLI';
}

function getProjectCluster(path: string): string {
  if (path.includes('payment')) return 'Billing & Payments';
  if (path.includes('cart') || path.includes('Checkout')) return 'Client Experience';
  if (path.includes('auth') || path.includes('session')) return 'Identity & Auth';
  return 'Core Services';
}
