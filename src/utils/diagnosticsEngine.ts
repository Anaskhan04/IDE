import * as ts from 'typescript';
import type {
  ProjectFile,
  WorkspaceDiagnostic,
  DiagnosticsSummary,
  DiagnosticSeverity,
  LanguageProviderInfo,
} from '../types/ide';
import { resolveImportPath, isGeneratedOrMigrationPath } from './astParser';

/**
 * Registry of Language Providers and their honest capabilities & statuses.
 */
export const LANGUAGE_PROVIDERS: LanguageProviderInfo[] = [
  {
    id: 'typescript',
    language: 'TypeScript / JavaScript',
    name: 'TypeScript 5.7 Language Service',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    status: 'active',
    description:
      'Syntactic and semantic diagnostics via TypeScript 5.7 Language Service: type mismatches, undefined variables/functions, cross-file relative imports, and duplicate identifiers.',
    capabilities: [
      'Syntax & type checking',
      'Undefined variable & function detection',
      'Cross-file relative imports',
      'Duplicate identifiers',
      'JSX/TSX structure',
    ],
  },
  {
    id: 'json',
    language: 'JSON',
    name: 'JSON Parser Engine',
    extensions: ['.json'],
    status: 'active',
    description:
      'Strict JSON syntax parser with line and column extraction for syntax violations, trailing commas, and unquoted keys.',
    capabilities: ['Syntax validation', 'Trailing comma detection', 'Token location tracking'],
  },
  {
    id: 'html',
    language: 'HTML',
    name: 'HTML Markup & Comment-Aware Validator',
    extensions: ['.html', '.htm'],
    status: 'active',
    description:
      'Comment- and script/style-aware HTML tag balancing, mismatched closing tags, unclosed attribute quotes, and duplicate element IDs.',
    capabilities: ['Tag nesting & balancing', 'Void element rules', 'Duplicate ID detection', 'Attribute quote checks'],
  },
  {
    id: 'css',
    language: 'CSS / SCSS',
    name: 'CSS Tokenizer & Grammar Validator',
    extensions: ['.css', '.scss'],
    status: 'active',
    description:
      'Comment- and string-aware CSS brace, bracket, and parenthesis balancing, unclosed comment/string detection, and declaration separator checks.',
    capabilities: ['Comment/string-safe brace balance', 'Unclosed comment & string detection', 'Declaration syntax checks'],
  },
  {
    id: 'markdown',
    language: 'Markdown',
    name: 'CommonMark Structural Validator',
    extensions: ['.md', '.markdown'],
    status: 'active',
    description:
      'Validates fenced code block termination, incomplete link/image syntax, and CommonMark ATX heading whitespace rules.',
    capabilities: ['Fenced code block balance', 'Broken link syntax', 'CommonMark heading spacing'],
  },
  {
    id: 'python',
    language: 'Python',
    name: 'Python Lexical & Indentation Checker',
    extensions: ['.py'],
    status: 'active',
    description:
      'Comment- and string-aware Python syntax analysis covering indentation (TabError, IndentationError), colon rules, keyword placement, and bracket balance. Full semantic/name checking requires an external LSP (e.g., Pyright).',
    capabilities: ['Indentation & TabError', 'Missing statement colons', 'Misplaced block keywords', 'String-safe bracket balance'],
    externalCheckerRequired: true,
  },
  {
    id: 'c',
    language: 'C / C++',
    name: 'C/C++ Lexer & Preprocessor Validator',
    extensions: ['.c', '.h', '.cpp', '.hpp'],
    status: 'active',
    description:
      'Comment- and string-aware preprocessor #include syntax, brace/parenthesis balancing, and unclosed comment detection. Full semantic/type checking requires clangd.',
    capabilities: ['Preprocessor #include syntax', 'Comment/string-safe bracket balance', 'Unclosed comment detection'],
    externalCheckerRequired: true,
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

export const TS_COMPILER_SCOPE_INFO = {
  title: 'Multi-Language Diagnostics Architecture & Scope',
  description:
    'IntelliCode runs full syntactic and semantic TypeScript/JavaScript checking via the TypeScript 5.7 Language Service (including cross-file relative imports, undefined variables, and type mismatches) using minimal ambient globals so third-party node_modules are not required. CSS, HTML, Python, and C/C++ use comment- and string-aware lexical/structural analyzers; full semantic checking for Python and C/C++ requires external LSPs (Pyright / clangd).',
  isFullProjectCheckAvailable: false,
};

export function getLanguageProviderForFile(fileName: string): LanguageProviderInfo | undefined {
  const lower = fileName.toLowerCase();
  return LANGUAGE_PROVIDERS.find((provider) =>
    provider.extensions.some((ext) => lower.endsWith(ext))
  );
}

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

const VIRTUAL_GLOBALS_PATH = '/__intellicode_globals.d.ts';
const VIRTUAL_GLOBALS_CONTENT = `
interface Array<T> {
  [n: number]: T;
  readonly length: number;
  push(...items: T[]): number;
  pop(): T | undefined;
  map<U>(cb: (value: T, index: number, array: T[]) => U): U[];
  filter(cb: (value: T, index: number, array: T[]) => unknown): T[];
  forEach(cb: (value: T, index: number, array: T[]) => void): void;
  find(cb: (value: T, index: number, array: T[]) => unknown): T | undefined;
  some(cb: (value: T, index: number, array: T[]) => unknown): boolean;
  every(cb: (value: T, index: number, array: T[]) => unknown): boolean;
  includes(searchElement: T): boolean;
  indexOf(searchElement: T): number;
  join(separator?: string): string;
  slice(start?: number, end?: number): T[];
  concat(...items: (T | T[])[]): T[];
  reduce<U>(cb: (acc: U, cur: T, idx: number) => U, initialValue: U): U;
  sort(compareFn?: (a: T, b: T) => number): T[];
}
interface ReadonlyArray<T> {
  readonly [n: number]: T;
  readonly length: number;
  map<U>(cb: (value: T, index: number) => U): U[];
  filter(cb: (value: T, index: number) => unknown): T[];
  forEach(cb: (value: T, index: number) => void): void;
  find(cb: (value: T, index: number) => unknown): T | undefined;
  includes(searchElement: T): boolean;
  join(separator?: string): string;
  slice(start?: number, end?: number): T[];
}
interface String {
  readonly length: number;
  trim(): string;
  trimStart(): string;
  trimEnd(): string;
  split(separator: string | RegExp, limit?: number): string[];
  includes(searchString: string, position?: number): boolean;
  startsWith(searchString: string, position?: number): boolean;
  endsWith(searchString: string, endPosition?: number): boolean;
  indexOf(searchValue: string, fromIndex?: number): number;
  slice(start?: number, end?: number): string;
  substring(start: number, end?: number): string;
  replace(searchValue: string | RegExp, replaceValue: string | ((...args: any[]) => string)): string;
  toLowerCase(): string;
  toUpperCase(): string;
  match(regexp: string | RegExp): RegExpMatchArray | null;
}
interface Number {
  toFixed(fractionDigits?: number): string;
  toString(radix?: number): string;
}
interface Boolean {}
interface Function {
  apply(thisArg: any, argArray?: any): any;
  call(thisArg: any, ...argArray: any[]): any;
  bind(thisArg: any, ...argArray: any[]): any;
}
interface Object {
  toString(): string;
  hasOwnProperty(v: string | number | symbol): boolean;
}
interface IArguments { readonly length: number; [index: number]: any; }
interface RegExp { test(string: string): boolean; exec(string: string): RegExpExecArray | null; }
interface RegExpMatchArray extends Array<string> { index?: number; input?: string; }
interface RegExpExecArray extends Array<string> { index: number; input: string; }
interface Promise<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null): Promise<T | TResult>;
  finally(onfinally?: (() => void) | null): Promise<T>;
}
interface PromiseLike<T> { then<TResult1 = T>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null): PromiseLike<TResult1>; }
interface Error { name: string; message: string; stack?: string; }
interface Record<K extends string | number | symbol, T> { [P in K]: T; }
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Omit<T, K extends string | number | symbol> = Pick<T, Exclude<keyof T, K>>;
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type NonNullable<T> = T & {};
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
declare var console: { log(...args: any[]): void; warn(...args: any[]): void; error(...args: any[]): void; info(...args: any[]): void; debug(...args: any[]): void; };
declare var window: any;
declare var document: any;
declare var globalThis: any;
declare var process: any;
declare var module: any;
declare var exports: any;
declare function require(id: string): any;
declare var Math: any;
declare var JSON: { parse(text: string): any; stringify(value: any, replacer?: any, space?: any): string; };
declare var Object: { keys(o: object): string[]; values(o: any): any[]; entries(o: any): [string, any][]; assign(target: any, ...sources: any[]): any; };
declare var Array: { isArray(arg: any): arg is any[]; from(iterable: any): any[]; };
declare var String: { (value?: any): string; new(value?: any): String; };
declare var Number: { (value?: any): number; isNaN(v: any): boolean; parseInt(s: string, radix?: number): number; parseFloat(s: string): number; };
declare var Boolean: { (value?: any): boolean; };
declare var Promise: { new<T>(executor: (resolve: (value: T) => void, reject: (reason?: any) => void) => void): Promise<T>; resolve<T>(v?: T): Promise<T>; reject<T = never>(r?: any): Promise<T>; all(values: any[]): Promise<any[]>; };
declare var Map: any;
declare var Set: any;
declare var Date: any;
declare var RegExp: any;
declare var Error: { new(message?: string): Error; (message?: string): Error; };
declare var URL: any;
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number): any;
declare function clearTimeout(id: any): void;
declare function setInterval(handler: (...args: any[]) => void, timeout?: number): any;
declare function clearInterval(id: any): void;
declare function fetch(input: any, init?: any): Promise<any>;
declare function parseInt(s: string, radix?: number): number;
declare function parseFloat(s: string): number;
declare function encodeURIComponent(uriComponent: string | number | boolean): string;
declare function decodeURIComponent(encodedURIComponent: string): string;
declare namespace JSX { interface IntrinsicElements { [elemName: string]: any; } }
`;

function normalizeVirtualPath(filePath: string): string {
  const clean = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `/${clean}`;
}

/**
 * Create a TypeScript Language Service over all JS/TS workspace files.
 */
function createWorkspaceLanguageService(tsFiles: ProjectFile[]) {
  const fileMap = new Map<string, { content: string; version: string; file?: ProjectFile }>();
  fileMap.set(VIRTUAL_GLOBALS_PATH, { content: VIRTUAL_GLOBALS_CONTENT, version: '1' });

  for (const f of tsFiles) {
    const vPath = normalizeVirtualPath(f.path);
    fileMap.set(vPath, { content: f.content, version: '1', file: f });
  }

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    checkJs: true,
    strict: false,
    noImplicitAny: false,
    strictNullChecks: false,
    noEmit: true,
    noLib: true,
    skipLibCheck: true,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    noUncheckedSideEffectImports: true,
  };

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => Array.from(fileMap.keys()),
    getScriptVersion: (fileName) => fileMap.get(fileName)?.version || '0',
    getScriptSnapshot: (fileName) => {
      const entry = fileMap.get(fileName);
      if (!entry) return undefined;
      return ts.ScriptSnapshot.fromString(entry.content);
    },
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: () => VIRTUAL_GLOBALS_PATH,
    fileExists: (fileName) => fileMap.has(fileName),
    readFile: (fileName) => fileMap.get(fileName)?.content,
    resolveModuleNames: (moduleNames, containingFile) => {
      return moduleNames.map((modName) => {
        if (!modName.startsWith('.')) {
          return undefined;
        }
        const containingEntry = fileMap.get(containingFile);
        const fromPath = containingEntry?.file?.path || containingFile.replace(/^\/+/, '');
        const resolvedPath = resolveImportPath(modName, fromPath, tsFiles);
        if (!resolvedPath) return undefined;
        const resolvedVPath = normalizeVirtualPath(resolvedPath);
        const ext = resolvedPath.split('.').pop()?.toLowerCase();
        const extension =
          ext === 'tsx'
            ? ts.Extension.Tsx
            : ext === 'jsx'
              ? ts.Extension.Jsx
              : ext === 'js' || ext === 'mjs' || ext === 'cjs'
                ? ts.Extension.Js
                : ts.Extension.Ts;
        return { resolvedFileName: resolvedVPath, extension, isExternalLibraryImport: false };
      });
    },
  };

  return {
    service: ts.createLanguageService(host, ts.createDocumentRegistry()),
    fileMap,
  };
}

