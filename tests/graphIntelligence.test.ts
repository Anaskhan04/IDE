import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildGraphFromFiles } from '../src/utils/astParser';
import {
  analyzeChangeImpact,
  executeGraphQuery,
  traceSymbolCallPath,
} from '../src/utils/graphIntelligence';
import type { ProjectFile } from '../src/types/ide';

function makeTsFile(id: string, path: string, content: string): ProjectFile {
  const name = path.split('/').pop() || path;
  return { id, name, path, language: 'typescript', content };
}

describe('Real Knowledge Graph, CIA, Call Trace, and Query Engine', () => {
  const serviceFile = makeTsFile(
    'svc',
    'src/services/mathService.ts',
    `export class MathEngine {\n  multiply(a: number, b: number) { return a * b; }\n}\nexport function calculateTotal(price: number) {\n  return price * 1.1;\n}`
  );
  const controllerFile = makeTsFile(
    'ctrl',
    'src/controllers/orderController.ts',
    `import { calculateTotal } from '../services/mathService';\nexport function createOrder(price: number) {\n  return calculateTotal(price);\n}`
  );
  const appFile = makeTsFile(
    'app',
    'src/app.ts',
    `import { createOrder } from './controllers/orderController';\nexport function bootstrap() {\n  return createOrder(100);\n}`
  );
  const testFile = makeTsFile(
    'tst',
    'tests/order.test.ts',
    `import { createOrder } from '../src/controllers/orderController';\nexport function testOrder() {\n  return createOrder(50);\n}`
  );

  it('extracts classes, methods, functions, imports, and calls without duplicates, and updates on file edits', () => {
    const files = [serviceFile, controllerFile, appFile, testFile];
    const { nodes, edges } = buildGraphFromFiles(files);

    assert.ok(nodes.some((n) => n.label === 'MathEngine' && n.type === 'Class'));
    assert.ok(nodes.some((n) => n.label.includes('multiply')));
    assert.ok(nodes.some((n) => n.label === 'calculateTotal()'));
    assert.ok(edges.some((e) => e.type === 'IMPORTS' && e.source === 'node-file-ctrl' && e.target === 'node-file-svc'));
    assert.ok(edges.some((e) => e.type === 'CALLS' && e.target === 'node-sym-svc-calculateTotal'));

    // Ensure no duplicate edge IDs
    const edgeIds = edges.map((e) => e.id);
    assert.strictEqual(new Set(edgeIds).size, edgeIds.length);

    // Edit file and verify graph updates
    const updatedService = {
      ...serviceFile,
      content: serviceFile.content + `\nexport function applyDiscount(v: number) { return v - 5; }`,
    };
    const nextGraph = buildGraphFromFiles([updatedService, controllerFile, appFile, testFile]);
    assert.ok(nextGraph.nodes.some((n) => n.label === 'applyDiscount()'));
  });

  it('computes real direct and indirect Change Impact Analysis with recommended tests', () => {
    const files = [serviceFile, controllerFile, appFile, testFile];
    const { nodes, edges } = buildGraphFromFiles(files);
    const { result, impactedStatusByNodeId } = analyzeChangeImpact('svc', files, nodes, edges);

    assert.strictEqual(result.targetPath, 'src/services/mathService.ts');
    assert.ok(result.directAffected.some((d) => d.path === 'src/controllers/orderController.ts'));
    assert.ok(result.indirectAffected.some((d) => d.path === 'src/app.ts'));
    assert.ok(result.recommendedTests.some((t) => t.file === 'tests/order.test.ts'));
    assert.ok(result.blastRadiusScore > 0);
    assert.strictEqual(impactedStatusByNodeId.get('node-file-svc'), 'modified');
    assert.strictEqual(impactedStatusByNodeId.get('node-file-ctrl'), 'direct');
  });

  it('handles circular imports safely in both CIA and Call Path Tracing', () => {
    const circA = makeTsFile('ca', 'src/a.ts', `import { fnB } from './b';\nexport function fnA() { return fnB(); }`);
    const circB = makeTsFile('cb', 'src/b.ts', `import { fnA } from './a';\nexport function fnB() { return fnA(); }`);
    const files = [circA, circB];
    const { nodes, edges } = buildGraphFromFiles(files);

    const { result } = analyzeChangeImpact('ca', files, nodes, edges);
    assert.ok(result.directAffected.some((d) => d.path === 'src/b.ts'));

    const trace = traceSymbolCallPath('fnA', 'inbound', 5, files, nodes, edges);
    assert.ok(trace.paths.length > 0);
  });

  it('traces real inbound/outbound call paths and returns empty paths honestly when none exist', () => {
    const files = [serviceFile, controllerFile, appFile];
    const { nodes, edges } = buildGraphFromFiles(files);

    const inbound = traceSymbolCallPath('calculateTotal', 'inbound', 3, files, nodes, edges);
    assert.ok(inbound.paths.some((p) => p.file === 'src/controllers/orderController.ts'));

    const none = traceSymbolCallPath('nonExistentSymbolXYZ', 'inbound', 3, files, nodes, edges);
    assert.strictEqual(none.paths.length, 0);
  });

  it('executes real graph queries and rejects unsupported write queries honestly', () => {
    const files = [serviceFile, controllerFile, appFile];
    const { nodes, edges } = buildGraphFromFiles(files);

    const fileRes = executeGraphQuery('MATCH (n:File) RETURN n LIMIT 10', nodes, edges);
    assert.strictEqual(fileRes.rows.length, 3);

    const importRes = executeGraphQuery('MATCH (a)-[r:IMPORTS]->(b) RETURN a, r, b', nodes, edges);
    assert.ok(importRes.rows.some((r) => r.source === 'orderController.ts' && r.target === 'mathService.ts'));

    const writeRes = executeGraphQuery('CREATE (n:Fake {name: "x"})', nodes, edges);
    assert.ok(writeRes.columns.includes('error'));
  });
});
