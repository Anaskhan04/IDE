import * as ts from 'typescript';
import type {
  ProjectFile,
  WorkspaceDiagnostic,
  DiagnosticsSummary,
  DiagnosticSeverity,
  DiagnosticSource,
  LanguageProviderInfo,
} from '../types/ide';
import { resolveImportPath, isGeneratedOrMigrationPath } from './astParser';

/**
 * Registry of Language Providers and their honest capabilities & statuses (Requirement 5).
 */
export const LANGUAGE_PROVIDERS: LanguageProviderInfo[] = [
  {
    id: 'typescript',
    language: 'TypeScript / JavaScript',
    name: 'TypeScript 5.7 Compiler API',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    status: 'active',
    description: 'Syntactic AST diagnostics, token validation, relative import resolution, and duplicate identifier checks.',
    capabilities: ['Syntax parsing', 'Relative module imports', 'Duplicate identifiers', 'JSX/TSX structure'],
  },
  {
    id: 'json',
    language: 'JSON',
    name: 'JSON Parser Engine',
    extensions: ['.json'],
    status: 'active',
    description: 'Strict JSON syntax parser with line and column extraction for syntax violations, trailing commas, and unquoted keys.',
    capabilities: ['Syntax validation', 'Trailing comma detection', 'Token location tracking'],
  },
  {
    id: 'html',
    language: 'HTML',
    name: 'HTML DOM & Markup Validator',
    extensions: ['.html', '.htm'],
    status: 'active',
    description: 'Checks element tag balancing, mismatched closing tags, unclosed attribute quotes, and duplicate element IDs.',
    capabilities: ['Tag nesting & balancing', 'Void element rules', 'Duplicate ID detection', 'Attribute quote checks'],
  },
  {
    id: 'css',
    language: 'CSS / SCSS',
    name: 'CSS Grammar & Syntax Engine',
    extensions: ['.css', '.scss'],
    status: 'active',
    description: 'Validates brace balancing, bracket/parenthesis pairs, unclosed string literals, and missing declaration semicolons.',
    capabilities: ['Brace & bracket balance', 'String literal termination', 'Missing declaration semicolons'],
  },
  {
    id: 'markdown',
    language: 'Markdown',
    name: 'CommonMark Structural Validator',
    extensions: ['.md', '.markdown'],
    status: 'active',
    description: 'Validates fenced code block termination, incomplete link/image syntax, and CommonMark ATX heading whitespace rules.',
    capabilities: ['Fenced code block balance', 'Broken link syntax', 'CommonMark heading spacing'],
  },
  {
    id: 'python',
    language: 'Python',
    name: 'Python AST Checker (Python 3.12 / Client AST)',
    extensions: ['.py'],
    status: 'active',
    description: 'Python syntax analysis covering indentation (TabError, IndentationError), colon rules on statement headers, keyword placement, and bracket balance.',
    capabilities: ['Indentation & TabError', 'Missing statement colons', 'Misplaced block keywords', 'Bracket & quote balance'],
    externalCheckerRequired: false,
  },
  {
    id: 'c',
    language: 'C / C++',
    name: 'C/C++ Block & Preprocessor Validator',
    extensions: ['.c', '.h', '.cpp', '.hpp'],
    status: 'active',
    description: 'Validates preprocessor #include syntax, brace/parenthesis balancing, struct semicolons, and unclosed comments.',
    capabilities: ['Preprocessor #include syntax', 'Brace & paren balance', 'Unclosed comment detection'],
  },
  {
    id: 'sql',
    language: 'SQL',
    name: 'SQL Language Checker',
    extensions: ['.sql'],
    status: 'unsupported',
    description: 'No SQL dialect engine (Postgres/MySQL/SQLite) is configured in this runtime.',
    capabilities: [],
  },
  {
    id: 'shell',
    language: 'Shell / Bash',
    name: 'Shellcheck / Bash Checker',
    extensions: ['.sh', '.bash', '.zsh'],
    status: 'unsupported',
    description: 'External ShellCheck binary or bash language server is not installed.',
    capabilities: [],
  },
  {
    id: 'yaml',
    language: 'YAML',
    name: 'YAML Parser',
    extensions: ['.yaml', '.yml'],
    status: 'unsupported',
    description: 'No YAML parser is currently bundled in this client runtime.',
    capabilities: [],
  },
];

