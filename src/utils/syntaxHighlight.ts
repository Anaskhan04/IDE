export type SyntaxTokenType =
  | 'keyword'
  | 'function'
  | 'string'
  | 'number'
  | 'comment'
  | 'type'
  | 'tag'
  | 'variable'
  | 'operator'
  | 'plain';

export interface SyntaxToken {
  text: string;
  type: SyntaxTokenType;
}

const JS_TS_KEYWORDS = new Set([
  'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends',
  'false', 'finally', 'for', 'from', 'function', 'if', 'implements', 'import',
  'in', 'instanceof', 'interface', 'let', 'new', 'null', 'of', 'package',
  'private', 'protected', 'public', 'readonly', 'return', 'static', 'super',
  'switch', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined',
  'var', 'void', 'while', 'with', 'yield',
]);

const PY_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for',
  'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not',
  'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
]);

const C_KEYWORDS = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'inline',
  'int', 'long', 'namespace', 'nullptr', 'public', 'private', 'protected',
  'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct',
  'switch', 'template', 'this', 'typedef', 'typename', 'union', 'unsigned',
  'using', 'virtual', 'void', 'volatile', 'while', 'class', 'bool', 'true', 'false',
]);

const BUILTIN_TYPES = new Set([
  'string', 'number', 'boolean', 'unknown', 'never', 'any', 'object', 'symbol',
  'bigint', 'Record', 'Partial', 'Required', 'Readonly', 'Promise', 'Array',
  'Map', 'Set', 'React', 'HTMLElement', 'HTMLTextAreaElement', 'HTMLDivElement',
  'FC', 'JSX', 'Error', 'Date', 'RegExp', 'str', 'int', 'float', 'list', 'dict',
  'tuple', 'bool', 'size_t', 'uint8_t', 'uint32_t', 'int32_t', 'std',
]);

function getKeywords(language?: string): Set<string> {
  const lang = (language || '').toLowerCase();
  if (lang === 'python' || lang === 'py') return PY_KEYWORDS;
  if (lang === 'c' || lang === 'cpp' || lang === 'c++') return C_KEYWORDS;
  return JS_TS_KEYWORDS;
}

/**
 * Tokenizes a single source line into lightweight syntax spans.
 * Preserves exact character length so the overlay aligns 1:1 with the underlying textarea.
 */
