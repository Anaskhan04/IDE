import * as ts from 'typescript';
import type { ProjectFile, SymbolInfo, GraphNode, GraphEdge, CBMNodeType } from '../types/ide';

/**
 * FileAnalysisResult holds the AST-extracted metadata for a single source file.
 */
export interface FileAnalysisResult {
  symbols: SymbolInfo[];
  imports: Array<{
    specifier: string;
    resolvedPath?: string;
    names: string[];
    isDefault: boolean;
    isNamespace: boolean;
    line: number;
  }>;
  exports: Array<{
    name: string;
    isDefault: boolean;
    line: number;
  }>;
  calls: Array<{
    calleeName: string;
    line: number;
    callerSymbolName?: string;
  }>;
  hasErrors: boolean;
  errorCount: number;
}

/**
 * Determine ScriptKind based on file extension.
 */
function getScriptKind(fileName: string): ts.ScriptKind | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
      return ts.ScriptKind.TS;
    case 'tsx':
      return ts.ScriptKind.TSX;
    case 'js':
    case 'mjs':
    case 'cjs':
      return ts.ScriptKind.JS;
    case 'jsx':
      return ts.ScriptKind.JSX;
    case 'json':
      return ts.ScriptKind.JSON;
    default:
      return null;
  }
}

/**
 * Checks whether a file can be parsed with the TypeScript AST compiler or dedicated analyzer.
 */
export function isSupportedAstLanguage(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return (
    getScriptKind(fileName) !== null ||
    ['html', 'htm', 'css', 'scss', 'c', 'h', 'py'].includes(ext || '')
  );
}

/**
 * Parse and analyze a source file (JS, TS, HTML, CSS, Python, C, etc.).
 * Never throws on syntax errors; recovers gracefully and extracts all discoverable symbols and dependencies.
 */