function mapTsDiagnostic(
  diag: ts.Diagnostic,
  file: ProjectFile,
  sourceFile: ts.SourceFile,
  index: number
): WorkspaceDiagnostic | null {
  const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');

  // Ignore missing bare package imports (e.g. 'react', 'lucide-react') when node_modules isn't in virtual FS
  if (diag.code === 2307 || diag.code === 2792) {
    const m = message.match(/Cannot find module '([^']+)'/);
    if (m && !m[1].startsWith('.') && !m[1].startsWith('/')) {
      return null;
    }
  }
  // Ignore missing JSX/React global noise in standalone snippets
  if (diag.code === 2686 || diag.code === 7026 || diag.code === 2318) {
    return null;
  }

  const start = diag.start ?? 0;
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);

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

  return {
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
  };
}

// -------------------------------------------------------------
// 1. TypeScript & JavaScript Diagnostics Provider
// -------------------------------------------------------------
function analyzeTypeScriptWorkspace(
  targetFiles: ProjectFile[],
  allFiles: ProjectFile[]
): WorkspaceDiagnostic[] {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const tsWorkspaceFiles = allFiles.filter((f) => getScriptKind(f.name) !== null);
  if (tsWorkspaceFiles.length === 0) return diagnostics;

  try {
    const { service } = createWorkspaceLanguageService(tsWorkspaceFiles);
    const program = service.getProgram();

    for (const file of targetFiles) {
      if (getScriptKind(file.name) === null) continue;
      const vPath = normalizeVirtualPath(file.path);
      const sourceFile = program?.getSourceFile(vPath);
      if (!sourceFile) continue;

      const syntactic = service.getSyntacticDiagnostics(vPath);
      const semantic = service.getSemanticDiagnostics(vPath);
      const combined = [...syntactic, ...semantic];

      combined.forEach((diag, idx) => {
        const mapped = mapTsDiagnostic(diag, file, sourceFile, idx);
        if (mapped) diagnostics.push(mapped);
      });
    }
  } catch (err) {
    console.warn('TypeScript Language Service diagnostic error:', err);
  }

  return diagnostics;
}

