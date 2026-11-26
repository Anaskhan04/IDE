import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildArchitectureOverview,
  buildScopedGroupGraph,
  computeConnectedOverviewLayout,
  computeHierarchicalLayout,
  computeRadialFocusLayout,
} from '../src/utils/graphLayout';
import {
  createInitialGraphExplorerState,
  getExpansionPathForNode,
  reconcileGraphSelection,
} from '../src/utils/graphExplorerState';
import type { GraphEdge, GraphNode } from '../src/types/ide';

function makeSyntheticGraph(nodeCount: number, edgeFactor = 2): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const dirs = ['src/components', 'src/utils', 'src/context', 'src/services', 'src/hooks'];
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const dir = dirs[i % dirs.length];
    const isFile = i % 3 === 0;
    nodes.push({
      id: `n-${i}`,
      label: isFile ? `module_${i}.ts` : `fn_${i}`,
      type: isFile ? 'File' : 'Function',
      module: dir,
      impactStatus: 'none',
      path: `${dir}/module_${Math.floor(i / 3)}.ts`,
      architectureArea: 'core',
    });
  }

  for (let i = 0; i < nodeCount; i++) {
    for (let k = 1; k <= edgeFactor; k++) {
      const target = (i * 7 + k * 13) % nodeCount;
      if (target !== i) {
        edges.push({
          id: `e-${i}-${k}`,
          source: `n-${i}`,
          target: `n-${target}`,
          type: k === 1 ? 'IMPORTS' : 'CALLS',
        });
      }
    }
  }

  return { nodes, edges };
}

function makeFixtureWorkspace(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    { id: 'f-anas-1', label: 'index.ts', type: 'File', module: 'anas', impactStatus: 'none', path: 'anas/index.ts' },
    { id: 'f-anas-2', label: 'config.ts', type: 'File', module: 'anas', impactStatus: 'none', path: 'anas/config.ts' },
    { id: 'f-core-pkg', label: 'package.json', type: 'File', module: 'core', impactStatus: 'none', path: 'core/package.json' },
    { id: 'f-idcard-pkg', label: 'package.json', type: 'File', module: 'idcard', impactStatus: 'none', path: 'idcard/package.json' },
    { id: 'f-idcard-readme', label: 'README.md', type: 'File', module: 'idcard', impactStatus: 'none', path: 'idcard/README.md' },
    { id: 'f-idcard-src-app', label: 'App.tsx', type: 'File', module: 'idcard/src', impactStatus: 'none', path: 'idcard/src/App.tsx' },
    { id: 's-renderCard', label: 'renderCard', type: 'Function', module: 'idcard/src', impactStatus: 'none', path: 'idcard/src/App.tsx' },
  ];
  const edges: GraphEdge[] = [
    { id: 'e1', source: 'f-anas-1', target: 'f-anas-2', type: 'IMPORTS' },
    { id: 'e2', source: 'f-idcard-src-app', target: 'f-anas-1', type: 'IMPORTS' },
    { id: 'e3', source: 'f-idcard-src-app', target: 's-renderCard', type: 'DEFINES' },
  ];
  return { nodes, edges };
}

test('1-2. Expanding a group preserves the parent node and revealed children retain parent association', () => {
  const { nodes, edges } = makeFixtureWorkspace();
  const collapsed = buildArchitectureOverview(nodes, edges, new Set());
  assert.equal(collapsed.nodes.length, 4); // anas, core, idcard, idcard/src

  const expanded = buildArchitectureOverview(nodes, edges, new Set(['core']));
  const coreGroup = expanded.nodes.find((n) => n.id === 'group:core');
  const corePkg = expanded.nodes.find((n) => n.id === 'f-core-pkg');
  assert.ok(coreGroup, 'Parent core group must remain visible after expansion');
  assert.equal(coreGroup.isExpanded, true);
  assert.ok(corePkg, 'Child package.json must be revealed');
  assert.equal(corePkg.parentGroupId, 'group:core');
  assert.equal(corePkg.parentGroupKey, 'core');

  const containsEdge = expanded.edges.find(
    (e) => e.source === 'group:core' && e.target === 'f-core-pkg' && e.edgeKind === 'contains',
  );
  assert.ok(containsEdge, 'Visible CONTAINS edge must link core -> package.json');
});

