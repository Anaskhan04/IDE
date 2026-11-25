import { describe, it } from 'node:test';
import assert from 'node:assert';
import { analyzeWorkspaceDiagnostics } from '../src/utils/diagnosticsEngine';
import type { ProjectFile } from '../src/types/ide';

function makeFile(name: string, content: string, path = name): ProjectFile {
  const ext = name.split('.').pop()?.toLowerCase() || 'ts';
  return {
    id: `file-${name}`,
    name,
    path,
    language: ext,
    content,
  };
}

describe('Multi-Language Diagnostics Engine', () => {
  describe('TypeScript & JavaScript Semantic Diagnostics', () => {
    it('detects misspelled variable names and type mismatches', () => {
      const badTs = makeFile(
        'app.ts',
        `const count = 1;\nconsole.log(conut);\nconst x: number = "wrong";`
      );
      const diags = analyzeWorkspaceDiagnostics([badTs]);
      assert.ok(diags.length >= 2, `Expected at least 2 diagnostics, got ${diags.length}`);

      const nameErr = diags.find((d) => d.message.includes('conut'));
      assert.ok(nameErr, 'Must detect misspelled variable conut');
      assert.strictEqual(nameErr.line, 2);
      assert.strictEqual(nameErr.severity, 'error');

      const typeErr = diags.find((d) => d.code === 'TS2322');
      assert.ok(typeErr, 'Must detect type mismatch string -> number');
      assert.strictEqual(typeErr.line, 3);
      assert.strictEqual(typeErr.severity, 'error');
    });

    it('clears diagnostics when errors are corrected', () => {
      const fixedTs = makeFile(
        'app.ts',
        `const count = 1;\nconsole.log(count);\nconst x: number = 42;`
      );
      const diags = analyzeWorkspaceDiagnostics([fixedTs]);
      assert.strictEqual(diags.length, 0);
    });

    it('detects cross-file missing exports and missing relative imports without flagging bare packages', () => {
      const fileA = makeFile(
        'a.ts',
        `import React from 'react';\nimport { missingFn } from './b';\nimport './missing';\nmissingFn();`,
        'src/a.ts'
      );
      const fileB = makeFile('b.ts', `export function realFn() { return 1; }`, 'src/b.ts');

      const diags = analyzeWorkspaceDiagnostics([fileA, fileB]);
      assert.ok(diags.some((d) => d.code === 'TS2305'), 'Must detect missing exported member');
      assert.ok(diags.some((d) => d.code === 'TS2307'), 'Must detect missing relative module');
      assert.ok(
        !diags.some((d) => d.message.includes("'react'")),
        'Must not flag third-party bare package imports'
      );
    });
  });

  describe('CSS Diagnostics', () => {
    it('allows valid CSS with braces in comments, strings, and optional final semicolons', () => {
      const validCss = makeFile(
        'styles.css',
        `/* .old-rule {\n  color: red;\n} */\n.btn {\n  color: blue; /* inline { comment } */\n  content: "{";\n  margin: 0\n}`
      );
      const diags = analyzeWorkspaceDiagnostics([validCss]);
      assert.strictEqual(diags.length, 0, `Unexpected CSS diagnostics: ${JSON.stringify(diags)}`);
    });

    it('detects real unmatched closing braces and unclosed blocks in CSS', () => {
      const badCss = makeFile('bad.css', `.a {\n  color: red;\n}\n}`);
      const diags = analyzeWorkspaceDiagnostics([badCss]);
      assert.strictEqual(diags.length, 1);
      assert.strictEqual(diags[0].code, 'CSS_UNMATCHED_BRACE');
      assert.strictEqual(diags[0].line, 4);
    });
  });

  describe('Python Diagnostics', () => {
    it('ignores brackets inside strings and comments', () => {
      const validPy = makeFile(
        'valid.py',
        `def greet(name):\n    s = ")"\n    # (\n    return f"Hello {name} {s}"\n`
      );
      const diags = analyzeWorkspaceDiagnostics([validPy]);
      assert.strictEqual(diags.length, 0, `Unexpected Python diagnostics: ${JSON.stringify(diags)}`);
    });

    it('detects real missing colon and unmatched bracket outside strings', () => {
      const badPy = makeFile('bad.py', `def broken()\n    x = (1 + 2))`);
      const diags = analyzeWorkspaceDiagnostics([badPy]);
      assert.ok(diags.some((d) => d.code === 'PY_MISSING_COLON'));
      assert.ok(diags.some((d) => d.code === 'PY_UNMATCHED_BRACKET'));
    });
  });

  describe('HTML Diagnostics', () => {
    it('ignores tags inside HTML comments and script blocks', () => {
      const validHtml = makeFile(
        'index.html',
        `<!DOCTYPE html>\n<html>\n<!-- <div>unclosed in comment -->\n<body>\n  <script>const s = "<div>";</script>\n  <p>Hello</p>\n</body>\n</html>`
      );
      const diags = analyzeWorkspaceDiagnostics([validHtml]);
      assert.strictEqual(diags.length, 0, `Unexpected HTML diagnostics: ${JSON.stringify(diags)}`);
    });
  });
});