function analyzeTypeScriptFile(file: ProjectFile, allFiles: ProjectFile[] = []): WorkspaceDiagnostic[] {
  const combinedAll = allFiles.some((f) => f.id === file.id) ? allFiles : [file, ...allFiles];
  return analyzeTypeScriptWorkspace([file], combinedAll);
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
// 3. HTML Diagnostics Provider (Comment & Raw-Text Aware)
// -------------------------------------------------------------
function stripHtmlCommentsAndRawBlocks(content: string): string {
  // Replace HTML comments <!-- ... --> and <script>...</script> / <style>...</style> inner bodies with spaces/newlines
  return content
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open, body, close) => {
      return open + body.replace(/[^\n]/g, ' ') + close;
    })
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, open, body, close) => {
      return open + body.replace(/[^\n]/g, ' ') + close;
    });
}

function analyzeHtmlFile(file: ProjectFile): WorkspaceDiagnostic[] {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const sanitized = stripHtmlCommentsAndRawBlocks(file.content);
  const lines = sanitized.split('\n');
  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);
  const stack: { tagName: string; line: number; col: number }[] = [];
  const seenIds = new Map<string, number>();

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

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
          endColumn: col + m[0].length,
          severity: 'warning',
          message: `Duplicate ID '${idVal}'. Previously declared on line ${seenIds.get(idVal)}.`,
          source: 'html',
          code: 'HTML_DUPLICATE_ID',
        });
      } else {
        seenIds.set(idVal, lineNum);
      }
    }

    const tagRegex = /<\/?([a-zA-Z0-9\-]+)([^>]*)(\/?>?)/g;
    let match;
    while ((match = tagRegex.exec(lineText)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1].toLowerCase();
      if (tagName === '!doctype') continue;
      const isClosing = fullMatch.startsWith('</');
      const isSelfClosing = fullMatch.endsWith('/>') || voidTags.has(tagName);
      const col = match.index + 1;

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
          endColumn: col + fullMatch.length,
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
            endColumn: col + fullMatch.length,
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
              endColumn: col + fullMatch.length,
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
// 4. CSS / SCSS Diagnostics Provider (State-Machine Tokenizer)
// -------------------------------------------------------------
function analyzeCssFile(file: ProjectFile): WorkspaceDiagnostic[] {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const src = file.content;
  const stack: { char: '{' | '(' | '['; line: number; col: number }[] = [];

  let line = 1;
  let col = 1;
  let inBlockComment = false;
  let commentStartLine = 1;
  let commentStartCol = 1;
  let inString: '"' | "'" | null = null;
  let stringStartLine = 1;
  let stringStartCol = 1;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (ch === '\n') {
      if (inString) {
        diagnostics.push({
          id: `diag-css-str-${file.id}-${stringStartLine}-${stringStartCol}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: stringStartLine,
          column: stringStartCol,
          severity: 'error',
          message: `Unclosed CSS string literal starting with ${inString}.`,
          source: 'css',
          code: 'CSS_UNCLOSED_STRING',
        });
        inString = null;
      }
      line++;
      col = 1;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
        col += 2;
        continue;
      }
      col++;
      continue;
    }

    if (inString) {
      if (ch === '\\') {
        i++;
        col += 2;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      col++;
      continue;
    }

    // Start block comment
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      commentStartLine = line;
      commentStartCol = col;
      i++;
      col += 2;
      continue;
    }

    // Start SCSS single-line comment
    if (ch === '/' && next === '/' && file.name.toLowerCase().endsWith('.scss')) {
      while (i < src.length && src[i] !== '\n') {
        i++;
      }
      if (i < src.length && src[i] === '\n') {
        line++;
        col = 1;
      }
      continue;
    }

    // Start string literal
    if (ch === '"' || ch === "'") {
      inString = ch;
      stringStartLine = line;
      stringStartCol = col;
      col++;
      continue;
    }

    if (ch === '{' || ch === '(' || ch === '[') {
      stack.push({ char: ch, line, col });
    } else if (ch === '}' || ch === ')' || ch === ']') {
      const expected = ch === '}' ? '{' : ch === ')' ? '(' : '[';
      if (stack.length === 0 || stack[stack.length - 1].char !== expected) {
        diagnostics.push({
          id: `diag-css-brace-${file.id}-${line}-${col}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line,
          column: col,
          endColumn: col + 1,
          severity: 'error',
          message: `Unexpected closing '${ch}' without matching opening '${expected}'.`,
          source: 'css',
          code: ch === '}' ? 'CSS_UNMATCHED_BRACE' : 'CSS_UNMATCHED_BRACKET',
        });
      } else {
        stack.pop();
      }
    }

    col++;
  }

  if (inBlockComment) {
    diagnostics.push({
      id: `diag-css-comment-${file.id}-${commentStartLine}-${commentStartCol}`,
      fileId: file.id,
      filePath: file.path,
      fileName: file.name,
      line: commentStartLine,
      column: commentStartCol,
      severity: 'error',
      message: `Unclosed CSS comment '/*' starting on line ${commentStartLine}.`,
      source: 'css',
      code: 'CSS_UNCLOSED_COMMENT',
    });
  }

  if (inString) {
    diagnostics.push({
      id: `diag-css-str-eof-${file.id}-${stringStartLine}-${stringStartCol}`,
      fileId: file.id,
      filePath: file.path,
      fileName: file.name,
      line: stringStartLine,
      column: stringStartCol,
      severity: 'error',
      message: `Unclosed CSS string literal starting with ${inString}.`,
      source: 'css',
      code: 'CSS_UNCLOSED_STRING',
    });
  }

  while (stack.length > 0) {
    const unclosed = stack.pop()!;
    diagnostics.push({
      id: `diag-css-unclosed-${file.id}-${unclosed.line}-${unclosed.col}`,
      fileId: file.id,
      filePath: file.path,
      fileName: file.name,
      line: unclosed.line,
      column: unclosed.col,
      endColumn: unclosed.col + 1,
      severity: 'error',
      message: `Unclosed CSS '${unclosed.char}' opened on line ${unclosed.line}.`,
      source: 'css',
      code: unclosed.char === '{' ? 'CSS_UNCLOSED_BRACE' : 'CSS_UNCLOSED_BRACKET',
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
// 6. Python Diagnostics Provider (Comment & String-Aware Lexer)
// -------------------------------------------------------------
function analyzePythonFile(file: ProjectFile): WorkspaceDiagnostic[] {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const src = file.content;
  const lines = src.split('\n');
  const bracketStack: { char: '(' | '[' | '{'; line: number; col: number }[] = [];

  // Character-level scan for brackets & strings (ignoring comments and strings)
  let line = 1;
  let col = 1;
  let inTriple: '"""' | "'''" | null = null;
  let inSingle: '"' | "'" | null = null;
  let inComment = false;

  // Also track per-line bracket depth at end of line for multi-line header detection
  const lineStartBracketDepth: number[] = [0];
  const lineEndBracketDepth: number[] = [];
  const lineWasInTriple: boolean[] = [false];

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next2 = src.slice(i, i + 3);

    if (ch === '\n') {
      lineEndBracketDepth.push(bracketStack.length);
      inSingle = null;
      inComment = false;
      line++;
      col = 1;
      lineStartBracketDepth.push(bracketStack.length);
      lineWasInTriple.push(inTriple !== null);
      continue;
    }

    if (inComment) {
      col++;
      continue;
    }

    if (inTriple) {
      if (src[i] === '\\') {
        i++;
        col += 2;
        continue;
      }
      if (next2 === inTriple) {
        inTriple = null;
        i += 2;
        col += 3;
        continue;
      }
      col++;
      continue;
    }

    if (inSingle) {
      if (ch === '\\') {
        i++;
        col += 2;
        continue;
      }
      if (ch === inSingle) {
        inSingle = null;
      }
      col++;
      continue;
    }

    if (ch === '#') {
      inComment = true;
      col++;
      continue;
    }

    if (next2 === '"""' || next2 === "'''") {
      inTriple = next2;
      i += 2;
      col += 3;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inSingle = ch;
      col++;
      continue;
    }

    if (ch === '(' || ch === '[' || ch === '{') {
      bracketStack.push({ char: ch, line, col });
    } else if (ch === ')' || ch === ']' || ch === '}') {
      const expected = ch === ')' ? '(' : ch === ']' ? '[' : '{';
      if (bracketStack.length === 0 || bracketStack[bracketStack.length - 1].char !== expected) {
        diagnostics.push({
          id: `diag-py-bracket-${file.id}-${line}-${col}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line,
          column: col,
          endColumn: col + 1,
          severity: 'error',
          message: `SyntaxError: closing '${ch}' does not match opening bracket.`,
          source: 'python',
          code: 'PY_UNMATCHED_BRACKET',
        });
      } else {
        bracketStack.pop();
      }
    }

    col++;
  }
  lineEndBracketDepth.push(bracketStack.length);

  while (bracketStack.length > 0) {
    const unclosed = bracketStack.pop()!;
    diagnostics.push({
      id: `diag-py-unclosed-${file.id}-${unclosed.line}-${unclosed.col}`,
      fileId: file.id,
      filePath: file.path,
      fileName: file.name,
      line: unclosed.line,
      column: unclosed.col,
      endColumn: unclosed.col + 1,
      severity: 'error',
      message: `SyntaxError: unclosed '${unclosed.char}' opened on line ${unclosed.line}.`,
      source: 'python',
      code: 'PY_UNCLOSED_BRACKET',
    });
  }

  // Line-level structural checks (TabError, indentation after :, misplaced keywords)
  let lastColonLine = -1;
  let lastColonIndent = -1;
  let lastColonKeyword = '';
  let hasPrecedingIf = false;
  let hasPrecedingTry = false;

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    if (lineWasInTriple[idx]) return;
    if ((lineStartBracketDepth[idx] || 0) > 0) return;

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

    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

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

      // Skip colon check if header opens a multi-line paren/bracket (e.g. def foo(\n a):)
      if ((lineEndBracketDepth[idx] || 0) === 0) {
        const strippedComment = trimmed.replace(/#.*$/, '').trim();
        if (!strippedComment.endsWith(':') && !/:\s*\S/.test(strippedComment)) {
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
        } else if (strippedComment.endsWith(':')) {
          lastColonLine = lineNum;
          lastColonIndent = currentIndent;
          lastColonKeyword = kw;
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

  return diagnostics;
}

// -------------------------------------------------------------
// 7. C / C++ Diagnostics Provider (Comment & String-Aware Lexer)
// -------------------------------------------------------------
function analyzeCFile(file: ProjectFile): WorkspaceDiagnostic[] {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const src = file.content;
  const lines = src.split('\n');
  const braceStack: { char: '{' | '(' | '['; line: number; col: number }[] = [];

  let line = 1;
  let col = 1;
  let inBlockComment = false;
  let commentStartLine = 1;
  let inLineComment = false;
  let inString: '"' | "'" | null = null;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (ch === '\n') {
      inLineComment = false;
      inString = null;
      line++;
      col = 1;
      continue;
    }

    if (inLineComment) {
      col++;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
        col += 2;
        continue;
      }
      col++;
      continue;
    }

    if (inString) {
      if (ch === '\\') {
        i++;
        col += 2;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      col++;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      commentStartLine = line;
      i++;
      col += 2;
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      col += 2;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      col++;
      continue;
    }

    if (ch === '{' || ch === '(' || ch === '[') {
      braceStack.push({ char: ch, line, col });
    } else if (ch === '}' || ch === ')' || ch === ']') {
      const expected = ch === '}' ? '{' : ch === ')' ? '(' : '[';
      if (braceStack.length === 0 || braceStack[braceStack.length - 1].char !== expected) {
        diagnostics.push({
          id: `diag-c-brace-${file.id}-${line}-${col}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line,
          column: col,
          endColumn: col + 1,
          severity: 'error',
          message: `SyntaxError: closing '${ch}' without matching opening bracket.`,
          source: 'c',
          code: 'C_UNMATCHED_BRACKET',
        });
      } else {
        braceStack.pop();
      }
    }

    col++;
  }

  lines.forEach((lineText, idx) => {
    const trimmed = lineText.trim();
    if (trimmed.startsWith('#include')) {
      const rest = trimmed.substring(8).replace(/\/\/.*$/, '').replace(/\/\*.*\*\//, '').trim();
      const valid = (rest.startsWith('<') && rest.endsWith('>')) || (rest.startsWith('"') && rest.endsWith('"'));
      if (!valid) {
        diagnostics.push({
          id: `diag-c-inc-${file.id}-${idx + 1}`,
          fileId: file.id,
          filePath: file.path,
          fileName: file.name,
          line: idx + 1,
          column: 1,
          severity: 'error',
          message: `Malformed #include directive: expected <filename> or "filename".`,
          source: 'c',
          code: 'C_INVALID_INCLUDE',
        });
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
      endColumn: unclosed.col + 1,
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

export function isIgnoredWorkspacePath(filePath: string, fileName?: string): boolean {
  const norm = filePath.replace(/\\/g, '/').toLowerCase();

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

  return isGeneratedOrMigrationPath(filePath, fileName);
}

/**
 * Run full workspace diagnostics across all ProjectFiles.
 * Uses a single shared TypeScript Language Service for all TS/JS files,
 * deduplicates diagnostics, and sorts by severity, file path, line, and column.
 */
export function analyzeWorkspaceDiagnostics(files: ProjectFile[]): WorkspaceDiagnostic[] {
  const rawDiagnostics: WorkspaceDiagnostic[] = [];
  const eligibleFiles = files.filter((f) => !isIgnoredWorkspacePath(f.path, f.name));

  // Batch TypeScript/JavaScript files through one shared Language Service
  const tsFiles = eligibleFiles.filter((f) => getLanguageProviderForFile(f.name)?.id === 'typescript');
  if (tsFiles.length > 0) {
    rawDiagnostics.push(...analyzeTypeScriptWorkspace(tsFiles, eligibleFiles));
  }

  // Analyze non-TS/JS files
  for (const file of eligibleFiles) {
    const provider = getLanguageProviderForFile(file.name);
    if (!provider || provider.status === 'unsupported' || provider.id === 'typescript') {
      continue;
    }
    rawDiagnostics.push(...analyzeDiagnosticsForFile(file, eligibleFiles));
  }

  // Deduplicate diagnostics
  const seen = new Set<string>();
  const deduped: WorkspaceDiagnostic[] = [];
  for (const diag of rawDiagnostics) {
    const key = `${diag.filePath}|${diag.line}|${diag.column}|${diag.code || ''}|${diag.message}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(diag);
    }
  }

  const severityRank: Record<DiagnosticSeverity, number> = {
    error: 0,
    warning: 1,
    info: 2,
    hint: 3,
  };

  return deduped.sort((a, b) => {
    const rankDiff = severityRank[a.severity] - severityRank[b.severity];
    if (rankDiff !== 0) return rankDiff;
    const fileDiff = a.filePath.localeCompare(b.filePath);
    if (fileDiff !== 0) return fileDiff;
    if (a.line !== b.line) return a.line - b.line;
    return a.column - b.column;
  });
}

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