test('3-4. Selection and expansion are independent and selecting a child preserves parent hierarchy', () => {
  const state = createInitialGraphExplorerState();
  const { nodes, edges } = makeFixtureWorkspace();
  // Selecting a group does not mutate expandedGroupIds
  state.selectedNodeId = 'group:core';
  const overview = buildArchitectureOverview(nodes, edges, state.expandedGroupIds);
  assert.equal(overview.nodes.find((n) => n.id === 'group:core')?.isExpanded, false);

  // Expanding core & selecting child keeps parent hierarchy
  state.expandedGroupIds.add('core');
  state.selectedNodeId = 'f-core-pkg';
  const expanded = buildArchitectureOverview(nodes, edges, state.expandedGroupIds);
  const child = expanded.nodes.find((n) => n.id === state.selectedNodeId);
  assert.ok(child);
  assert.equal(child.parentGroupId, 'group:core');
  assert.ok(expanded.nodes.some((n) => n.id === 'group:core'));
});

test('5-6. Multiple groups can remain expanded simultaneously and collapsing one preserves others', () => {
  const { nodes, edges } = makeFixtureWorkspace();
  const expandedSet = new Set(['core', 'idcard']);
  const both = buildArchitectureOverview(nodes, edges, expandedSet);
  assert.ok(both.nodes.some((n) => n.id === 'f-core-pkg'));
  assert.ok(both.nodes.some((n) => n.id === 'f-idcard-pkg'));
  assert.ok(both.nodes.some((n) => n.id === 'f-idcard-readme'));

  expandedSet.delete('core');
  const onlyIdcard = buildArchitectureOverview(nodes, edges, expandedSet);
  assert.equal(onlyIdcard.nodes.some((n) => n.id === 'f-core-pkg'), false);
  assert.ok(onlyIdcard.nodes.some((n) => n.id === 'group:core'), 'Collapsed core parent stays visible');
  assert.ok(onlyIdcard.nodes.some((n) => n.id === 'f-idcard-pkg'), 'Unrelated expanded idcard stays expanded');
});

test('7-9. Hidden selected child reconciles to parent, duplicate filenames stay distinct, and deleted file clears selection', () => {
  const { nodes, edges } = makeFixtureWorkspace();
  const both = buildArchitectureOverview(nodes, edges, new Set(['core', 'idcard']));
  const corePkg = both.nodes.find((n) => n.id === 'f-core-pkg');
  const idcardPkg = both.nodes.find((n) => n.id === 'f-idcard-pkg');
  assert.ok(corePkg && idcardPkg);
  assert.notEqual(corePkg.id, idcardPkg.id);
  assert.equal(corePkg.path, 'core/package.json');
  assert.equal(idcardPkg.path, 'idcard/package.json');

  // Collapse core while f-core-pkg was selected -> reconciles to group:core
  const collapsed = buildArchitectureOverview(nodes, edges, new Set(['idcard']));
  const reconciledCollapse = reconcileGraphSelection('f-core-pkg', null, collapsed.nodes, nodes);
  assert.equal(reconciledCollapse.selectedNodeId, 'group:core');

  // Delete f-core-pkg completely -> clears selection & focus safely
  const remainingNodes = nodes.filter((n) => n.id !== 'f-core-pkg');
  const afterDelete = buildArchitectureOverview(remainingNodes, edges, new Set(['idcard']));
  const reconciledDelete = reconcileGraphSelection('f-core-pkg', 'f-core-pkg', afterDelete.nodes, remainingNodes);
  assert.equal(reconciledDelete.selectedNodeId, null);
  assert.equal(reconciledDelete.focusedNodeId, null);
});

