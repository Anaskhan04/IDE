import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildGraphFromFiles } from '../src/utils/astParser';
import { analyzeWorkspaceDiagnostics } from '../src/utils/diagnosticsEngine';
import { analyzeChangeImpact, traceSymbolCallPath } from '../src/utils/graphIntelligence';
import { selectRelevantContext } from '../src/utils/aiContextBuilder';
import { parseGeneratedFilesFromResponse } from '../src/utils/aiService';
import type { ProjectFile } from '../src/types/ide';
// @ts-ignore JS module
import { resolveSafePath } from '../vite-plugin-git.js';
// @ts-ignore JS module
import { runGit, parseGitStatusPorcelain } from '../vite-git-utils.js';
// @ts-ignore JS module
import { validateProviderBaseUrl } from '../vite-ai-utils.js';

describe('IntelliCode End-to-End Integration', () => {
  it('runs AST graph -> diagnostics -> CIA -> call trace -> secret-safe AI context -> codegen path guard', () => {
    const brokenFiles: ProjectFile[] = [
      {
        id: 'f-math',
        name: 'math.ts',
        path: 'src/math.ts',
        language: 'typescript',
        content: `export function calculateTotal(price: number, qty: number): number {\n  return price * qty;\n}\n`,
      },
      {
        id: 'f-app',
        name: 'app.ts',
        path: 'src/app.ts',
        language: 'typescript',
        content: `import { calculateTotal } from './math';\nexport function runCheckout(): number {\n  const total: number = calculateTotal('10', 2);\n  return total;\n}\n`,
      },
      {
        id: 'f-env',
        name: '.env',
        path: '.env',
        language: 'plaintext',
        content: 'OPENAI_API_KEY=sk-proj-1234567890abcdef123456\n',
      },
    ];

    // 1. Real AST & Knowledge Graph
    const { nodes, edges, enrichedFiles } = buildGraphFromFiles(brokenFiles);
    assert.equal(nodes.some((n) => n.label === 'math.ts'), true);
    assert.equal(nodes.some((n) => n.label === 'app.ts'), true);
    assert.equal(nodes.some((n) => n.label === 'calculateTotal()'), true);
    assert.ok(edges.length > 0);

    // 2. Real TypeScript Diagnostics catch type mismatch
    const diagsWithBug = analyzeWorkspaceDiagnostics(enrichedFiles);
    assert.equal(
      diagsWithBug.some((d) => d.filePath === 'src/app.ts' && d.severity === 'error'),
      true
    );

    // Fix the type error and verify diagnostics clear
    const fixedFiles = enrichedFiles.map((f) =>
      f.path === 'src/app.ts'
        ? {
            ...f,
            content: `import { calculateTotal } from './math';\nexport function runCheckout(): number {\n  const total: number = calculateTotal(10, 2);\n  return total;\n}\n`,
          }
        : f
    );
    const diagsFixed = analyzeWorkspaceDiagnostics(fixedFiles);
    assert.equal(
      diagsFixed.filter((d) => d.filePath === 'src/app.ts' && d.severity === 'error').length,
      0
    );

    // 3. Real Change Impact Analysis & Call Path Tracing
    const { result: cia } = analyzeChangeImpact('src/math.ts', fixedFiles, nodes, edges);
    assert.ok(cia.directAffected.length + cia.indirectAffected.length >= 1);
    assert.equal(
      [...cia.directAffected, ...cia.indirectAffected].some(
        (n) => n.path === 'src/app.ts' || n.path === 'src/math.ts'
      ),
      true
    );

    const trace = traceSymbolCallPath('calculateTotal', 'inbound', 3, fixedFiles, nodes, edges);
    assert.equal(trace.symbol, 'calculateTotal');
    assert.equal(Array.isArray(trace.paths), true);

    // 4. Secret-safe AI Context Builder
    const bundle = selectRelevantContext({
      projectName: 'IntegrationTestApp',
      files: fixedFiles,
      activeFile: fixedFiles[1],
      attachedPaths: ['.env'],
      graphNodes: nodes,
      graphEdges: edges,
      diagnostics: diagsFixed,
      ciaResult: cia,
    });
    assert.equal(bundle.excludedSensitive.includes('.env'), true);
    assert.equal(bundle.systemPrompt.includes('sk-proj-1234567890abcdef123456'), false);
    assert.equal(bundle.includedFiles.some((f) => f.path === 'src/app.ts'), true);

    // 5. AI-generated file path validation blocks traversal & .env
    const parsed = parseGeneratedFilesFromResponse(
      [
        '```ts file=src/newHelper.ts\nexport const ok = true;\n```',
        '```ts file=../../etc/passwd\nbad\n```',
        '```text file=.env\nSECRET=1\n```',
      ].join('\n')
    );
    assert.deepEqual(
      parsed.map((f) => f.path),
      ['src/newHelper.ts']
    );
  });

  it('tracks real Git status in a temp repository and blocks unsafe paths / SSRF URLs', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'intellicode-int-'));
    try {
      execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'pipe' });
      execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpDir, stdio: 'pipe' });
      execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: tmpDir, stdio: 'pipe' });

      const fileA = path.join(tmpDir, 'index.ts');
      fs.writeFileSync(fileA, 'export const v = 1;\n', 'utf8');
      execFileSync('git', ['add', 'index.ts'], { cwd: tmpDir, stdio: 'pipe' });
      execFileSync('git', ['commit', '-m', 'init'], { cwd: tmpDir, stdio: 'pipe' });

      fs.writeFileSync(fileA, 'export const v = 2;\n', 'utf8');
      const statusRes = await runGit(['status', '--porcelain'], tmpDir);
      assert.equal(statusRes.code, 0);
      const { unstagedFiles } = parseGitStatusPorcelain(statusRes.stdout);
      assert.equal(
        unstagedFiles.some((f: { path: string; status: string }) => f.path === 'index.ts' && f.status === 'M'),
        true
      );

      // Path traversal guard
      assert.throws(() => resolveSafePath(tmpDir, '../escape.txt'), /Invalid path|escapes/i);

      // SSRF guard
      assert.equal(validateProviderBaseUrl('http://169.254.169.254/latest/meta-data').valid, false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