export function analyzeSourceFile(file: ProjectFile, allFiles: ProjectFile[] = []): FileAnalysisResult {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'html' || ext === 'htm') {
    return analyzeHtmlFile(file, allFiles);
  }
  if (ext === 'css' || ext === 'scss') {
    return analyzeCssFile(file, allFiles);
  }

  const scriptKind = getScriptKind(file.name);
  if (!scriptKind || scriptKind === ts.ScriptKind.JSON) {
    // Non-JS/TS files: fallback graceful analysis
    return analyzeFallbackFile(file, allFiles);
  }

  const result: FileAnalysisResult = {
    symbols: [],
    imports: [],
    exports: [],
    calls: [],
    hasErrors: false,
    errorCount: 0,
  };

  try {
    const sourceFile = ts.createSourceFile(
      file.name,
      file.content,
      ts.ScriptTarget.Latest,
      true, // setParentNodes = true for full traversal
      scriptKind
    );

    // Track syntax errors from parse diagnostics
    const diagnostics = (sourceFile as any).parseDiagnostics;
    if (diagnostics && Array.isArray(diagnostics) && diagnostics.length > 0) {
      result.hasErrors = true;
      result.errorCount = diagnostics.length;
    }

    // Helper to get 1-based line number
    const getLine = (pos: number): number => {
      return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
    };

    // Helper to check if a node has the 'export' modifier
    const isExported = (node: ts.Node): boolean => {
      if (!ts.canHaveModifiers(node)) return false;
      const modifiers = ts.getModifiers(node);
      return Boolean(modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
    };

    // Helper to check if a node has the 'default' modifier
    const isDefaultExport = (node: ts.Node): boolean => {
      if (!ts.canHaveModifiers(node)) return false;
      const modifiers = ts.getModifiers(node);
      return Boolean(modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword));
    };

    // Context tracking for caller symbols during nested traversal
    let currentSymbolName: string | undefined = undefined;

    // Recursive AST visitor
    function visit(node: ts.Node) {
      // 1. Function Declarations: function foo() {}
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.text;
        const line = getLine(node.getStart(sourceFile));
        const exported = isExported(node);

        const symbol: SymbolInfo = {
          id: `${file.path}:${name}:${line}`,
          name,
          kind: 'function',
          line,
          exported,
          calls: [],
        };
        result.symbols.push(symbol);
        if (exported) {
          result.exports.push({ name, isDefault: isDefaultExport(node), line });
        }

        const prevSymbol = currentSymbolName;
        currentSymbolName = name;
        ts.forEachChild(node, visit);
        currentSymbolName = prevSymbol;
        return;
      }

      // 2. Class Declarations: class MyClass {}
      if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.text;
        const line = getLine(node.getStart(sourceFile));
        const exported = isExported(node);

        const symbol: SymbolInfo = {
          id: `${file.path}:${name}:${line}`,
          name,
          kind: 'class',
          line,
          exported,
          calls: [],
        };
        result.symbols.push(symbol);
        if (exported) {
          result.exports.push({ name, isDefault: isDefaultExport(node), line });
        }

        const prevSymbol = currentSymbolName;
        currentSymbolName = name;
        ts.forEachChild(node, visit);
        currentSymbolName = prevSymbol;
        return;
      }

      // 3. Class Methods: methodName() {}
      if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        const line = getLine(node.getStart(sourceFile));
        const className = currentSymbolName ? `${currentSymbolName}.${name}` : name;

        const symbol: SymbolInfo = {
          id: `${file.path}:${className}:${line}`,
          name: className,
          kind: 'function',
          line,
          exported: false,
          calls: [],
        };
        result.symbols.push(symbol);

        const prevSymbol = currentSymbolName;
        currentSymbolName = className;
        ts.forEachChild(node, visit);
        currentSymbolName = prevSymbol;
        return;
      }

      // 4. Interface Declarations: interface UserProfile {}
      if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        const line = getLine(node.getStart(sourceFile));
        const exported = isExported(node);

        result.symbols.push({
          id: `${file.path}:${name}:${line}`,
          name,
          kind: 'interface',
          line,
          exported,
          calls: [],
        });
        if (exported) {
          result.exports.push({ name, isDefault: isDefaultExport(node), line });
        }
        ts.forEachChild(node, visit);
        return;
      }

      // 5. Type Alias Declarations: type ID = string;
      if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.text;
        const line = getLine(node.getStart(sourceFile));
        const exported = isExported(node);

        result.symbols.push({
          id: `${file.path}:${name}:${line}`,
          name,
          kind: 'type',
          line,
          exported,
          calls: [],
        });
        if (exported) {
          result.exports.push({ name, isDefault: isDefaultExport(node), line });
        }
        ts.forEachChild(node, visit);
        return;
      }

      // 6. Variable Statements: const foo = () => {}, export const bar = 123;
      if (ts.isVariableStatement(node)) {
        const exported = isExported(node);
        node.declarationList.declarations.forEach((decl) => {
          if (ts.isIdentifier(decl.name)) {
            const name = decl.name.text;
            const line = getLine(decl.getStart(sourceFile));
            const isFn =
              decl.initializer &&
              (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));

            const symbol: SymbolInfo = {
              id: `${file.path}:${name}:${line}`,
              name,
              kind: isFn ? 'function' : 'variable',
              line,
              exported,
              calls: [],
            };
            result.symbols.push(symbol);
            if (exported) {
              result.exports.push({ name, isDefault: false, line });
            }

            if (isFn) {
              const prevSymbol = currentSymbolName;
              currentSymbolName = name;
              ts.forEachChild(decl, visit);
              currentSymbolName = prevSymbol;
              return;
            }
          }
        });
        ts.forEachChild(node, visit);
        return;
      }

      // 7. Import Declarations: import { a } from './b'; import React from 'react';
      if (ts.isImportDeclaration(node)) {
        const line = getLine(node.getStart(sourceFile));
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const specifier = node.moduleSpecifier.text;
          const names: string[] = [];
          let isDefault = false;
          let isNamespace = false;

          if (node.importClause) {
            // Default import: import Foo from 'bar'
            if (node.importClause.name) {
              names.push(node.importClause.name.text);
              isDefault = true;
            }
            // Named / namespace bindings: import { a, b } from 'bar' or import * as Foo from 'bar'
            if (node.importClause.namedBindings) {
              if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                names.push(node.importClause.namedBindings.name.text);
                isNamespace = true;
              } else if (ts.isNamedImports(node.importClause.namedBindings)) {
                node.importClause.namedBindings.elements.forEach((el) => {
                  names.push(el.name.text);
                });
              }
            }
          }

          // Resolve relative module paths against workspace files
          const resolvedPath = resolveImportPath(specifier, file.path, allFiles);

          result.imports.push({
            specifier,
            resolvedPath,
            names,
            isDefault,
            isNamespace,
            line,
          });
        }
        return;
      }

      // 8. Export Declarations: export { a, b } from './c';
      if (ts.isExportDeclaration(node)) {
        const line = getLine(node.getStart(sourceFile));
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          node.exportClause.elements.forEach((el) => {
            result.exports.push({
              name: el.name.text,
              isDefault: false,
              line,
            });
          });
        }
        return;
      }

      // 9. Export Assignment: export default identifier;
      if (ts.isExportAssignment(node)) {
        const line = getLine(node.getStart(sourceFile));
        let exportName = 'default';
        if (ts.isIdentifier(node.expression)) {
          exportName = node.expression.text;
        }
        result.exports.push({
          name: exportName,
          isDefault: true,
          line,
        });
        ts.forEachChild(node, visit);
        return;
      }

      // 10. Call Expressions: foo(), myObj.method(), require('./foo'), import('./bar')
      if (ts.isCallExpression(node)) {
        const line = getLine(node.getStart(sourceFile));

        // Detect CommonJS require('./foo')
        if (
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'require' &&
          node.arguments.length > 0 &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          const specifier = node.arguments[0].text;
          const resolvedPath = resolveImportPath(specifier, file.path, allFiles);
          result.imports.push({
            specifier,
            resolvedPath,
            names: [],
            isDefault: true,
            isNamespace: false,
            line,
          });
        }
        // Detect dynamic import('./foo')
        else if (
          node.expression.kind === ts.SyntaxKind.ImportKeyword &&
          node.arguments.length > 0 &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          const specifier = (node.arguments[0] as ts.StringLiteral).text;
          const resolvedPath = resolveImportPath(specifier, file.path, allFiles);
          result.imports.push({
            specifier,
            resolvedPath,
            names: [],
            isDefault: true,
            isNamespace: false,
            line,
          });
        }

        let calleeName = '';
        if (ts.isIdentifier(node.expression)) {
          calleeName = node.expression.text;
        } else if (ts.isPropertyAccessExpression(node.expression)) {
          calleeName = node.expression.name.text;
        }

        if (calleeName && !['if', 'for', 'while', 'switch', 'require', 'import'].includes(calleeName)) {
          result.calls.push({
            calleeName,
            line,
            callerSymbolName: currentSymbolName,
          });

          if (currentSymbolName) {
            const sym = result.symbols.find((s) => s.name === currentSymbolName);
            if (sym && !sym.calls?.includes(calleeName)) {
              sym.calls = sym.calls || [];
              sym.calls.push(calleeName);
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  } catch (err) {
    console.warn(`AST analysis failed for ${file.path}:`, err);
    result.hasErrors = true;
    result.errorCount = 1;
  }

  return result;
}

/**
 * Fallback analyzer for non-JS/TS files (C, Python, Markdown, JSON, etc.)
 */
function analyzeFallbackFile(file: ProjectFile, allFiles: ProjectFile[] = []): FileAnalysisResult {
  const result: FileAnalysisResult = {
    symbols: [],
    imports: [],
    exports: [],
    calls: [],
    hasErrors: false,
    errorCount: 0,
  };

  const lines = file.content.split('\n');
  const isC = file.name.endsWith('.c') || file.name.endsWith('.h');
  const isPy = file.name.endsWith('.py');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (isC) {
      // C function signatures: int func_name(...) {
      const match = line.match(/^\s*(?:int|void|bool|char\*|cbm_store_t\*|uint32_t|size_t)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      if (match && match[1] && !['if', 'while', 'for', 'switch'].includes(match[1])) {
        result.symbols.push({
          id: `${file.path}:${match[1]}:${lineNum}`,
          name: match[1],
          kind: 'function',
          line: lineNum,
          exported: true,
          calls: [],
        });
      }
      // C includes: #include "foo.h"
      const incMatch = line.match(/^\s*#include\s+["<]([^">]+)[">]/);
      if (incMatch) {
        const specifier = incMatch[1];
        const resolvedPath = resolveImportPath(specifier, file.path, allFiles);
        result.imports.push({
          specifier,
          resolvedPath,
          names: [specifier],
          isDefault: true,
          isNamespace: false,
          line: lineNum,
        });
      }
    } else if (isPy) {
      // Python def/class: def func(...): or class MyClass:
      const pyFunc = line.match(/^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      const pyClass = line.match(/^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (pyFunc) {
        result.symbols.push({
          id: `${file.path}:${pyFunc[1]}:${lineNum}`,
          name: pyFunc[1],
          kind: 'function',
          line: lineNum,
          exported: !pyFunc[1].startsWith('_'),
          calls: [],
        });
      } else if (pyClass) {
        result.symbols.push({
          id: `${file.path}:${pyClass[1]}:${lineNum}`,
          name: pyClass[1],
          kind: 'class',
          line: lineNum,
          exported: !pyClass[1].startsWith('_'),
          calls: [],
        });
      }
    }
  });

  return result;
}

/**
 * Normalizes a file path: converts backslashes to forward slashes, strips leading './' or '/', collapses redundant slashes.
 */
export function normalizePath(p: string): string {
  return p
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+/g, '/')
    .replace(/^\//, '');
}

/**
 * Resolves an import specifier (e.g. `./utils/fsAccess`, `style.css`, or `/src/script.js`)
 * against the list of actual ProjectFiles in the workspace.
 * Correctly distinguishes local relative/root paths from external package dependencies.
 */
export function resolveImportPath(
  specifier: string,
  currentFilePath: string,
  allFiles: ProjectFile[]
): string | undefined {
  if (!specifier || !currentFilePath || !allFiles || allFiles.length === 0) {
    return undefined;
  }

  // Strip wrapping quotes and whitespace
  let cleanSpec = specifier.trim().replace(/^['"]|['"]$/g, '');
  // Strip query string and fragment/hash (e.g. style.css?v=2, app.js#main)
  cleanSpec = cleanSpec.split('?')[0].split('#')[0].trim();
  if (!cleanSpec) return undefined;

  // External web protocols or URLs are not local project files
  if (/^(?:https?:|\/\/|data:|mailto:|javascript:|about:)/i.test(cleanSpec)) {
    return undefined;
  }

  const normCurrentPath = normalizePath(currentFilePath);
  const currentDirParts = normCurrentPath.includes('/') ? normCurrentPath.split('/').slice(0, -1) : [];

  const candidateBasePaths: string[] = [];

  if (cleanSpec.startsWith('/')) {
    // Root-relative path in web projects: e.g. /style.css, /src/script.js
    candidateBasePaths.push(normalizePath(cleanSpec));
  } else if (cleanSpec.startsWith('./') || cleanSpec.startsWith('../')) {
    // Explicit relative path
    const specParts = cleanSpec.replace(/\\/g, '/').split('/');
    const resolvedParts = [...currentDirParts];
    for (const part of specParts) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        resolvedParts.pop();
      } else {
        resolvedParts.push(part);
      }
    }
    candidateBasePaths.push(resolvedParts.join('/'));
  } else {
    // Specifier without ./ or /:
    // 1. First, check relative to current file's directory (standard for HTML, CSS, and local assets)
    const specParts = cleanSpec.replace(/\\/g, '/').split('/');
    const resolvedParts = [...currentDirParts];
    for (const part of specParts) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        resolvedParts.pop();
      } else {
        resolvedParts.push(part);
      }
    }
    candidateBasePaths.push(resolvedParts.join('/'));

    // 2. Also check directly as a workspace root-relative path (e.g. "src/main.js")
    candidateBasePaths.push(normalizePath(cleanSpec));
  }

  for (const basePath of candidateBasePaths) {
    const normBase = normalizePath(basePath);
    const candidates = [
      normBase,
      `${normBase}.ts`,
      `${normBase}.tsx`,
      `${normBase}.js`,
      `${normBase}.jsx`,
      `${normBase}.mjs`,
      `${normBase}.cjs`,
      `${normBase}.css`,
      `${normBase}.html`,
      `${normBase}/index.ts`,
      `${normBase}/index.tsx`,
      `${normBase}/index.js`,
      `${normBase}/index.jsx`,
      `${normBase}/index.html`,
    ];

    const matched = allFiles.find((f) => {
      const normF = normalizePath(f.path);
      return candidates.includes(normF);
    });

    if (matched) {
      return matched.path;
    }
  }

  return undefined;
}

/**
 * Extracts CSS @import URLs from CSS content with accurate 1-based line numbers.
 */
function extractCssImportsFromText(content: string, baseLine = 1): Array<{ specifier: string; line: number }> {
  const imports: Array<{ specifier: string; line: number }> = [];
  const importRegex = /@import\s+(?:url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s]+))\s*\)|"([^"]*)"|'([^']*)')/gi;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content)) !== null) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5] ?? '';
    if (specifier.trim()) {
      const lineOffset = content.substring(0, match.index).split('\n').length - 1;
      imports.push({
        specifier: specifier.trim(),
        line: baseLine + lineOffset,
      });
    }
  }

  return imports;
}

