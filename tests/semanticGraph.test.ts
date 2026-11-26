import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGraphFromFiles } from '../src/utils/astParser';
import { selectRelevantContext } from '../src/utils/aiContextBuilder';
import { computeElkLayeredLayout } from '../src/utils/elkGraphLayout';
import { computeHierarchicalLayout } from '../src/utils/graphLayout';
import type { ProjectFile } from '../src/types/ide';

function makeFile(id: string, path: string, content: string): ProjectFile {
  const name = path.split('/').pop() || path;
  const ext = name.split('.').pop()?.toLowerCase() || 'ts';
  const language = ext === 'tsx' ? 'typescript' : ext === 'ts' ? 'typescript' : ext;
  return { id, name, path, language, content };
}

function makeSemanticFixtureProject(): ProjectFile[] {
  return [
    makeFile(
      'types-user',
      'types/user.ts',
      `export interface AuthUser {
  id: string;
  email: string;
}
export interface SessionProvider {
  createSession(user: AuthUser): string;
}
`,
    ),
    makeFile(
      'utils-validation',
      'utils/validation.ts',
      `export function validate(input: string): boolean {
  return input.trim().length > 0;
}
export function validateInput(email: string): boolean {
  return email.includes('@');
}
`,
    ),
    makeFile(
      'services-session',
      'services/session.ts',
      `import type { AuthUser, SessionProvider } from '../types/user';

export class BaseService {
  protected tag = 'base';
}

export class SessionService extends BaseService implements SessionProvider {
  createSession(user: AuthUser): string {
    return user.id;
  }
}

// Same-named function as utils/validation.ts#validate — must NOT cross-wire!
export function validate(): boolean {
  return true;
}
`,
    ),
    makeFile(
      'services-auth',
      'services/auth.ts',
      `import { validateInput as checkEmail } from '../utils/validation';
import type { AuthUser } from '../types/user';

export function login(email: string): AuthUser | null {
  if (!checkEmail(email)) return null;
  return { id: 'u1', email };
}

export function runDynamicHandler(handlers: Record<string, () => void>, key: string) {
  return handlers[key]();
}
`,
    ),
    makeFile(
      'services-index',
      'services/index.ts',
      `export { login } from './auth';
export { SessionService } from './session';
`,
    ),
    makeFile(
      'cmp-login',
      'Login.tsx',
      `import { login } from './services';

export function Login() {
  return login('user@example.com');
}
`,
    ),
    makeFile(
      'cmp-app',
      'App.tsx',
      `import { Login } from './Login';
import { validate } from './utils/validation';

export function App() {
  validate('ok');
  return <Login />;
}
`,
    ),
    makeFile(
      'test-auth',
      'tests/auth.test.ts',
      `import { login } from '../services/auth';

export function testLogin() {
  return login('a@b.com');
}
`,
    ),
  ];
}

