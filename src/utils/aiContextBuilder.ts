import type {
  CIAResult,
  GraphEdge,
  GraphNode,
  ProjectFile,
  WorkspaceDiagnostic,
} from '../types/ide';

const SENSITIVE_PATH_PATTERNS = [
  /(^|\/)\.env($|\.)/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /(^|\/)id_rsa/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.netrc$/i,
  /(^|\/)\.git(\/|$)/i,
  /credentials/i,
  /secrets?\.(json|ya?ml|toml|txt|ts|js)$/i,
  /service[-_]?account.*\.json$/i,
];

/**
 * Returns true if a file path likely contains secrets or sensitive credentials.
 */
export function isSensitiveFilePath(filePath: string): boolean {
  const norm = filePath.replace(/\\/g, '/').trim();
  return SENSITIVE_PATH_PATTERNS.some((re) => re.test(norm));
}

/**
 * Redact inline API keys or private keys before sending code snippets to external LLMs.
 */
export function redactInlineSecrets(content: string): string {
  return String(content || '')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/AIza[0-9A-Za-z\-_]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/sk-(?:ant-|proj-)?[0-9A-Za-z\-_]{16,}/g, '[REDACTED_API_KEY]')
    .replace(/gh[pousr]_[A-Za-z0-9_]{10,}/g, '[REDACTED_GH_TOKEN]')
    .replace(/github_pat_[A-Za-z0-9_]{10,}/g, '[REDACTED_GH_TOKEN]');
}

export interface ContextBundle {
  systemPrompt: string;
  includedFiles: { path: string; reason: string }[];
  excludedSensitive: string[];
}

/**
 * Build relevance-ranked, secret-filtered workspace context using AST, Knowledge Graph,
 * Diagnostics, and Change Impact Analysis.
 */