/**
 * Analyzes a CSS or SCSS file for @import dependencies.
 */
export function analyzeCssFile(file: ProjectFile, allFiles: ProjectFile[] = []): FileAnalysisResult {
  const result: FileAnalysisResult = {
    symbols: [],
    imports: [],
    exports: [],
    calls: [],
    hasErrors: false,
    errorCount: 0,
  };

  const cssImports = extractCssImportsFromText(file.content, 1);
  for (const imp of cssImports) {
    const resolvedPath = resolveImportPath(imp.specifier, file.path, allFiles);
    result.imports.push({
      specifier: imp.specifier,
      resolvedPath,
      names: [imp.specifier.split('/').pop() || imp.specifier],
      isDefault: true,
      isNamespace: false,
      line: imp.line,
    });
  }

  return result;
}

/**
 * Analyzes an HTML file to discover <link> stylesheet references, <script> external and inline references,
 * and <style> imports.
 */
export function analyzeHtmlFile(file: ProjectFile, allFiles: ProjectFile[] = []): FileAnalysisResult {
  const result: FileAnalysisResult = {
    symbols: [],
    imports: [],
    exports: [],
    calls: [],
    hasErrors: false,
    errorCount: 0,
  };

  const content = file.content;
  const getLineFromPos = (pos: number): number => {
    return content.substring(0, pos).split('\n').length;
  };

  // 1. Extract <link> tags: e.g. <link rel="stylesheet" href="style.css">
  const linkRegex = /<link\b([^>]*?)(?:>|\/>)/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(content)) !== null) {
    const attrs = linkMatch[1];
    const hrefMatch = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!hrefMatch) continue;

    const href = (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? '').trim();
    if (!href) continue;

    const relMatch = attrs.match(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rel = (relMatch ? (relMatch[1] ?? relMatch[2] ?? relMatch[3] ?? '') : '').toLowerCase().trim();

    // Only link tags intended as stylesheets, preloaded styles/scripts, icons, or referencing existing files
    const isStyleOrScript =
      !rel ||
      rel === 'stylesheet' ||
      rel === 'preload' ||
      rel === 'modulepreload' ||
      rel === 'icon' ||
      rel === 'shortcut icon' ||
      /\.(css|scss|less|js|mjs|ts|tsx)$/i.test(href);

    if (isStyleOrScript) {
      const line = getLineFromPos(linkMatch.index);
      const resolvedPath = resolveImportPath(href, file.path, allFiles);
      const fileName = href.split('/').pop() || href;

      result.imports.push({
        specifier: href,
        resolvedPath,
        names: [fileName],
        isDefault: true,
        isNamespace: false,
        line,
      });
    }
  }

  // 2. Extract <script> tags: e.g. <script src="script.js"></script> and inline <script>...</script>
  const scriptRegex = /<script\b([\s\S]*?)(?:>(?:([\s\S]*?)<\/script>)?|\/>)/gi;
  let scriptMatch: RegExpExecArray | null;
  while ((scriptMatch = scriptRegex.exec(content)) !== null) {
    const attrs = scriptMatch[1] || '';
    const inlineBody = scriptMatch[2];
    const line = getLineFromPos(scriptMatch.index);

    const srcMatch = attrs.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (srcMatch) {
      const src = (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? '').trim();
      if (src) {
        const resolvedPath = resolveImportPath(src, file.path, allFiles);
        const fileName = src.split('/').pop() || src;

        result.imports.push({
          specifier: src,
          resolvedPath,
          names: [fileName],
          isDefault: true,
          isNamespace: false,
          line,
        });
      }
    } else if (inlineBody && inlineBody.trim()) {
      // Inline script parsing using TypeScript compiler API
      try {
        const isModule = /\btype\s*=\s*["']module["']/i.test(attrs);
        const inlineSource = ts.createSourceFile(
          `${file.name}_inline_${line}.js`,
          inlineBody,
          ts.ScriptTarget.Latest,
          true,
          isModule ? ts.ScriptKind.JS : ts.ScriptKind.JS
        );

        const getInlineLine = (pos: number): number => {
          return line + inlineSource.getLineAndCharacterOfPosition(pos).line;
        };

        const visitInline = (node: ts.Node) => {
          if (ts.isFunctionDeclaration(node) && node.name) {
            const name = node.name.text;
            const symLine = getInlineLine(node.getStart(inlineSource));
            result.symbols.push({
              id: `${file.path}:${name}:${symLine}`,
              name,
              kind: 'function',
              line: symLine,
              exported: true,
              calls: [],
            });
          }

          if (ts.isCallExpression(node)) {
            const callLine = getInlineLine(node.getStart(inlineSource));
            let calleeName = '';
            if (ts.isIdentifier(node.expression)) {
              calleeName = node.expression.text;
            } else if (ts.isPropertyAccessExpression(node.expression)) {
              calleeName = node.expression.name.text;
            }

            if (calleeName && !['if', 'for', 'while', 'switch', 'require', 'import'].includes(calleeName)) {
              result.calls.push({
                calleeName,
                line: callLine,
              });
            }
          }

          if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const specifier = node.moduleSpecifier.text;
            const impLine = getInlineLine(node.getStart(inlineSource));
            const resolvedPath = resolveImportPath(specifier, file.path, allFiles);
            result.imports.push({
              specifier,
              resolvedPath,
              names: [],
              isDefault: false,
              isNamespace: false,
              line: impLine,
            });
          }

          ts.forEachChild(node, visitInline);
        };

        visitInline(inlineSource);
      } catch {
        // Recover gracefully from syntax errors in inline script
      }
    }
  }

  // 3. Extract @import inside <style> tags
  const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch: RegExpExecArray | null;
  while ((styleMatch = styleRegex.exec(content)) !== null) {
    const styleBody = styleMatch[1];
    const styleStartLine = getLineFromPos(styleMatch.index);
    const cssImports = extractCssImportsFromText(styleBody, styleStartLine);
    for (const imp of cssImports) {
      const resolvedPath = resolveImportPath(imp.specifier, file.path, allFiles);
      result.imports.push({
        specifier: imp.specifier,
        resolvedPath,
        names: [imp.specifier.split('/').pop() || imp.specifier],
        isDefault: true,
        isNamespace: false,
        line: imp.line,
      });
    }
  }

  return result;
}