test('Semantic Graph Fixture: resolves imports, aliases, re-exports, heritage, JSX renders, type refs, and test refs accurately', () => {
  const files = makeSemanticFixtureProject();
  const t0 = performance.now();
  const { nodes, edges } = buildGraphFromFiles(files);
  const extractMs = performance.now() - t0;
  console.log(`[semanticGraph benchmark] extraction time=${extractMs.toFixed(2)}ms nodes=${nodes.length} edges=${edges.length}`);

  // 1. Re-export resolution: Login.tsx imports login from services/index.ts -> resolves CALLS to services/auth.ts#login
  const loginFnCall = edges.find(
    (e) => e.type === 'CALLS' && e.source === 'node-sym-cmp-login-Login' && e.target === 'node-sym-services-auth-login',
  );
  assert.ok(loginFnCall, 'Login() should resolve CALLS through services/index.ts re-export to services/auth.ts#login');
  assert.equal(loginFnCall.resolutionStatus, 'semantic');

  // 2. Import alias resolution: services/auth.ts imports validateInput as checkEmail -> CALLS utils/validation.ts#validateInput
  const aliasCall = edges.find(
    (e) =>
      e.type === 'CALLS' &&
      e.source === 'node-sym-services-auth-login' &&
      e.target === 'node-sym-utils-validation-validateInput',
  );
  assert.ok(aliasCall, 'Import alias checkEmail() should resolve to utils/validation.ts#validateInput');

  // 3. Duplicate function names in separate modules do NOT cross-wire
  // App.tsx imports validate from ./utils/validation, NOT ./services/session
  const validValidateCall = edges.find(
    (e) =>
      e.type === 'CALLS' &&
      e.source === 'node-sym-cmp-app-App' &&
      e.target === 'node-sym-utils-validation-validate',
  );
  const falseValidateCall = edges.find(
    (e) =>
      e.type === 'CALLS' &&
      e.source === 'node-sym-cmp-app-App' &&
      e.target === 'node-sym-services-session-validate',
  );
  assert.ok(validValidateCall, 'App() should call utils/validation.ts#validate');
  assert.equal(falseValidateCall, undefined, 'App() must NOT falsely link to services/session.ts#validate');

  // 4. Class inheritance (EXTENDS) & interface implementation (IMPLEMENTS)
  const extendsEdge = edges.find(
    (e) =>
      e.type === 'EXTENDS' &&
      e.source === 'node-sym-services-session-SessionService' &&
      e.target === 'node-sym-services-session-BaseService',
  );
  const implementsEdge = edges.find(
    (e) =>
      e.type === 'IMPLEMENTS' &&
      e.source === 'node-sym-services-session-SessionService' &&
      e.target === 'node-sym-types-user-SessionProvider',
  );
  assert.ok(extendsEdge, 'SessionService EXTENDS BaseService');
  assert.ok(implementsEdge, 'SessionService IMPLEMENTS SessionProvider');

  // 5. JSX component reference (RENDERS)
  const rendersEdge = edges.find(
    (e) =>
      e.type === 'RENDERS' &&
      e.source === 'node-sym-cmp-app-App' &&
      e.target === 'node-sym-cmp-login-Login',
  );
  assert.ok(rendersEdge, 'App() RENDERS <Login />');

  // 6. Type reference (TYPE_REFERENCE)
  const typeRefEdge = edges.find(
    (e) =>
      e.type === 'TYPE_REFERENCE' &&
      e.target === 'node-sym-types-user-AuthUser',
  );
  assert.ok(typeRefEdge, 'AuthUser should have TYPE_REFERENCE edge');

  // 7. Test reference (TEST_REFERENCE)
  const testRefEdge = edges.find(
    (e) =>
      e.type === 'TEST_REFERENCE' &&
      e.source === 'node-file-test-auth' &&
      e.target === 'node-file-services-auth',
  );
  assert.ok(testRefEdge, 'tests/auth.test.ts should have TEST_REFERENCE to services/auth.ts');

  // 8. No false edges from dynamic call handlers[key]()
  const dynamicCallEdges = edges.filter((e) => e.source === 'node-sym-services-auth-runDynamicHandler');
  assert.equal(dynamicCallEdges.length, 0, 'Dynamic bracket calls must not invent false CALLS targets');

  // 9. AI Context Builder uses authoritative graph edges & distinguishes outgoing/incoming
  const bundle = selectRelevantContext({
    projectName: 'semantic-fixture',
    files,
    activeFile: files.find((f) => f.path === 'services/auth.ts'),
    graphNodes: nodes,
    graphEdges: edges,
  });
  assert.ok(bundle.includedFiles.some((f) => f.path === 'utils/validation.ts' && f.reason === 'Graph Dependency'));
  assert.ok(bundle.includedFiles.some((f) => f.path === 'types/user.ts' && f.reason === 'Graph Dependency'));
});