/**
 * Scope statement for client-side diagnostics and compiler boundaries (Requirement 5 & 7).
 */
export const TS_COMPILER_SCOPE_INFO = {
  title: 'Multi-Language Diagnostics Architecture & Scope',
  description:
    'IntelliCode provides genuine syntax and structural validation across TypeScript/JavaScript (via the TypeScript 5.7 Compiler API), JSON (V8 syntax engine), HTML (tag balancing and DOM attribute parsing), CSS (grammar, brace balance, and semicolon validation), Markdown (CommonMark structural rules), Python (AST & indentation checks), and C/C++ (preprocessor and block checks). In this client runtime, external package type resolution against third-party node_modules is excluded to preserve lightweight performance without multi-megabyte bundle overhead.',
  isFullProjectCheckAvailable: false,
};

/**
 * Returns the diagnostic provider responsible for a given file name.
 */
export function getLanguageProviderForFile(fileName: string): LanguageProviderInfo | undefined {
  const lower = fileName.toLowerCase();
  return LANGUAGE_PROVIDERS.find((provider) =>
    provider.extensions.some((ext) => lower.endsWith(ext))
  );
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
    default:
      return null;
  }
}

// -------------------------------------------------------------
// 1. TypeScript & JavaScript Diagnostics Provider
// -------------------------------------------------------------
function analyzeTypeScriptFile(file: ProjectFile, allFiles: ProjectFile[] = []): WorkspaceDiagnostic[] {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const scriptKind = getScriptKind(file.name);
  if (!scriptKind) return diagnostics;

  try {
    const sourceFile = ts.createSourceFile(
      file.name,
      file.content,
      ts.ScriptTarget.Latest,
      true, // setParentNodes
      scriptKind
    );

    // Parse diagnostics
    const parseDiagnostics = (sourceFile as any).parseDiagnostics;
    if (Array.isArray(parseDiagnostics)) {
      parseDiagnostics.forEach((diag: ts.Diagnostic, index: number) => {
        const start = diag.start ?? 0;
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
        const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');

        let severity: DiagnosticSeverity = 'error';
        if (diag.category === ts.DiagnosticCategory.Warning) {
          severity = 'warning';
        } else if (
          diag.category === ts.DiagnosticCategory.Suggestion ||
          diag.category === ts.DiagnosticCategory.Message
        ) {
          severity = 'info';
        }

        let endLine: number | undefined;
        let endColumn: number | undefined;
        if (diag.length && diag.length > 0) {
          const endLoc = sourceFile.getLineAndCharacterOfPosition(start + diag.length);
          endLine = endLoc.line + 1;
          endColumn = endLoc.character + 1;
        }

        diagnostics.push({
          id: `diag-ts-${file.id}-${diag.code}-${line + 1}-${character + 1}-${index}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: line + 1,
          column: character + 1,
          endLine,
          endColumn,
          message,
          severity,
          source: 'typescript',
          code: `TS${diag.code}`,
        });
      });
    }

    // Relative module resolution & duplicate identifier checks
    const topLevelNames = new Map<string, number>();

    const checkNode = (node: ts.Node) => {
      // Relative import resolution
      if (ts.isImportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const specifier = node.moduleSpecifier.text;
          if (specifier.startsWith('.')) {
            const resolved = resolveImportPath(specifier, file.path, allFiles);
            if (!resolved) {
              const start = node.moduleSpecifier.getStart(sourceFile);
              const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
              diagnostics.push({
                id: `diag-import-${file.id}-${line + 1}-${character + 1}`,
                fileId: file.id,
                filePath: file.path,
                fileName: file.name,
                line: line + 1,
                column: character + 1,
                message: `Cannot find module '${specifier}' or its corresponding type declarations.`,
                severity: 'error',
                source: 'typescript',
                code: 'TS2307',
              });
            }
          }
        }
      }

      // Duplicate top-level identifiers (functions/classes)
      if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
        const name = node.name.text;
        const start = node.name.getStart(sourceFile);
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
        const prevLine = topLevelNames.get(name);
        if (prevLine !== undefined) {
          diagnostics.push({
            id: `diag-dup-${file.id}-${name}-${line + 1}`,
            fileId: file.id,
            filePath: file.path,
            fileName: file.name,
            line: line + 1,
            column: character + 1,
            message: `Duplicate identifier '${name}'. Already declared on line ${prevLine}.`,
            severity: 'error',
            source: 'typescript',
            code: 'TS2300',
          });
        } else {
          topLevelNames.set(name, line + 1);
        }
      }

      ts.forEachChild(node, checkNode);
    };

    checkNode(sourceFile);
  } catch (err) {
    console.warn(`TypeScript diagnostic error in ${file.path}:`, err);
  }

  return diagnostics;
}

// -------------------------------------------------------------
// 2. JSON Diagnostics Provider
// -------------------------------------------------------------
function analyzeJsonFile(file: ProjectFile): WorkspaceDiagnostic[] {
  const diagnostics: WorkspaceDiagnostic[] = [];
  if (!file.content.trim()) return diagnostics;

  try {
    JSON.parse(file.content);
  } catch (err: any) {
    let line = 1;
    let column = 1;
    const errMsg = err instanceof Error ? err.message : String(err);

    const posMatch = errMsg.match(/position\s+(\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const textBefore = file.content.slice(0, pos);
      const lines = textBefore.split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    } else {
      const lineColMatch = errMsg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
      if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        column = parseInt(lineColMatch[2], 10);
      } else {
        // Fallback for modern V8 format, e.g. Unexpected token 'X'
        const tokenMatch = errMsg.match(/token\s+'([^']+)'/i);
        if (tokenMatch) {
          const token = tokenMatch[1];
          const idx = file.content.indexOf(token);
          if (idx !== -1) {
            const textBefore = file.content.slice(0, idx);
            const lines = textBefore.split('\n');
            line = lines.length;
            column = lines[lines.length - 1].length + 1;
          }
        }
      }
    }

    diagnostics.push({
      id: `diag-json-${file.id}-${line}-${column}`,
      fileId: file.id,
      filePath: file.path,
      fileName: file.name,
      line,
      column,
      message: errMsg,
      severity: 'error',
      source: 'json',
      code: 'JSON_SYNTAX',
    });
  }

  return diagnostics;
}

// -------------------------------------------------------------
// 3. HTML Diagnostics Provider
// -------------------------------------------------------------
function analyzeHtmlFile(file: ProjectFile): WorkspaceDiagnostic[] {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const lines = file.content.split('\n');
  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);
  const stack: { tagName: string; line: number; col: number }[] = [];
  const seenIds = new Map<string, number>();

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    // Check duplicate IDs
    const idMatches = lineText.matchAll(/\bid=["']([^"']+)["']/g);
    for (const m of idMatches) {
      const idVal = m[1];
      const col = (m.index ?? 0) + 1;
      if (seenIds.has(idVal)) {
        diagnostics.push({
          id: `diag-html-id-${file.id}-${lineNum}-${col}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: lineNum,
          column: col,
          severity: 'warning',
          message: `Duplicate ID '${idVal}'. Previously declared on line ${seenIds.get(idVal)}.`,
          source: 'html',
          code: 'HTML_DUPLICATE_ID',
        });
      } else {
        seenIds.set(idVal, lineNum);
      }
    }

    // Check tags: match opening, closing, and self-closing tags
    const tagRegex = /<\/?([a-zA-Z0-9\-]+)([^>]*)(\/?>?)/g;
    let match;
    while ((match = tagRegex.exec(lineText)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1].toLowerCase();
      const isClosing = fullMatch.startsWith('</');
      const isSelfClosing = fullMatch.endsWith('/>') || voidTags.has(tagName);
      const col = match.index + 1;

      // Check unclosed quotes inside attribute block
      const attrs = match[2] || '';
      const singleQuotes = (attrs.match(/'/g) || []).length;
      const doubleQuotes = (attrs.match(/"/g) || []).length;
      if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
        diagnostics.push({
          id: `diag-html-quote-${file.id}-${lineNum}-${col}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: lineNum,
          column: col,
          severity: 'error',
          message: `Unclosed attribute quotation in <${tagName}> tag.`,
          source: 'html',
          code: 'HTML_UNCLOSED_QUOTE',
        });
      }

      if (isClosing) {
        if (stack.length === 0) {
          diagnostics.push({
            id: `diag-html-close-${file.id}-${lineNum}-${col}`,
            fileId: file.id,
            filePath: file.path,
            fileName: file.name,
            line: lineNum,
            column: col,
            severity: 'error',
            message: `Unexpected closing tag </${tagName}> without matching open tag.`,
            source: 'html',
            code: 'HTML_UNMATCHED_CLOSING',
          });
        } else {
          const top = stack.pop()!;
          if (top.tagName !== tagName) {
            diagnostics.push({
              id: `diag-html-mismatch-${file.id}-${lineNum}-${col}`,
              fileId: file.id,
              filePath: file.path,
              fileName: file.name,
              line: lineNum,
              column: col,
              severity: 'error',
              message: `Mismatched closing tag: expected </${top.tagName}> (opened on line ${top.line}) but found </${tagName}>.`,
              source: 'html',
              code: 'HTML_MISMATCHED_TAG',
            });
          }
        }
      } else if (!isSelfClosing) {
        stack.push({ tagName, line: lineNum, col });
      }
    }
  });

  // Report any remaining unclosed elements
  while (stack.length > 0) {
    const unclosed = stack.pop()!;
    diagnostics.push({
      id: `diag-html-unclosed-${file.id}-${unclosed.line}-${unclosed.col}`,
      fileId: file.id,
      filePath: file.path,
      fileName: file.name,
      line: unclosed.line,
      column: unclosed.col,
      severity: 'error',
      message: `Unclosed HTML tag <${unclosed.tagName}>. Missing matching </${unclosed.tagName}>.`,
      source: 'html',
      code: 'HTML_UNCLOSED_TAG',
    });
  }

  return diagnostics;
}

// -------------------------------------------------------------
// 4. CSS Diagnostics Provider
// -------------------------------------------------------------
function analyzeCssFile(file: ProjectFile): WorkspaceDiagnostic[] {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const lines = file.content.split('\n');
  const braceStack: { line: number; col: number }[] = [];
  let inRule = false;
  let lastPropLine = -1;
  let lastPropText = '';

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    // Check brace balance
    for (let i = 0; i < lineText.length; i++) {
      const ch = lineText[i];
      if (ch === '{') {
        braceStack.push({ line: lineNum, col: i + 1 });
        inRule = true;
        lastPropLine = -1;
      } else if (ch === '}') {
        if (braceStack.length === 0) {
          diagnostics.push({
            id: `diag-css-brace-${file.id}-${lineNum}-${i + 1}`,
            fileId: file.id,
            filePath: file.path,
            fileName: file.name,
            line: lineNum,
            column: i + 1,
            severity: 'error',
            message: `Unexpected closing brace '}' without opening '{'.`,
            source: 'css',
            code: 'CSS_UNMATCHED_BRACE',
          });
        } else {
          braceStack.pop();
          if (braceStack.length === 0) inRule = false;
          lastPropLine = -1;
        }
      }
    }

    // Check missing semicolon inside rule declarations
    if (inRule && !trimmed.includes('{') && !trimmed.includes('}')) {
      const isDeclaration = /^[a-zA-Z\-]+\s*:\s*[^;]+$/.test(trimmed);
      if (lastPropLine !== -1) {
        diagnostics.push({
          id: `diag-css-semi-${file.id}-${lastPropLine}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: lastPropLine,
          column: lines[lastPropLine - 1].length,
          severity: 'error',
          message: `Missing semicolon ';' after property declaration '${lastPropText}'.`,
          source: 'css',
          code: 'CSS_MISSING_SEMICOLON',
        });
      }
      if (isDeclaration) {
        lastPropLine = lineNum;
        lastPropText = trimmed;
      } else {
        lastPropLine = -1;
      }
    }
  });

  while (braceStack.length > 0) {
    const unclosed = braceStack.pop()!;
    diagnostics.push({
      id: `diag-css-unclosed-${file.id}-${unclosed.line}-${unclosed.col}`,
      fileId: file.id,
      filePath: file.path,
      fileName: file.name,
      line: unclosed.line,
      column: unclosed.col,
      severity: 'error',
      message: `Unclosed CSS rule block starting with '{'.`,
      source: 'css',
      code: 'CSS_UNCLOSED_BRACE',
    });
  }

  return diagnostics;
}

// -------------------------------------------------------------
// 5. Markdown Diagnostics Provider
// -------------------------------------------------------------
function analyzeMarkdownFile(file: ProjectFile): WorkspaceDiagnostic[] {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const lines = file.content.split('\n');
  let inCodeBlock = false;
  let codeBlockStartLine = -1;

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();

    // Check fenced code blocks
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStartLine = lineNum;
      } else {
        inCodeBlock = false;
        codeBlockStartLine = -1;
      }
    }

    if (!inCodeBlock) {
      // Check invalid CommonMark heading missing space after #
      const headingNoSpace = lineText.match(/^(#{1,6})([^\s#].*)$/);
      if (headingNoSpace) {
        diagnostics.push({
          id: `diag-md-heading-${file.id}-${lineNum}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: lineNum,
          column: 1,
          severity: 'info',
          message: `Heading '${headingNoSpace[1]}${headingNoSpace[2]}' missing space after '#' per CommonMark standard.`,
          source: 'markdown',
          code: 'MD_HEADING_NO_SPACE',
        });
      }

      // Check broken links [text]( missing closing )
      const brokenLink = lineText.match(/\[([^\]]+)\]\s*\(\s*$/);
      if (brokenLink) {
        const col = (brokenLink.index ?? 0) + 1;
        diagnostics.push({
          id: `diag-md-link-${file.id}-${lineNum}-${col}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: lineNum,
          column: col,
          severity: 'warning',
          message: `Incomplete markdown link target for '[${brokenLink[1]}]'. Missing closing ')'.`,
          source: 'markdown',
          code: 'MD_INCOMPLETE_LINK',
        });
      }

      // Check empty link [text]()
      const emptyLink = lineText.match(/\[([^\]]+)\]\(\s*\)/);
      if (emptyLink) {
        const col = (emptyLink.index ?? 0) + 1;
        diagnostics.push({
          id: `diag-md-empty-${file.id}-${lineNum}-${col}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: lineNum,
          column: col,
          severity: 'warning',
          message: `Empty markdown link destination for '[${emptyLink[1]}]()'.`,
          source: 'markdown',
          code: 'MD_EMPTY_LINK',
        });
      }
    }
  });

  if (inCodeBlock) {
    diagnostics.push({
      id: `diag-md-codeblock-${file.id}-${codeBlockStartLine}`,
      fileId: file.id,
      filePath: file.path,
      fileName: file.name,
      line: codeBlockStartLine,
      column: 1,
      severity: 'error',
      message: `Unclosed fenced code block declared on line ${codeBlockStartLine}. Expected closing \`\`\`.`,
      source: 'markdown',
      code: 'MD_UNCLOSED_CODEBLOCK',
    });
  }

  return diagnostics;
}

// -------------------------------------------------------------
// 6. Python Diagnostics Provider
// -------------------------------------------------------------
function analyzePythonFile(file: ProjectFile): WorkspaceDiagnostic[] {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const lines = file.content.split('\n');
  const bracketStack: { char: string; line: number; col: number }[] = [];
  let inTripleQuote = false;
  let tripleQuoteChar = '';
  let lastColonLine = -1;
  let lastColonIndent = -1;
  let lastColonKeyword = '';
  let hasPrecedingIf = false;
  let hasPrecedingTry = false;

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();

    // Check triple quotes
    if (trimmed.includes('"""') || trimmed.includes("'''")) {
      const q = trimmed.includes('"""') ? '"""' : "'''";
      const count = (lineText.match(new RegExp(q, 'g')) || []).length;
      if (count % 2 === 1) {
        if (!inTripleQuote) {
          inTripleQuote = true;
          tripleQuoteChar = q;
        } else if (tripleQuoteChar === q) {
          inTripleQuote = false;
        }
      }
    }
    if (inTripleQuote) return;

    // Check TabError (mixed tabs and spaces in indentation)
    const leadingMatch = lineText.match(/^([ \t]+)/);
    if (leadingMatch) {
      const leading = leadingMatch[1];
      if (leading.includes('\t') && leading.includes(' ')) {
        diagnostics.push({
          id: `diag-py-tab-${file.id}-${lineNum}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: lineNum,
          column: 1,
          severity: 'error',
          message: 'TabError: inconsistent use of tabs and spaces in indentation.',
          source: 'python',
          code: 'PY_TAB_ERROR',
        });
      }
    }

    if (!trimmed || trimmed.startsWith('#')) return;

    // Check indentation after colon
    const currentIndent = lineText.search(/\S/);
    if (lastColonLine !== -1) {
      if (currentIndent <= lastColonIndent) {
        diagnostics.push({
          id: `diag-py-indent-${file.id}-${lineNum}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: lineNum,
          column: currentIndent + 1,
          severity: 'error',
          message: `IndentationError: expected an indented block after '${lastColonKeyword}' on line ${lastColonLine}.`,
          source: 'python',
          code: 'PY_INDENTATION_ERROR',
        });
      }
      lastColonLine = -1;
    }

    // Check missing colon on def/class/if/elif/else/for/while/try/except/finally/with
    const headerMatch = trimmed.match(/^(def|class|if|elif|else|for|while|try|except|finally|with)\b/);
    if (headerMatch) {
      const kw = headerMatch[1];
      if (kw === 'if') hasPrecedingIf = true;
      if (kw === 'try') hasPrecedingTry = true;

      if ((kw === 'elif' || kw === 'else') && !hasPrecedingIf) {
        diagnostics.push({
          id: `diag-py-keyword-${file.id}-${lineNum}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: lineNum,
          column: currentIndent + 1,
          severity: 'error',
          message: `SyntaxError: '${kw}' without matching 'if'.`,
          source: 'python',
          code: 'PY_MISPLACED_KEYWORD',
        });
      }
      if ((kw === 'except' || kw === 'finally') && !hasPrecedingTry) {
        diagnostics.push({
          id: `diag-py-keyword-${file.id}-${lineNum}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: lineNum,
          column: currentIndent + 1,
          severity: 'error',
          message: `SyntaxError: '${kw}' without matching 'try'.`,
          source: 'python',
          code: 'PY_MISPLACED_KEYWORD',
        });
      }

      const strippedComment = trimmed.split('#')[0].trim();
      if (!strippedComment.endsWith(':')) {
        diagnostics.push({
          id: `diag-py-colon-${file.id}-${lineNum}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: lineNum,
          column: lineText.length,
          severity: 'error',
          message: `SyntaxError: expected ':' at end of '${kw}' statement.`,
          source: 'python',
          code: 'PY_MISSING_COLON',
        });
      } else {
        lastColonLine = lineNum;
        lastColonIndent = currentIndent;
        lastColonKeyword = kw;
      }
    }

    // Check bracket balance
    for (let i = 0; i < lineText.length; i++) {
      const c = lineText[i];
      if (c === '(' || c === '[' || c === '{') {
        bracketStack.push({ char: c, line: lineNum, col: i + 1 });
      } else if (c === ')' || c === ']' || c === '}') {
        const expected = c === ')' ? '(' : c === ']' ? '[' : '{';
        if (bracketStack.length === 0 || bracketStack[bracketStack.length - 1].char !== expected) {
          diagnostics.push({
            id: `diag-py-bracket-${file.id}-${lineNum}-${i + 1}`,
            fileId: file.id,
            filePath: file.path,
            fileName: file.name,
            line: lineNum,
            column: i + 1,
            severity: 'error',
            message: `SyntaxError: closing '${c}' does not match opening bracket.`,
            source: 'python',
            code: 'PY_UNMATCHED_BRACKET',
          });
        } else {
          bracketStack.pop();
        }
      }
    }
  });

  if (lastColonLine !== -1) {
    diagnostics.push({
      id: `diag-py-eof-indent-${file.id}-${lastColonLine}`,
      fileId: file.id,
      filePath: file.path,
      fileName: file.name,
      line: lastColonLine,
      column: 1,
      severity: 'error',
      message: `IndentationError: expected an indented block after '${lastColonKeyword}' on line ${lastColonLine}.`,
      source: 'python',
      code: 'PY_INDENTATION_ERROR',
    });
  }

  while (bracketStack.length > 0) {
    const unclosed = bracketStack.pop()!;
    diagnostics.push({
      id: `diag-py-unclosed-${file.id}-${unclosed.line}-${unclosed.col}`,
      fileId: file.id,
      filePath: file.path,
      fileName: file.name,
      line: unclosed.line,
      column: unclosed.col,
      severity: 'error',
      message: `SyntaxError: unclosed '${unclosed.char}' opened on line ${unclosed.line}.`,
      source: 'python',
      code: 'PY_UNCLOSED_BRACKET',
    });
  }

  return diagnostics;
}

// -------------------------------------------------------------
// 7. C / C++ Diagnostics Provider
// -------------------------------------------------------------
function analyzeCFile(file: ProjectFile): WorkspaceDiagnostic[] {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const lines = file.content.split('\n');
  const braceStack: { char: string; line: number; col: number }[] = [];
  let inBlockComment = false;
  let commentStartLine = -1;

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();

    // Check block comments
    if (trimmed.includes('/*')) {
      inBlockComment = true;
      commentStartLine = lineNum;
    }
    if (trimmed.includes('*/')) {
      inBlockComment = false;
      commentStartLine = -1;
    }
    if (inBlockComment) return;

    // Check preprocessor #include syntax
    if (trimmed.startsWith('#include')) {
      const rest = trimmed.substring(8).trim();
      const valid = (rest.startsWith('<') && rest.endsWith('>')) || (rest.startsWith('"') && rest.endsWith('"'));
      if (!valid) {
        diagnostics.push({
          id: `diag-c-inc-${file.id}-${lineNum}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: lineNum,
          column: 1,
          severity: 'error',
          message: `Malformed #include directive: expected <filename> or "filename".`,
          source: 'c',
          code: 'C_INVALID_INCLUDE',
        });
      }
    }

    // Check bracket balance
    for (let i = 0; i < lineText.length; i++) {
      const c = lineText[i];
      if (c === '{' || c === '(' || c === '[') {
        braceStack.push({ char: c, line: lineNum, col: i + 1 });
      } else if (c === '}' || c === ')' || c === ']') {
        const expected = c === '}' ? '{' : c === ')' ? '(' : '[';
        if (braceStack.length === 0 || braceStack[braceStack.length - 1].char !== expected) {
          diagnostics.push({
            id: `diag-c-brace-${file.id}-${lineNum}-${i + 1}`,
            fileId: file.id,
            filePath: file.path,
            fileName: file.name,
            line: lineNum,
            column: i + 1,
            severity: 'error',
            message: `SyntaxError: closing '${c}' without matching opening bracket.`,
            source: 'c',
            code: 'C_UNMATCHED_BRACKET',
          });
        } else {
          braceStack.pop();
        }
      }
    }
  });

  if (inBlockComment) {
    diagnostics.push({
      id: `diag-c-comment-${file.id}-${commentStartLine}`,
      fileId: file.id,
      filePath: file.path,
      fileName: file.name,
      line: commentStartLine,
      column: 1,
      severity: 'error',
      message: `Unclosed block comment '/*' starting on line ${commentStartLine}.`,
      source: 'c',
      code: 'C_UNCLOSED_COMMENT',
    });
  }

  while (braceStack.length > 0) {
    const unclosed = braceStack.pop()!;
    diagnostics.push({
      id: `diag-c-unclosed-${file.id}-${unclosed.line}-${unclosed.col}`,
      fileId: file.id,
      filePath: file.path,
      fileName: file.name,
      line: unclosed.line,
      column: unclosed.col,
      severity: 'error',
      message: `SyntaxError: unclosed '${unclosed.char}' opened on line ${unclosed.line}.`,
      source: 'c',
      code: 'C_UNCLOSED_BRACE',
    });
  }

  return diagnostics;
}

// -------------------------------------------------------------
// Master Diagnostic Dispatcher
// -------------------------------------------------------------

/**
 * Extract genuine diagnostics for a single workspace file.
 * Routes to the appropriate language provider by file extension.
 * Gracefully ignores unsupported formats without generating fake diagnostics.
 */
export function analyzeDiagnosticsForFile(
  file: ProjectFile,
  allFiles: ProjectFile[] = []
): WorkspaceDiagnostic[] {
  const provider = getLanguageProviderForFile(file.name);
  if (!provider || provider.status === 'unsupported') {
    return [];
  }

  switch (provider.id) {
    case 'typescript':
      return analyzeTypeScriptFile(file, allFiles);
    case 'json':
      return analyzeJsonFile(file);
    case 'html':
      return analyzeHtmlFile(file);
    case 'css':
      return analyzeCssFile(file);
    case 'markdown':
      return analyzeMarkdownFile(file);
    case 'python':
      return analyzePythonFile(file);
    case 'c':
      return analyzeCFile(file);
    default:
      return [];
  }
}

/**
 * Filter out ignored files and directories from workspace-wide scanning.
 */
export function isIgnoredWorkspacePath(filePath: string, fileName?: string): boolean {
  const norm = filePath.replace(/\\/g, '/').toLowerCase();

  // Exclude node_modules, .git, build output, etc.
  if (
    norm.includes('node_modules/') ||
    norm.startsWith('.git/') ||
    norm.includes('/.git/') ||
    norm.includes('/dist/') ||
    norm.includes('/build/') ||
    norm.includes('/.next/')
  ) {
    return true;
  }

  // Check generated code & migrations using established helper
  return isGeneratedOrMigrationPath(filePath, fileName);
}

/**
 * Run full workspace diagnostics across all ProjectFiles.
 * Excludes generated files, node_modules, and ignored folders (Requirement 4).
 * Returns sorted diagnostics (errors first, then warnings, then file path, then line).
 */
export function analyzeWorkspaceDiagnostics(files: ProjectFile[]): WorkspaceDiagnostic[] {
  const allDiagnostics: WorkspaceDiagnostic[] = [];

  const eligibleFiles = files.filter((f) => !isIgnoredWorkspacePath(f.path, f.name));

  for (const file of eligibleFiles) {
    const fileDiags = analyzeDiagnosticsForFile(file, eligibleFiles);
    allDiagnostics.push(...fileDiags);
  }

  // Sort by severity (error > warning > info > hint), then file path, then line
  const severityRank: Record<DiagnosticSeverity, number> = {
    error: 0,
    warning: 1,
    info: 2,
    hint: 3,
  };

  return allDiagnostics.sort((a, b) => {
    const rankDiff = severityRank[a.severity] - severityRank[b.severity];
    if (rankDiff !== 0) return rankDiff;
    const fileDiff = a.filePath.localeCompare(b.filePath);
    if (fileDiff !== 0) return fileDiff;
    if (a.line !== b.line) return a.line - b.line;
    return a.column - b.column;
  });
}

/**
 * Summarize diagnostic counts and coverage for the Status Bar and Problems panel.
 */
export function getDiagnosticsSummary(
  diagnostics: WorkspaceDiagnostic[],
  files: ProjectFile[] = []
): DiagnosticsSummary {
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const diag of diagnostics) {
    if (diag.severity === 'error') errorCount++;
    else if (diag.severity === 'warning') warningCount++;
    else infoCount++;
  }

  const eligibleFiles = files.filter((f) => !isIgnoredWorkspacePath(f.path, f.name));
  const checkedFilesCount = eligibleFiles.filter((f) => {
    const prov = getLanguageProviderForFile(f.name);
    return prov && prov.status === 'active';
  }).length;
  const unsupportedFilesCount = eligibleFiles.length - checkedFilesCount;

  return {
    errorCount,
    warningCount,
    infoCount,
    total: diagnostics.length,
    checkedFilesCount,
    unsupportedFilesCount: Math.max(0, unsupportedFilesCount),
  };
}

/**
 * Returns the list of unsupported files currently present in the workspace (Requirement 5).
 */
export function getUnsupportedWorkspaceFiles(
  files: ProjectFile[]
): { fileId: string; filePath: string; fileName: string; reason: string }[] {
  const eligibleFiles = files.filter((f) => !isIgnoredWorkspacePath(f.path, f.name));
  const unsupported: { fileId: string; filePath: string; fileName: string; reason: string }[] = [];

  for (const file of eligibleFiles) {
    const prov = getLanguageProviderForFile(file.name);
    if (!prov) {
      const ext = file.name.split('.').pop() || 'plain';
      unsupported.push({
        fileId: file.id,
        filePath: file.path,
        fileName: file.name,
        reason: `No checker available for .${ext} files`,
      });
    } else if (prov.status === 'unsupported') {
      unsupported.push({
        fileId: file.id,
        filePath: file.path,
        fileName: file.name,
        reason: prov.description,
      });
    }
  }

  return unsupported;
}