/**
 * Derives a meaningful cluster name for a file based on its folder hierarchy.
 */
export function deriveClusterName(filePath: string): string {
  const parts = filePath.split('/').filter(Boolean);
  if (parts.length <= 1) return 'Project Root';

  const folder = parts[0];
  const subFolder = parts.length > 2 ? parts[1] : '';

  if (folder === 'src') {
    if (subFolder) {
      return `src/${subFolder}`;
    }
    return 'src';
  }
  if (folder === 'tests' || folder === '__tests__') {
    return 'Test Suites';
  }
  return folder;
}

/**
 * Detects whether a file path or name is a generated artifact or database migration
 * (e.g. repeated migration.sql files, build outputs, lockfiles, minified files).
 */
export function isGeneratedOrMigrationPath(filePath: string, fileName?: string): boolean {
  const norm = filePath.replace(/\\/g, '/').toLowerCase();
  const name = (fileName || norm.split('/').pop() || '').toLowerCase();

  // Database migrations - especially repeated migration.sql nodes from Prisma / Flyway / Knex / etc.
  if (name === 'migration.sql' || (name.endsWith('.sql') && norm.includes('migration'))) return true;
  if (norm.includes('/migrations/') || norm.includes('/prisma/migrations/')) return true;

  // Build output and generated code
  if (
    norm.includes('/generated/') ||
    norm.includes('/.generated/') ||
    norm.includes('/dist/') ||
    norm.includes('/build/') ||
    norm.includes('/out/') ||
    norm.includes('/.next/')
  ) {
    return true;
  }

  // Type definitions in generated or typing bundles
  if (name.endsWith('.d.ts') && (norm.includes('/types/') || norm.includes('/generated/') || norm.includes('schema'))) {
    return true;
  }

  // Minified files and source maps
  if (name.endsWith('.min.js') || name.endsWith('.min.css') || name.endsWith('.map')) {
    return true;
  }

  // Lockfiles
  if (name === 'package-lock.json' || name === 'yarn.lock' || name === 'pnpm-lock.yaml') {
    return true;
  }

  return false;
}