export function selectRelevantContext(options: {
  projectName: string;
  files: ProjectFile[];
  activeFile?: ProjectFile;
  selectedCode?: string;
  attachedPaths?: string[];
  graphNodes?: GraphNode[];
  graphEdges?: GraphEdge[];
  diagnostics?: WorkspaceDiagnostic[];
  ciaResult?: CIAResult;
  maxChars?: number;
}): ContextBundle {
  const {
    projectName,
    files,
    activeFile,
    selectedCode = '',
    attachedPaths = [],
    graphNodes = [],
    graphEdges = [],
    diagnostics = [],
    ciaResult,
    maxChars = 24000,
  } = options;

  const includedFiles: { path: string; reason: string }[] = [];
  const excludedSensitive: string[] = [];
  const addedPaths = new Set<string>();
  const codeBlocks: string[] = [];
  let charBudget = maxChars;

  const tryAddFile = (file: ProjectFile | undefined, reason: string, limit = 7000) => {
    if (!file) return;
    if (isSensitiveFilePath(file.path)) {
      if (!excludedSensitive.includes(file.path)) excludedSensitive.push(file.path);
      return;
    }
    if (addedPaths.has(file.path) || charBudget <= 300) return;
    addedPaths.add(file.path);
    includedFiles.push({ path: file.path, reason });
    const sliceLen = Math.min(limit, charBudget);
    const safeContent = redactInlineSecrets(file.content).slice(0, sliceLen);
    const block = `\nFILE (${file.path}) [${reason}]:\n\`\`\`${file.language}\n${safeContent}\n\`\`\`\n`;
    codeBlocks.push(block);
    charBudget -= block.length;
  };

  // 1. Explicitly attached @file paths (highest priority)
  for (const p of attachedPaths) {
    const match = files.find((f) => f.path === p || f.name === p);
    if (match) tryAddFile(match, 'Attached (@file)', 7000);
    else if (isSensitiveFilePath(p) && !excludedSensitive.includes(p)) excludedSensitive.push(p);
  }

  // 2. Active file
  tryAddFile(activeFile, 'Active Editor', 8000);

  // 3. Knowledge Graph direct imports & dependents of active file
  if (activeFile && graphNodes.length > 0 && graphEdges.length > 0) {
    const activeNodeIds = new Set(
      graphNodes.filter((n) => n.path === activeFile.path).map((n) => n.id)
    );
    const relatedPaths = new Set<string>();
    const nodeById = new Map(graphNodes.map((n) => [n.id, n]));

    for (const edge of graphEdges) {
      if (edge.type !== 'IMPORTS' && edge.type !== 'CALLS') continue;
      if (activeNodeIds.has(edge.source)) {
        const tgt = nodeById.get(edge.target);
        if (tgt && tgt.path !== activeFile.path) relatedPaths.add(tgt.path);
      } else if (activeNodeIds.has(edge.target)) {
        const src = nodeById.get(edge.source);
        if (src && src.path !== activeFile.path) relatedPaths.add(src.path);
      }
    }

    for (const relPath of Array.from(relatedPaths).slice(0, 5)) {
      const f = files.find((x) => x.path === relPath);
      tryAddFile(f, 'Graph Dependency', 3500);
    }
  }

  // 4. Files with diagnostics
  for (const d of diagnostics.slice(0, 6)) {
    const f = files.find((x) => x.path === d.filePath);
    tryAddFile(f, 'Has Diagnostics', 3000);
  }

  // Safe workspace file tree summary (excluding sensitive files)
  const safeFiles = files.filter((f) => {
    if (isSensitiveFilePath(f.path)) {
      if (!excludedSensitive.includes(f.path)) excludedSensitive.push(f.path);
      return false;
    }
    return true;
  });

  const fileListText =
    safeFiles.length > 0
      ? safeFiles
          .slice(0, 60)
          .map((f) => `- ${f.path} (${f.content.split('\n').length} lines)`)
          .join('\n')
      : '(Workspace is currently empty)';

  const selectedBlock = selectedCode.trim()
    ? `\nSELECTED CODE IN EDITOR:\n\`\`\`\n${redactInlineSecrets(selectedCode).slice(0, 4000)}\n\`\`\`\n`
    : '';

  // AST symbols summary for active + included files
  const symbolLines: string[] = [];
  for (const inc of includedFiles.slice(0, 5)) {
    const f = safeFiles.find((x) => x.path === inc.path);
    if (f?.symbols && f.symbols.length > 0) {
      const syms = f.symbols.slice(0, 15).map((s) => `${s.kind} ${s.name} (L${s.line})`).join(', ');
      symbolLines.push(`- ${f.path}: ${syms}`);
    }
  }
  const astBlock = symbolLines.length > 0 ? `\nAST SYMBOLS:\n${symbolLines.join('\n')}\n` : '';

  const diagBlock =
    diagnostics.length > 0
      ? `\nCURRENT WORKSPACE DIAGNOSTICS (${diagnostics.length}):\n` +
        diagnostics
          .slice(0, 15)
          .map((d) => `- [${d.severity}] ${d.filePath}:${d.line}:${d.column} - ${d.message}`)
          .join('\n')
      : '';

  const ciaBlock =
    ciaResult && ciaResult.targetPath && (ciaResult.directAffected.length > 0 || ciaResult.indirectAffected.length > 0)
      ? `\nCHANGE IMPACT ANALYSIS (${ciaResult.targetPath}, blast radius ${ciaResult.blastRadiusScore}/100):\n` +
        ciaResult.directAffected.slice(0, 8).map((d) => `- Direct: ${d.path} (${d.reason})`).join('\n') +
        (ciaResult.indirectAffected.length > 0
          ? '\n' + ciaResult.indirectAffected.slice(0, 6).map((d) => `- Indirect (depth ${d.depth}): ${d.path}`).join('\n')
          : '')
      : '';

  const systemPrompt = `You are an expert AI software engineer inside IntelliCode IDE.
Active Workspace: ${projectName || 'workspace'}

WORKSPACE FILES (${safeFiles.length} non-sensitive files):
${fileListText}
${selectedBlock}${codeBlocks.join('')}${astBlock}${diagBlock}${ciaBlock}

INSTRUCTIONS:
1. Answer clearly and accurately using only the real workspace context provided above.
2. When creating or modifying files, output COMPLETE file contents in fenced code blocks with this header format:
\`\`\`<lang> file="relative/path/to/file.ext"
// complete file content
\`\`\`
3. Never use path traversal (..) or target sensitive files (.env, credentials, keys).`;

  return { systemPrompt, includedFiles, excludedSensitive };
}