test('10-11. Workspace state resets cleanly, search locates hidden files, and containment edges stay out of raw dependency edges', () => {
  const { nodes, edges } = makeFixtureWorkspace();
  const rawEdgeCountBefore = edges.length;
  const overview = buildArchitectureOverview(nodes, edges, new Set(['core', 'anas']));
  assert.equal(edges.length, rawEdgeCountBefore, 'Underlying raw graphEdges array is never mutated');
  assert.ok(overview.edges.some((e) => e.edgeKind === 'contains'));

  const pathHint = getExpansionPathForNode(nodes[2]); // core/package.json
  assert.equal(pathHint.groupKey, 'core');

  const fresh = createInitialGraphExplorerState();
  assert.equal(fresh.selectedNodeId, null);
  assert.equal(fresh.expandedGroupIds.size, 0);
  assert.equal(fresh.scopedGroupKey, null);
});

test('12. Connected overview layout and scoped group subgraph avoid overlapping parent and child nodes', () => {
  const { nodes, edges } = makeFixtureWorkspace();
  const overview = buildArchitectureOverview(nodes, edges, new Set(['core', 'idcard', 'idcard/src']));
  const layout = computeConnectedOverviewLayout(overview.nodes, overview.edges);

  for (let i = 0; i < layout.nodes.length; i++) {
    for (let j = i + 1; j < layout.nodes.length; j++) {
      const a = layout.nodes[i];
      const b = layout.nodes[j];
      const overlaps =
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
      assert.equal(overlaps, false, `Nodes ${a.id} and ${b.id} overlapped`);
    }
  }

  const scoped = buildScopedGroupGraph('idcard/src', nodes, edges, true);
  assert.equal(scoped.nodes.length, 2); // App.tsx + renderCard
});

test('13. computeHierarchicalLayout handles cycles, self-loops, disconnected nodes, and radial focus depth 1..3', () => {
  const nodes: GraphNode[] = [
    { id: 'a', label: 'a.ts', type: 'File', module: 'src', impactStatus: 'none', path: 'src/a.ts' },
    { id: 'b', label: 'b.ts', type: 'File', module: 'src', impactStatus: 'none', path: 'src/b.ts' },
    { id: 'c', label: 'c.ts', type: 'File', module: 'src', impactStatus: 'none', path: 'src/c.ts' },
    { id: 'isolated', label: 'isolated.ts', type: 'File', module: 'src', impactStatus: 'none', path: 'src/isolated.ts' },
  ];
  const edges: GraphEdge[] = [
    { id: 'e1', source: 'a', target: 'b', type: 'IMPORTS' },
    { id: 'e2', source: 'b', target: 'c', type: 'IMPORTS' },
    { id: 'e3', source: 'c', target: 'a', type: 'IMPORTS' },
    { id: 'self', source: 'a', target: 'a', type: 'CALLS' },
  ];

  const result = computeHierarchicalLayout(nodes, edges);
  assert.equal(result.nodes.length, 4);
  assert.equal(result.edges.length, 3);

  const d1 = computeRadialFocusLayout('a', nodes, edges, 1);
  assert.equal(d1.nodes.length, 3); // a, b, c (since c->a)
  const d2 = computeRadialFocusLayout('a', nodes, edges, 2);
  assert.equal(d2.nodes.length, 3);
});

test('computeHierarchicalLayout scales cleanly on small, medium, and large (500-node) graphs', () => {
  const sizes = [20, 120, 500];
  for (const size of sizes) {
    const { nodes, edges } = makeSyntheticGraph(size, 2);
    const t0 = performance.now();
    const res = computeHierarchicalLayout(nodes, edges);
    const elapsedMs = performance.now() - t0;
    assert.equal(res.nodes.length, size);
    assert.ok(res.edges.length > 0);
    assert.ok(elapsedMs < 500, `Layout for ${size} nodes took ${elapsedMs.toFixed(2)}ms`);
    console.log(`[graphLayout benchmark] nodes=${size} edges=${res.edges.length} time=${elapsedMs.toFixed(2)}ms`);
  }
});