/**
 * Categorizes a file path into an architectural area:
 * 'frontend' | 'backend' | 'database' | 'utilities' | 'tests' | 'core'
 */
export function detectArchitectureArea(
  filePath: string
): 'frontend' | 'backend' | 'database' | 'utilities' | 'tests' | 'core' {
  const norm = filePath.replace(/\\/g, '/').toLowerCase();

  // 1. Tests
  if (
    norm.includes('.test.') ||
    norm.includes('.spec.') ||
    norm.includes('__tests__') ||
    norm.startsWith('tests/') ||
    norm.includes('/tests/') ||
    norm.startsWith('test/') ||
    norm.includes('/test/')
  ) {
    return 'tests';
  }

  // 2. Database / Migrations / Schemas
  if (
    norm.includes('migration') ||
    norm.includes('prisma') ||
    norm.includes('/db/') ||
    norm.includes('/database/') ||
    norm.includes('/models/') ||
    norm.includes('/entities/') ||
    norm.includes('/repositories/') ||
    norm.includes('/schema') ||
    norm.endsWith('.sql') ||
    norm.endsWith('.prisma')
  ) {
    return 'database';
  }

  // 3. Frontend / UI / Components / Pages
  if (
    norm.includes('/components/') ||
    norm.includes('/views/') ||
    norm.includes('/pages/') ||
    norm.includes('/styles/') ||
    norm.includes('/hooks/') ||
    norm.includes('/ui/') ||
    norm.includes('/client/') ||
    norm.endsWith('.tsx') ||
    norm.endsWith('.jsx') ||
    norm.endsWith('.css') ||
    norm.endsWith('.scss')
  ) {
    return 'frontend';
  }

  // 4. Backend / API / Services / Server / Controllers
  if (
    norm.includes('/api/') ||
    norm.includes('/server/') ||
    norm.includes('/controllers/') ||
    norm.includes('/services/') ||
    norm.includes('/routes/') ||
    norm.includes('/handlers/') ||
    norm.includes('/middleware/') ||
    norm.includes('/cbm/') ||
    norm.includes('/engine/') ||
    norm.includes('server.ts') ||
    norm.includes('app.ts')
  ) {
    return 'backend';
  }

  // 5. Utilities / Lib / Helpers / Shared
  if (
    norm.includes('/utils/') ||
    norm.includes('/util/') ||
    norm.includes('/helpers/') ||
    norm.includes('/lib/') ||
    norm.includes('/common/') ||
    norm.includes('/shared/')
  ) {
    return 'utilities';
  }

  return 'core';
}