export function tokenizeLine(line: string, language?: string): SyntaxToken[] {
  if (!line) return [];
  const lang = (language || '').toLowerCase();
  const tokens: SyntaxToken[] = [];
  const keywords = getKeywords(lang);
  const isPython = lang === 'python' || lang === 'py';
  const isJson = lang === 'json';
  const isHtml = lang === 'html' || lang === 'xml';
  const isCss = lang === 'css' || lang === 'scss';
  const isMarkdown = lang === 'markdown' || lang === 'md';

  if (isMarkdown) {
    if (/^\s*#{1,6}\s/.test(line)) {
      return [{ text: line, type: 'keyword' }];
    }
    if (/^\s*```/.test(line)) {
      return [{ text: line, type: 'comment' }];
    }
    if (/^\s*[-*+]\s/.test(line)) {
      const m = line.match(/^(\s*[-*+]\s)(.*)$/);
      if (m) {
        return [
          { text: m[1], type: 'operator' },
          { text: m[2], type: 'plain' },
        ];
      }
    }
  }

  let i = 0;
  const len = line.length;

  const pushToken = (text: string, type: SyntaxTokenType) => {
    if (!text) return;
    const prev = tokens[tokens.length - 1];
    if (prev && prev.type === type) {
      prev.text += text;
    } else {
      tokens.push({ text, type });
    }
  };

  while (i < len) {
    const ch = line[i];

    // Comments
    if (!isJson && !isHtml && ch === '/' && line[i + 1] === '/') {
      pushToken(line.slice(i), 'comment');
      break;
    }
    if (!isJson && ch === '/' && line[i + 1] === '*') {
      const end = line.indexOf('*/', i + 2);
      if (end === -1) {
        pushToken(line.slice(i), 'comment');
        break;
      }
      pushToken(line.slice(i, end + 2), 'comment');
      i = end + 2;
      continue;
    }
    if (isPython && ch === '#') {
      pushToken(line.slice(i), 'comment');
      break;
    }
    if (isHtml && line.startsWith('<!--', i)) {
      const end = line.indexOf('-->', i + 4);
      if (end === -1) {
        pushToken(line.slice(i), 'comment');
        break;
      }
      pushToken(line.slice(i, end + 3), 'comment');
      i = end + 3;
      continue;
    }

    // Strings & template literals
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < len) {
        if (line[j] === '\\') {
          j += 2;
          continue;
        }
        if (line[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      const strText = line.slice(i, j);
      if (isJson && /^\s*:/.test(line.slice(j))) {
        pushToken(strText, 'function');
      } else {
        pushToken(strText, 'string');
      }
      i = j;
      continue;
    }

    // JSX / HTML tags like <Component, </div, <div
    if (ch === '<' && (line[i + 1] === '/' || /[A-Za-z]/.test(line[i + 1] || ''))) {
      const isClosing = line[i + 1] === '/';
      const start = isClosing ? i + 2 : i + 1;
      let j = start;
      while (j < len && /[A-Za-z0-9_.-]/.test(line[j])) j += 1;
      if (j > start) {
        pushToken(line.slice(i, start), 'operator');
        const tagName = line.slice(start, j);
        pushToken(tagName, /^[A-Z]/.test(tagName) ? 'type' : 'tag');
        i = j;
        continue;
      }
    }

    // Numbers
    if (/[0-9]/.test(ch) && (i === 0 || !/[A-Za-z0-9_$]/.test(line[i - 1]))) {
      let j = i + 1;
      while (j < len && /[0-9a-fA-FxXbBoO._]/.test(line[j])) j += 1;
      pushToken(line.slice(i, j), 'number');
      i = j;
      continue;
    }

    // Identifiers, keywords, types, functions
    if (/[A-Za-z_$@]/.test(ch)) {
      let j = i + 1;
      while (j < len && /[A-Za-z0-9_$-]/.test(line[j])) j += 1;
      const word = line.slice(i, j);
      if (word.startsWith('@') || (isCss && word.startsWith('--'))) {
        pushToken(word, 'type');
      } else if (keywords.has(word)) {
        pushToken(word, 'keyword');
      } else if (BUILTIN_TYPES.has(word) || /^[A-Z][A-Za-z0-9_]*$/.test(word)) {
        pushToken(word, 'type');
      } else if (line[j] === '(') {
        pushToken(word, 'function');
      } else if (isCss && line[j] === ':') {
        pushToken(word, 'function');
      } else {
        pushToken(word, 'variable');
      }
      i = j;
      continue;
    }

    // Operators / punctuation
    if (/[=+\-*/<>!&|?:;.,{}()[\]]/.test(ch)) {
      pushToken(ch, 'operator');
      i += 1;
      continue;
    }

    pushToken(ch, 'plain');
    i += 1;
  }

  return tokens;
}

export const SYNTAX_TOKEN_COLOR_STYLE: Record<SyntaxTokenType, string> = {
  keyword: 'rgb(var(--syntax-keyword))',
  function: 'rgb(var(--syntax-function))',
  string: 'rgb(var(--syntax-string))',
  number: 'rgb(var(--syntax-number))',
  comment: 'rgb(var(--syntax-comment))',
  type: 'rgb(var(--syntax-type))',
  tag: 'rgb(var(--syntax-tag))',
  variable: 'rgb(var(--syntax-variable))',
  operator: 'rgb(var(--syntax-operator))',
  plain: 'rgb(var(--ide-text))',
};