test('ELK.js vs custom hierarchical layout performance benchmark (small, medium, large)', async () => {
  for (const size of [20, 120, 300]) {
    const nodes = Array.from({ length: size }, (_, i) => ({
      id: `n-${i}`,
      label: `file_${i}.ts`,
      type: 'File' as const,
      module: 'src',
      impactStatus: 'none' as const,
      path: `src/mod${i % 5}/file_${i}.ts`,
      x: 0,
      y: 0,
      width: 220,
      height: 56,
      layer: 0,
      degree: 2,
    }));
    const edges = Array.from({ length: size * 2 }, (_, i) => ({
      id: `e-${i}`,
      source: `n-${i % size}`,
      target: `n-${(i * 7 + 3) % size}`,
      type: 'IMPORTS' as const,
      weight: 1,
      edgeKind: 'imports' as const,
    })).filter((e) => e.source !== e.target);

    const tSync = performance.now();
    const syncRes = computeHierarchicalLayout(nodes, edges);
    const syncMs = performance.now() - tSync;

    const { result: elkRes, metrics: elkMetrics } = await computeElkLayeredLayout(nodes, edges);
    assert.equal(syncRes.nodes.length, size);
    assert.equal(elkRes.nodes.length, size);
    console.log(
      `[layout compare] size=${size} edges=${elkRes.edges.length} sync=${syncMs.toFixed(2)}ms elk=${elkMetrics.layoutTimeMs}ms`,
    );
  }
});

test('Phase E.4: aggregates multiple relationship types cleanly, preserves opposite directions, and validates DnD payloads', async () => {
  const { buildArchitectureOverview, formatAggregatedEdgeLabel } = await import('../src/utils/graphLayout');
  const { parseWorkspaceDragPayload } = await import('../src/utils/workspaceDragDrop');

  const files = makeSemanticFixtureProject();
  const { nodes, edges } = buildGraphFromFiles(files);

  // Multiple relationship types between same file pair in Overview
  // services/auth.ts imports utils/validation.ts AND calls validateInput in utils/validation.ts
  const overview = buildArchitectureOverview(nodes, edges, new Set(['services', 'utils']));
  const authToValidation = overview.edges.find(
    (e) => e.source === 'node-file-services-auth' && e.target === 'node-file-utils-validation',
  );
  assert.ok(authToValidation, 'Aggregated edge from services/auth.ts -> utils/validation.ts must exist');
  assert.equal(authToValidation.countsByType?.IMPORTS, 1);
  assert.equal(authToValidation.countsByType?.CALLS, 1);
  assert.equal(authToValidation.label, '1 import · 1 call');
  assert.equal(authToValidation.underlyingEdges?.length, 2);

  // Opposite directions never merge
  const symLabel = formatAggregatedEdgeLabel({ IMPORTS: 1, CALLS: 2 }, 3);
  assert.equal(symLabel, '1 import · 2 calls');
  const threeTypesLabel = formatAggregatedEdgeLabel({ IMPORTS: 1, CALLS: 2, TYPE_REFERENCE: 1 }, 4);
  assert.equal(threeTypesLabel, '4 relationships');

  // DnD payload validation rejects cross-workspace & sensitive files
  const makeDt = (json: string) =>
    ({
      getData: (mime: string) => (mime === 'application/x-intellicode-entity' ? json : ''),
    }) as unknown as DataTransfer;

  const validRes = parseWorkspaceDragPayload(
    makeDt(JSON.stringify({ kind: 'file', workspaceId: 'ws-a', filePath: 'services/auth.ts', label: 'auth.ts' })),
    'ws-a',
    files,
  );
  assert.equal(validRes.valid, true);

  const crossWsRes = parseWorkspaceDragPayload(
    makeDt(JSON.stringify({ kind: 'file', workspaceId: 'ws-b', filePath: 'services/auth.ts', label: 'auth.ts' })),
    'ws-a',
    files,
  );
  assert.equal(crossWsRes.valid, false);

  const envFile = makeFile('env-1', '.env', 'API_KEY=secret');
  const sensitiveRes = parseWorkspaceDragPayload(
    makeDt(JSON.stringify({ kind: 'file', workspaceId: 'ws-a', filePath: '.env', label: '.env' })),
    'ws-a',
    [...files, envFile],
    { rejectSensitive: true },
  );
  assert.equal(sensitiveRes.valid, false);
});