/**
 * Master Graph Builder:
 * Takes the raw workspace ProjectFiles, parses their ASTs, attaches `symbols` to each file,
 * and constructs an accurate GraphNode[] and GraphEdge[] model representing genuine code relationships.
 */
export function buildGraphFromFiles(files: ProjectFile[]): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  enrichedFiles: ProjectFile[];
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();
  const edgeSet = new Set<string>();

  // 1. Analyze every file and attach extracted symbols to ProjectFile
  const enrichedFiles: ProjectFile[] = files.map((file) => {
    const analysis = analyzeSourceFile(file, files);
    return {
      ...file,
      symbols: analysis.symbols,
    };
  });

  // 2. Group files by architectural area
  type ArchArea = 'frontend' | 'utilities' | 'backend' | 'database' | 'core' | 'tests';
  const AREA_ORDER: ArchArea[] = [
    'frontend',
    'utilities',
    'backend',
    'database',
    'core',
    'tests',
  ];

  const filesByArea = new Map<ArchArea, ProjectFile[]>();
  AREA_ORDER.forEach((area) => filesByArea.set(area, []));

  enrichedFiles.forEach((file) => {
    const area = detectArchitectureArea(file.path);
    const list = filesByArea.get(area) || [];
    list.push(file);
    filesByArea.set(area, list);
  });

  // Sort files in each area so non-generated files appear first, followed by generated
  AREA_ORDER.forEach((area) => {
    const list = filesByArea.get(area) || [];
    list.sort((a, b) => {
      const aGen = isGeneratedOrMigrationPath(a.path, a.name) ? 1 : 0;
      const bGen = isGeneratedOrMigrationPath(b.path, b.name) ? 1 : 0;
      if (aGen !== bGen) return aGen - bGen;
      return a.path.localeCompare(b.path);
    });
    filesByArea.set(area, list);
  });

  // 3. Assign non-overlapping coordinates in clean architectural columns
  const activeAreas = AREA_ORDER.filter((area) => (filesByArea.get(area)?.length || 0) > 0);

  activeAreas.forEach((area, colIdx) => {
    const areaFiles = filesByArea.get(area) || [];
    const colStartX = 140 + colIdx * 460;
    let currentY = 140;

    areaFiles.forEach((file) => {
      const fileNodeId = `node-file-${file.id}`;
      const isTest = area === 'tests' || file.path.includes('.test.') || file.path.includes('.spec.');
      const isGen = isGeneratedOrMigrationPath(file.path, file.name);
      const cluster = deriveClusterName(file.path);
      const loc = file.content.split('\n').length;

      const fileNode: GraphNode = {
        id: fileNodeId,
        label: file.name,
        type: isTest ? 'Test' : 'File',
        module: file.path.split('/')[0] || 'root',
        cluster,
        architectureArea: area,
        isGenerated: isGen,
        path: file.path,
        impactStatus: file.isModified ? 'modified' : file.impactLevel || 'none',
        connectionsCount: 0,
        x: colStartX,
        y: currentY,
        loc,
      };

      nodes.push(fileNode);
      nodeMap.set(fileNodeId, fileNode);

      // Collect relevant symbols for graph nodes (functions, classes, interfaces)
      const graphSymbols = (file.symbols || []).filter(
        (s) => s.kind === 'function' || s.kind === 'class' || s.kind === 'interface'
      );
      // Prioritize exported symbols, cap at 12 per file to prevent clutter
      const prioritizedSymbols = [...graphSymbols]
        .sort((a, b) => (b.exported ? 1 : 0) - (a.exported ? 1 : 0))
        .slice(0, 12);

      prioritizedSymbols.forEach((symbol, symIdx) => {
        const symNodeId = `node-sym-${file.id}-${symbol.name}`;
        const symType: CBMNodeType = symbol.kind === 'class' ? 'Class' : 'Function';

        if (!nodeMap.has(symNodeId)) {
          const symNode: GraphNode = {
            id: symNodeId,
            label: symbol.kind === 'class' ? symbol.name : `${symbol.name}()`,
            type: symType,
            module: file.name,
            cluster,
            architectureArea: area,
            isGenerated: isGen,
            path: file.path,
            impactStatus: file.isModified ? 'modified' : 'none',
            connectionsCount: 1,
            x: colStartX + 200,
            y: currentY + symIdx * 52,
            loc: 15,
          };
          nodes.push(symNode);
          nodeMap.set(symNodeId, symNode);

          // DEFINES Edge: File -> Symbol
          const defEdgeId = `edge-def-${file.id}-${symbol.name}`;
          if (!edgeSet.has(defEdgeId)) {
            edges.push({
              id: defEdgeId,
              source: fileNodeId,
              target: symNodeId,
              type: 'DEFINES',
              label: 'DEFINES',
            });
            edgeSet.add(defEdgeId);
          }
        }
      });

      // Advance Y for next file in this column with adequate margin
      const blockHeight = Math.max(64, prioritizedSymbols.length * 52);
      currentY += blockHeight + 36;
    });
  });

  // 4. Build Real IMPORTS Edges
  enrichedFiles.forEach((file) => {
    const fileNodeId = `node-file-${file.id}`;
    const analysis = analyzeSourceFile(file, enrichedFiles);

    analysis.imports.forEach((imp) => {
      if (imp.resolvedPath) {
        const normImpPath = normalizePath(imp.resolvedPath);
        const targetFile = enrichedFiles.find(
          (f) => f.path === imp.resolvedPath || normalizePath(f.path) === normImpPath
        );
        if (targetFile && targetFile.id !== file.id) {
          const targetNodeId = `node-file-${targetFile.id}`;
          const importEdgeId = `edge-import-${file.id}-${targetFile.id}`;

          if (!edgeSet.has(importEdgeId)) {
            edges.push({
              id: importEdgeId,
              source: fileNodeId,
              target: targetNodeId,
              type: 'IMPORTS',
              label: 'IMPORTS',
              isImpactPath: file.isModified || targetFile.isModified,
            });
            edgeSet.add(importEdgeId);
          }
        }
      }
    });

    // 5. Build Real CALLS Edges
    analysis.calls.forEach((call) => {
      for (const targetFile of enrichedFiles) {
        const matchedSymbol = targetFile.symbols?.find((s) => s.name === call.calleeName);
        if (matchedSymbol) {
          const targetSymId = `node-sym-${targetFile.id}-${matchedSymbol.name}`;
          const sourceNodeId = call.callerSymbolName
            ? `node-sym-${file.id}-${call.callerSymbolName}`
            : fileNodeId;

          const effectiveSourceId = nodeMap.has(sourceNodeId) ? sourceNodeId : fileNodeId;

          if (nodeMap.has(targetSymId) && effectiveSourceId !== targetSymId) {
            const callEdgeId = `edge-call-${effectiveSourceId}-${targetSymId}`;
            if (!edgeSet.has(callEdgeId)) {
              edges.push({
                id: callEdgeId,
                source: effectiveSourceId,
                target: targetSymId,
                type: 'CALLS',
                label: 'CALLS',
                isImpactPath: file.isModified || targetFile.isModified,
              });
              edgeSet.add(callEdgeId);
            }
          }
          break;
        }
      }
    });
  });

  // 6. Recalculate connection counts for all nodes
  nodes.forEach((n) => {
    n.connectionsCount = edges.filter((e) => e.source === n.id || e.target === n.id).length;
  });

  return { nodes, edges, enrichedFiles };
}
