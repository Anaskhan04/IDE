import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { executeTerminalCommand, isAuthorizedLocalRequest } from './vite-terminal-utils.js';
import {
  checkoutBranchSafe,
  discardFileChanges,
  fetchFromRemote,
  formatGitError,
  getAheadBehindCounts,
  parseGitStatusPorcelain,
  runGit,
} from './vite-git-utils.js';

/**
 * Resolve a relative file/folder path safely inside a workspace root.
 */
function resolveSafePath(rootDir, relativePath) {
  const normalizedRoot = path.resolve(rootDir);
  const cleanRel = String(relativePath || '').replace(/^[/\\]+/, '');
  const resolved = path.resolve(normalizedRoot, cleanRel);
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
    throw new Error(`Path escapes workspace root: ${relativePath}`);
  }
  return resolved;
}

/**
 * Helper to parse json body from request stream.
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

/**
 * Find candidate directories on disk matching a folder name.
 */
function findFolderByName(folderName, sampleFiles = []) {
  if (!folderName) return null;
  const cwd = process.cwd();

  if (path.basename(cwd).toLowerCase() === folderName.toLowerCase() || folderName.toLowerCase() === 'ide') {
    return cwd;
  }

  const defaultProjectsDir = path.join(os.homedir(), 'IntelliCodeProjects');
  const searchRoots = [
    defaultProjectsDir,
    path.resolve(cwd, '..'),
    path.resolve(cwd, '../..'),
    path.resolve(cwd, '../../..'),
  ];

  for (const root of searchRoots) {
    if (!fs.existsSync(root)) continue;

    const directPath = path.join(root, folderName);
    if (fs.existsSync(directPath) && fs.statSync(directPath).isDirectory()) {
      return directPath;
    }

    try {
      const items = fs.readdirSync(root, { withFileTypes: true });
      for (const item of items) {
        if (!item.isDirectory() || item.name.startsWith('.') || item.name === 'node_modules') continue;
        const subChild = path.join(root, item.name, folderName);
        if (fs.existsSync(subChild) && fs.statSync(subChild).isDirectory()) {
          return subChild;
        }

        if (item.name.toLowerCase() === folderName.toLowerCase()) {
          return path.join(root, item.name);
        }
      }
    } catch {
      // ignore read permission errors
    }
  }

  return null;
}

/**
 * Recursively read directory for opening workspace by path
 */
function readDirectoryRecursive(dirPath, basePath = '', maxFiles = 300) {
  const result = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (result.length >= maxFiles) break;
    const fullPath = path.join(dirPath, entry.name);
    const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (
        entry.name === '.git' ||
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === '.next' ||
        entry.name === 'build' ||
        entry.name === '.cache'
      ) {
        continue;
      }
      result.push(...readDirectoryRecursive(fullPath, relPath, maxFiles - result.length));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const binaryExts = ['.exe', '.dll', '.bin', '.iso', '.zip', '.tar', '.gz', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.woff', '.woff2'];
      if (binaryExts.includes(ext)) continue;

      try {
        const stats = fs.statSync(fullPath);
        if (stats.size > 500 * 1024) continue;

        const content = fs.readFileSync(fullPath, 'utf8');
        result.push({
          id: `file-${Buffer.from(relPath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}-${result.length}`,
          name: entry.name,
          path: relPath.replace(/\\/g, '/'),
          language: ext.slice(1) || 'typescript',
          content,
          savedContent: content,
          isDirty: false,
        });
      } catch {
        // ignore unreadable files
      }
    }
  }

  return result;
}

/**
 * Parse owner/repo from a GitHub remote URL
 */
function parseGitHubRemote(remoteUrl) {
  if (!remoteUrl) return null;
  const trimmed = remoteUrl.trim();
  const httpsMatch = trimmed.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }
  return null;
}

/**
 * Call GitHub REST API cleanly
 */
async function githubFetch(endpoint, token, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'IntelliCode-IDE',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { message: text };
  }

  return { ok: res.ok, status: res.status, data: json, headers: res.headers };
}

export function gitApiPlugin() {
  const setupMiddleware = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url ? req.url.split('?')[0] : '';

      if (
        !url.startsWith('/api/git') &&
        !url.startsWith('/api/workspace') &&
        !url.startsWith('/api/terminal') &&
        !url.startsWith('/api/ai') &&
        !url.startsWith('/api/github')
      ) {
        return next();
      }

      try {
        if (!isAuthorizedLocalRequest(req)) {
          return sendJson(res, 403, { success: false, error: 'Forbidden: local API access restricted to localhost' });
        }

        if (req.method !== 'POST') {
          return sendJson(res, 405, { error: 'Method not allowed' });
        }

        const body = await readJsonBody(req);

        // ============================================================
        // GIT ENDPOINTS
        // ============================================================

        if (url === '/api/git/resolve-workspace') {
          let resolvedDir = null;
          if (body.path && fs.existsSync(body.path) && fs.statSync(body.path).isDirectory()) {
            resolvedDir = path.resolve(body.path);
          } else if (body.folderName) {
            resolvedDir = findFolderByName(body.folderName, body.sampleFiles);
          }

          if (!resolvedDir) {
            return sendJson(res, 200, {
              success: false,
              isGit: false,
              message: `Could not locate directory on host for "${body.folderName || body.path}"`,
            });
          }

          resolvedDir = resolvedDir.replace(/\\/g, '/');

          const checkGit = await runGit(['rev-parse', '--is-inside-work-tree'], resolvedDir);
          if (checkGit.code !== 0 || !checkGit.stdout.includes('true')) {
            return sendJson(res, 200, {
              success: true,
              workspacePath: resolvedDir,
              isGit: false,
              message: 'No Git repository found in this workspace',
            });
          }

          const topLevel = await runGit(['rev-parse', '--show-toplevel'], resolvedDir);
          const repoRoot = (topLevel.stdout.trim() || resolvedDir).replace(/\\/g, '/');

          let branchResult = await runGit(['branch', '--show-current'], resolvedDir);
          let branch = branchResult.stdout.trim();
          if (!branch) {
            const abbrev = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], resolvedDir);
            branch = abbrev.stdout.trim() || 'main';
          }

          const remoteRes = await runGit(['remote', 'get-url', 'origin'], repoRoot);
          const remoteUrl = remoteRes.code === 0 ? remoteRes.stdout.trim() : '';

          return sendJson(res, 200, {
            success: true,
            workspacePath: resolvedDir,
            repoRoot,
            isGit: true,
            branch,
            remoteUrl,
            githubRepo: parseGitHubRemote(remoteUrl),
          });
        }

        if (url === '/api/git/status') {
          const targetDir = body.repoRoot || body.workspacePath;
          if (!targetDir || !fs.existsSync(targetDir)) {
            return sendJson(res, 400, { error: 'Invalid repository directory' });
          }

          const checkGit = await runGit(['rev-parse', '--is-inside-work-tree'], targetDir);
          if (checkGit.code !== 0) {
            return sendJson(res, 200, {
              success: true,
              isGit: false,
              message: 'No Git repository found',
              stagedFiles: [],
              unstagedFiles: [],
            });
          }

          const topLevel = await runGit(['rev-parse', '--show-toplevel'], targetDir);
          const repoRoot = (topLevel.stdout.trim() || targetDir).replace(/\\/g, '/');

          let branchResult = await runGit(['branch', '--show-current'], repoRoot);
          let branch = branchResult.stdout.trim();
          if (!branch) {
            const abbrev = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot);
            branch = abbrev.stdout.trim() || 'main';
          }

          const remoteRes = await runGit(['remote', 'get-url', 'origin'], repoRoot);
          const remoteUrl = remoteRes.code === 0 ? remoteRes.stdout.trim() : '';

          const statusResult = await runGit(['status', '--porcelain=v1', '-uall'], repoRoot);
          if (statusResult.code !== 0) {
            return sendJson(res, 200, {
              success: false,
              isGit: true,
              error: statusResult.stderr || 'Failed to read git status',
            });
          }

          const { stagedFiles, unstagedFiles } = parseGitStatusPorcelain(statusResult.stdout);
          const { ahead, behind, hasUpstream } = await getAheadBehindCounts(repoRoot);

          return sendJson(res, 200, {
            success: true,
            isGit: true,
            repoRoot,
            branch,
            remoteUrl,
            githubRepo: parseGitHubRemote(remoteUrl),
            ahead,
            behind,
            hasUpstream,
            stagedFiles,
            unstagedFiles,
          });
        }

        if (url === '/api/git/log') {
          const repoRoot = body.repoRoot;
          if (!repoRoot || !fs.existsSync(repoRoot)) {
            return sendJson(res, 400, { error: 'Invalid repository directory' });
          }

          const limit = body.limit || 25;
          const logResult = await runGit(
            ['log', `-n${limit}`, '--pretty=format:%h%x09%s%x09%an%x09%cr%x09%at'],
            repoRoot
          );

          if (logResult.code !== 0) {
            if (
              logResult.stderr.includes('does not have any commits yet') ||
              logResult.stderr.includes('unknown revision')
            ) {
              return sendJson(res, 200, { success: true, commits: [] });
            }
            return sendJson(res, 200, {
              success: false,
              error: logResult.stderr || 'Failed to read git log',
              commits: [],
            });
          }

          const commits = [];
          const lines = logResult.stdout.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.split('\t');
            if (parts.length >= 4) {
              commits.push({
                hash: parts[0].trim(),
                message: parts[1].trim(),
                author: parts[2].trim(),
                time: parts[3].trim(),
              });
            }
          }

          return sendJson(res, 200, { success: true, commits });
        }

        if (url === '/api/git/stage') {
          const repoRoot = body.repoRoot;
          if (!repoRoot || !fs.existsSync(repoRoot)) {
            return sendJson(res, 400, { error: 'Invalid repository directory' });
          }

          let stageResult;
          if (body.all) {
            stageResult = await runGit(['add', '-A'], repoRoot);
          } else if (Array.isArray(body.filePaths) && body.filePaths.length > 0) {
            stageResult = await runGit(['add', '--', ...body.filePaths], repoRoot);
          } else {
            return sendJson(res, 400, { error: 'No files specified to stage' });
          }

          if (stageResult.code !== 0) {
            return sendJson(res, 200, {
              success: false,
              error: stageResult.stderr || 'Failed to stage files',
            });
          }

          return sendJson(res, 200, { success: true });
        }

        if (url === '/api/git/unstage') {
          const repoRoot = body.repoRoot;
          if (!repoRoot || !fs.existsSync(repoRoot)) {
            return sendJson(res, 400, { error: 'Invalid repository directory' });
          }

          let unstageResult;
          if (body.all) {
            unstageResult = await runGit(['restore', '--staged', '.'], repoRoot);
            if (unstageResult.code !== 0) {
              unstageResult = await runGit(['reset', 'HEAD'], repoRoot);
            }
          } else if (Array.isArray(body.filePaths) && body.filePaths.length > 0) {
            unstageResult = await runGit(['restore', '--staged', '--', ...body.filePaths], repoRoot);
            if (unstageResult.code !== 0) {
              unstageResult = await runGit(['reset', 'HEAD', '--', ...body.filePaths], repoRoot);
            }
          } else {
            return sendJson(res, 400, { error: 'No files specified to unstage' });
          }

          if (unstageResult.code !== 0) {
            return sendJson(res, 200, {
              success: false,
              error: unstageResult.stderr || 'Failed to unstage files',
            });
          }

          return sendJson(res, 200, { success: true });
        }

        if (url === '/api/git/discard') {
          const repoRoot = body.repoRoot;
          const filePath = body.filePath;
          if (!repoRoot || !filePath) {
            return sendJson(res, 400, { error: 'Missing repository directory or file path' });
          }

          const discardResult = await discardFileChanges(repoRoot, filePath);
          return sendJson(res, 200, discardResult);
        }

        if (url === '/api/git/commit') {
          const repoRoot = body.repoRoot;
          const message = (body.message || '').trim();
          if (!repoRoot || !message) {
            return sendJson(res, 400, { error: 'Repository directory and commit message are required' });
          }

          if (body.authorName) {
            const checkName = await runGit(['config', 'user.name'], repoRoot);
            if (!checkName.stdout.trim()) {
              await runGit(['config', 'user.name', body.authorName], repoRoot);
            }
          }
          if (body.authorEmail) {
            const checkEmail = await runGit(['config', 'user.email'], repoRoot);
            if (!checkEmail.stdout.trim()) {
              await runGit(['config', 'user.email', body.authorEmail], repoRoot);
            }
          }

          const commitResult = await runGit(['commit', '-m', message], repoRoot);
          if (commitResult.code !== 0) {
            return sendJson(res, 200, {
              success: false,
              error: commitResult.stderr || commitResult.stdout || 'Failed to commit',
            });
          }

          const hashResult = await runGit(['rev-parse', '--short', 'HEAD'], repoRoot);
          const hash = hashResult.stdout.trim();

          return sendJson(res, 200, {
            success: true,
            commitHash: hash,
            message,
          });
        }

        if (url === '/api/git/init') {
          const workspacePath = body.workspacePath;
          if (!workspacePath || !fs.existsSync(workspacePath)) {
            return sendJson(res, 400, { error: 'Valid workspace directory is required' });
          }

          const initResult = await runGit(['init', '-b', 'main'], workspacePath);
          let finalInit = initResult;
          if (initResult.code !== 0) {
            finalInit = await runGit(['init'], workspacePath);
          }
          if (finalInit.code !== 0) {
            return sendJson(res, 200, {
              success: false,
              error: finalInit.stderr || 'Failed to initialize git repository',
            });
          }

          return sendJson(res, 200, {
            success: true,
            repoRoot: workspacePath.replace(/\\/g, '/'),
            branch: 'main',
          });
        }

        if (url === '/api/git/diff') {
          const repoRoot = body.repoRoot;
          const filePath = body.filePath;
          const staged = !!body.staged;

          if (!repoRoot || !filePath) {
            return sendJson(res, 400, { error: 'Repository directory and file path are required' });
          }

          const diffArgs = staged
            ? ['diff', '--cached', '--', filePath]
            : ['diff', '--', filePath];
          const diffResult = await runGit(diffArgs, repoRoot);

          const origResult = await runGit(['show', `HEAD:${filePath}`], repoRoot);
          const originalContent = origResult.code === 0 ? origResult.stdout : '';

          let currentContent = '';
          const fullPath = path.join(repoRoot, filePath);
          if (fs.existsSync(fullPath)) {
            try {
              currentContent = fs.readFileSync(fullPath, 'utf8');
            } catch {
              // ignore
            }
          }

          return sendJson(res, 200, {
            success: true,
            diffText: diffResult.stdout,
            originalContent,
            currentContent,
          });
        }

        if (url === '/api/git/branches') {
          const repoRoot = body.repoRoot;
          if (!repoRoot || !fs.existsSync(repoRoot)) {
            return sendJson(res, 400, { error: 'Invalid repository directory' });
          }
          const branchRes = await runGit(['branch', '--format=%(refname:short)'], repoRoot);
          const currentRes = await runGit(['branch', '--show-current'], repoRoot);
          const branches = branchRes.stdout
            .split('\n')
            .map((b) => b.trim())
            .filter(Boolean);
          return sendJson(res, 200, {
            success: true,
            current: currentRes.stdout.trim() || 'main',
            branches,
          });
        }

        if (url === '/api/git/checkout') {
          const repoRoot = body.repoRoot;
          const branch = (body.branch || '').trim();
          const create = !!body.create;
          if (!repoRoot || !branch) {
            return sendJson(res, 400, { error: 'Repository directory and branch name required' });
          }
          const checkoutRes = await checkoutBranchSafe(repoRoot, branch, create);
          return sendJson(res, 200, checkoutRes);
        }

        if (url === '/api/git/fetch') {
          const repoRoot = body.repoRoot;
          if (!repoRoot || !fs.existsSync(repoRoot)) {
            return sendJson(res, 400, { error: 'Invalid repository directory' });
          }
          const fetchRes = await fetchFromRemote(repoRoot, body.token);
          return sendJson(res, 200, fetchRes);
        }

        if (url === '/api/git/push') {
          const repoRoot = body.repoRoot;
          if (!repoRoot || !fs.existsSync(repoRoot)) {
            return sendJson(res, 400, { error: 'Invalid repository directory' });
          }

          const branchRes = await runGit(['branch', '--show-current'], repoRoot);
          const branch = body.branch || branchRes.stdout.trim() || 'main';
          const args = ['push', '-u', 'origin', branch];
          const pushRes = await runGit(args, repoRoot, body.token);

          if (pushRes.code !== 0) {
            return sendJson(res, 200, {
              success: false,
              error: formatGitError(pushRes.stderr || pushRes.stdout, 'Failed to push to remote'),
            });
          }

          return sendJson(res, 200, {
            success: true,
            branch,
            output: pushRes.stderr || pushRes.stdout || `Pushed to origin/${branch}`,
          });
        }

        if (url === '/api/git/pull') {
          const repoRoot = body.repoRoot;
          if (!repoRoot || !fs.existsSync(repoRoot)) {
            return sendJson(res, 400, { error: 'Invalid repository directory' });
          }

          const branchRes = await runGit(['branch', '--show-current'], repoRoot);
          const branch = body.branch || branchRes.stdout.trim() || 'main';
          const pullRes = await runGit(['pull', 'origin', branch], repoRoot, body.token);

          if (pullRes.code !== 0) {
            return sendJson(res, 200, {
              success: false,
              error: formatGitError(pullRes.stderr || pullRes.stdout, 'Failed to pull from remote'),
            });
          }

          return sendJson(res, 200, {
            success: true,
            branch,
            output: pullRes.stdout || pullRes.stderr || 'Already up to date.',
          });
        }

        // ============================================================
        // WORKSPACE FILE SYSTEM ENDPOINTS
        // ============================================================

        if (url === '/api/workspace/read-folder') {
          const targetPath = body.path;
          if (!targetPath || !fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
            return sendJson(res, 400, { error: `Directory not found on host: "${targetPath}"` });
          }

          const normalizedPath = path.resolve(targetPath);
          const folderName = path.basename(normalizedPath);
          const loadedFiles = readDirectoryRecursive(normalizedPath);

          return sendJson(res, 200, {
            success: true,
            folderName,
            workspacePath: normalizedPath.replace(/\\/g, '/'),
            files: loadedFiles,
          });
        }

        if (url === '/api/workspace/write-file') {
          const { workspacePath, filePath, content } = body;
          if (!workspacePath || !filePath) {
            return sendJson(res, 400, { error: 'workspacePath and filePath are required' });
          }
          const fullPath = resolveSafePath(workspacePath, filePath);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, content ?? '', 'utf8');
          return sendJson(res, 200, { success: true, fullPath: fullPath.replace(/\\/g, '/') });
        }

        if (url === '/api/workspace/delete-file') {
          const { workspacePath, filePath } = body;
          if (!workspacePath || !filePath) {
            return sendJson(res, 400, { error: 'workspacePath and filePath are required' });
          }
          const fullPath = resolveSafePath(workspacePath, filePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
          return sendJson(res, 200, { success: true });
        }

        if (url === '/api/workspace/rename-file') {
          const { workspacePath, oldPath, newPath } = body;
          if (!workspacePath || !oldPath || !newPath) {
            return sendJson(res, 400, { error: 'workspacePath, oldPath, and newPath are required' });
          }
          const srcFull = resolveSafePath(workspacePath, oldPath);
          const destFull = resolveSafePath(workspacePath, newPath);
          fs.mkdirSync(path.dirname(destFull), { recursive: true });
          if (fs.existsSync(srcFull)) {
            fs.renameSync(srcFull, destFull);
          }
          return sendJson(res, 200, { success: true });
        }

        if (url === '/api/workspace/mkdir') {
          const { workspacePath, folderPath } = body;
          if (!workspacePath || !folderPath) {
            return sendJson(res, 400, { error: 'workspacePath and folderPath are required' });
          }
          const fullPath = resolveSafePath(workspacePath, folderPath);
          fs.mkdirSync(fullPath, { recursive: true });
          return sendJson(res, 200, { success: true });
        }

        if (url === '/api/workspace/create-dir') {
          const { folderName, files: initialFiles } = body;
          const cleanName = (folderName || `project-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '-');
          const projectsRoot = path.join(os.homedir(), 'IntelliCodeProjects');
          const targetDir = path.join(projectsRoot, cleanName);
          fs.mkdirSync(targetDir, { recursive: true });
          if (Array.isArray(initialFiles)) {
            for (const f of initialFiles) {
              if (!f?.path) continue;
              const fullPath = resolveSafePath(targetDir, f.path);
              fs.mkdirSync(path.dirname(fullPath), { recursive: true });
              fs.writeFileSync(fullPath, f.content ?? '', 'utf8');
            }
          }
          return sendJson(res, 200, {
            success: true,
            workspacePath: targetDir.replace(/\\/g, '/'),
            folderName: cleanName,
          });
        }

        // ============================================================
        // INTEGRATED TERMINAL EXECUTION
        // ============================================================

        if (url === '/api/terminal/exec') {
          const result = await executeTerminalCommand(body.command, {
            requestedCwd: body.cwd,
            workspaceRoot: body.workspaceRoot,
            fallbackCwd: process.cwd(),
          });
          return sendJson(res, 200, result);
        }

        // ============================================================
        // AI MODEL DISCOVERY & GATEWAY PROXY
        // ============================================================

        if (url === '/api/ai/models') {
          const { format = 'gemini', baseUrl = '', apiKey = '' } = body;

          if (format === 'gemini') {
            if (!apiKey) {
              return sendJson(res, 401, { success: false, error: 'Google Gemini API key is required.' });
            }
            const rootUrl = (baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
            const apiRes = await fetch(`${rootUrl}/models?key=${encodeURIComponent(apiKey)}`);
            const data = await apiRes.json().catch(() => ({}));
            if (!apiRes.ok) {
              return sendJson(res, apiRes.status, {
                success: false,
                error: data?.error?.message || `Failed to list Gemini models (${apiRes.status})`,
              });
            }
            const models = (Array.isArray(data?.models) ? data.models : [])
              .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
              .map((m) => ({
                modelId: String(m.name || '').replace(/^models\//, ''),
                name: m.displayName || String(m.name || '').replace(/^models\//, ''),
                description: m.description || '',
                contextWindow: m.inputTokenLimit ? `${Math.round(m.inputTokenLimit / 1000)}k` : '1M',
              }))
              .filter((m) => m.modelId && /gemini/i.test(m.modelId));
            return sendJson(res, 200, { success: true, models });
          }

          if (format === 'openai') {
            const rootUrl = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
            const headers = {};
            if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
            const apiRes = await fetch(`${rootUrl}/models`, { headers });
            const data = await apiRes.json().catch(() => ({}));
            if (!apiRes.ok) {
              return sendJson(res, apiRes.status, {
                success: false,
                error: data?.error?.message || `Failed to list models (${apiRes.status})`,
              });
            }
            const models = (Array.isArray(data?.data) ? data.data : []).slice(0, 40).map((m) => ({
              modelId: m.id,
              name: m.id,
              description: m.owned_by ? `Owner: ${m.owned_by}` : '',
              contextWindow: '128k',
            }));
            return sendJson(res, 200, { success: true, models });
          }

          return sendJson(res, 200, { success: true, models: [] });
        }

        if (url === '/api/ai/chat') {
          const {
            format = 'openai',
            baseUrl = '',
            apiKey = '',
            modelId,
            messages = [],
            systemPrompt = '',
            temperature = 0.2,
            maxTokens = 8192,
          } = body;

          if (!modelId) {
            return sendJson(res, 400, { success: false, error: 'Model ID is required' });
          }

          if (format === 'gemini') {
            if (!apiKey) {
              return sendJson(res, 401, { success: false, error: 'Google Gemini API key is required.' });
            }
            const rootUrl = (baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
            const cleanModel = modelId.replace(/^models\//, '');
            const endpoint = `${rootUrl}/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

            const geminiContents = messages
              .filter((m) => m.role !== 'system' && m.content)
              .map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: String(m.content) }],
              }));

            const payload = {
              contents: geminiContents,
              generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
              },
            };
            if (systemPrompt) {
              payload.systemInstruction = {
                parts: [{ text: systemPrompt }],
              };
            }

            const apiRes = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const data = await apiRes.json().catch(() => ({}));

            if (!apiRes.ok) {
              const errMsg = data?.error?.message || `Gemini API error (${apiRes.status})`;
              return sendJson(res, apiRes.status, { success: false, error: errMsg });
            }

            const candidate = data?.candidates?.[0];
            const replyText = (candidate?.content?.parts || [])
              .map((p) => p.text || '')
              .join('')
              .trim();

            if (!replyText) {
              const blockReason = candidate?.finishReason || data?.promptFeedback?.blockReason;
              return sendJson(res, 200, {
                success: false,
                error: blockReason
                  ? `Gemini returned empty response (${blockReason}).`
                  : 'Gemini returned an empty response.',
              });
            }

            return sendJson(res, 200, {
              success: true,
              content: replyText,
              usage: {
                promptTokens: data?.usageMetadata?.promptTokenCount || 0,
                completionTokens: data?.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: data?.usageMetadata?.totalTokenCount || 0,
              },
            });
          }

          if (format === 'anthropic') {
            if (!apiKey) {
              return sendJson(res, 401, { success: false, error: 'Anthropic API key is required.' });
            }
            const rootUrl = (baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
            const endpoint = rootUrl.endsWith('/messages') ? rootUrl : `${rootUrl}/messages`;

            const anthropicMsgs = messages
              .filter((m) => m.role !== 'system' && m.content)
              .map((m) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: String(m.content),
              }));

            const apiRes = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: modelId,
                max_tokens: maxTokens,
                temperature,
                ...(systemPrompt ? { system: systemPrompt } : {}),
                messages: anthropicMsgs,
              }),
            });

            const data = await apiRes.json().catch(() => ({}));
            if (!apiRes.ok) {
              const errMsg = data?.error?.message || `Anthropic API error (${apiRes.status})`;
              return sendJson(res, apiRes.status, { success: false, error: errMsg });
            }

            const replyText = (data?.content || [])
              .map((c) => c.text || '')
              .join('')
              .trim();

            return sendJson(res, 200, {
              success: true,
              content: replyText,
              usage: {
                promptTokens: data?.usage?.input_tokens || 0,
                completionTokens: data?.usage?.output_tokens || 0,
                totalTokens: (data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0),
              },
            });
          }

          // OpenAI / DeepSeek / OpenRouter / Groq / Ollama / Custom OpenAI-Compatible
          const rootUrl = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
          const endpoint = rootUrl.endsWith('/chat/completions') ? rootUrl : `${rootUrl}/chat/completions`;
          const headers = { 'Content-Type': 'application/json' };
          if (apiKey) {
            headers.Authorization = `Bearer ${apiKey}`;
          }

          const openaiMessages = [];
          if (systemPrompt) {
            openaiMessages.push({ role: 'system', content: systemPrompt });
          }
          for (const m of messages) {
            if (!m.content) continue;
            openaiMessages.push({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: String(m.content),
            });
          }

          const apiRes = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: modelId,
              messages: openaiMessages,
              temperature,
              max_tokens: maxTokens,
            }),
          });

          const data = await apiRes.json().catch(() => ({}));
          if (!apiRes.ok) {
            const errMsg = data?.error?.message || data?.message || `Provider API error (${apiRes.status})`;
            return sendJson(res, apiRes.status, { success: false, error: errMsg });
          }

          const replyText = data?.choices?.[0]?.message?.content || '';
          return sendJson(res, 200, {
            success: true,
            content: replyText,
            usage: {
              promptTokens: data?.usage?.prompt_tokens || 0,
              completionTokens: data?.usage?.completion_tokens || 0,
              totalTokens: data?.usage?.total_tokens || 0,
            },
          });
        }

        // ============================================================
        // GITHUB AUTH & REPOSITORY INTEGRATION
        // ============================================================

        if (url === '/api/github/user') {
          if (!body.token) {
            return sendJson(res, 400, { success: false, error: 'GitHub token is required' });
          }
          const gh = await githubFetch('/user', body.token);
          if (!gh.ok) {
            return sendJson(res, gh.status, {
              success: false,
              error: gh.data?.message || 'Invalid GitHub token',
            });
          }
          const scopes = gh.headers.get('x-oauth-scopes') || '';
          return sendJson(res, 200, {
            success: true,
            user: {
              login: gh.data.login,
              name: gh.data.name || gh.data.login,
              avatarUrl: gh.data.avatar_url,
              htmlUrl: gh.data.html_url,
              email: gh.data.email || `${gh.data.login}@users.noreply.github.com`,
              scopes,
            },
          });
        }

        if (url === '/api/github/device-code') {
          const clientId = (body.clientId || '').trim();
          if (!clientId) {
            return sendJson(res, 400, { success: false, error: 'GitHub OAuth Client ID is required for Device Flow' });
          }
          const resDevice = await fetch('https://github.com/login/device/code', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_id: clientId,
              scope: 'repo read:user user:email',
            }),
          });
          const data = await resDevice.json().catch(() => ({}));
          if (!resDevice.ok || data.error) {
            return sendJson(res, 400, {
              success: false,
              error: data.error_description || data.error || 'Failed to initiate GitHub Device Flow',
            });
          }
          return sendJson(res, 200, { success: true, ...data });
        }

        if (url === '/api/github/device-token') {
          const { clientId, deviceCode } = body;
          if (!clientId || !deviceCode) {
            return sendJson(res, 400, { success: false, error: 'clientId and deviceCode are required' });
          }
          const resToken = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_id: clientId,
              device_code: deviceCode,
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            }),
          });
          const data = await resToken.json().catch(() => ({}));
          return sendJson(res, 200, { success: !!data.access_token, ...data });
        }

        if (url === '/api/github/repos') {
          if (!body.token) {
            return sendJson(res, 401, { success: false, error: 'GitHub authentication required' });
          }
          const gh = await githubFetch(
            '/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member',
            body.token
          );
          if (!gh.ok) {
            return sendJson(res, gh.status, {
              success: false,
              error: gh.data?.message || 'Failed to fetch repositories',
            });
          }
          const repos = (Array.isArray(gh.data) ? gh.data : []).map((r) => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            private: !!r.private,
            description: r.description || '',
            htmlUrl: r.html_url,
            cloneUrl: r.clone_url,
            defaultBranch: r.default_branch || 'main',
            updatedAt: r.updated_at,
            language: r.language || '',
            owner: r.owner?.login || '',
          }));
          return sendJson(res, 200, { success: true, repos });
        }

        if (url === '/api/github/create-repo') {
          const { token, name, description = '', isPrivate = true } = body;
          if (!token || !name) {
            return sendJson(res, 400, { success: false, error: 'Token and repository name are required' });
          }
          const gh = await githubFetch('/user/repos', token, {
            method: 'POST',
            body: {
              name: name.trim(),
              description,
              private: !!isPrivate,
              auto_init: false,
            },
          });
          if (!gh.ok) {
            return sendJson(res, gh.status, {
              success: false,
              error: gh.data?.errors?.[0]?.message || gh.data?.message || 'Failed to create repository on GitHub',
            });
          }
          return sendJson(res, 200, {
            success: true,
            repo: {
              id: gh.data.id,
              name: gh.data.name,
              fullName: gh.data.full_name,
              private: !!gh.data.private,
              description: gh.data.description || '',
              htmlUrl: gh.data.html_url,
              cloneUrl: gh.data.clone_url,
              defaultBranch: gh.data.default_branch || 'main',
              updatedAt: gh.data.updated_at,
              language: gh.data.language || '',
              owner: gh.data.owner?.login || '',
            },
          });
        }

        if (url === '/api/github/clone') {
          const { token, cloneUrl, repoName, owner } = body;
          if (!cloneUrl || !repoName) {
            return sendJson(res, 400, { success: false, error: 'cloneUrl and repoName are required' });
          }

          const baseProjectsDir = path.join(os.homedir(), 'IntelliCodeProjects');
          fs.mkdirSync(baseProjectsDir, { recursive: true });
          const safeDirName = owner ? `${owner}-${repoName}` : repoName;
          const targetDir = path.join(baseProjectsDir, safeDirName.replace(/[^a-zA-Z0-9._-]/g, '-'));

          if (fs.existsSync(path.join(targetDir, '.git'))) {
            await runGit(['pull'], targetDir, token);
          } else {
            if (fs.existsSync(targetDir)) {
              fs.rmSync(targetDir, { recursive: true, force: true });
            }
            const cloneRes = await runGit(['clone', cloneUrl, targetDir], baseProjectsDir, token);
            if (cloneRes.code !== 0) {
              return sendJson(res, 200, {
                success: false,
                error: cloneRes.stderr || 'Failed to clone repository',
              });
            }
          }

          const branchRes = await runGit(['branch', '--show-current'], targetDir);
          const branch = branchRes.stdout.trim() || 'main';
          const loadedFiles = readDirectoryRecursive(targetDir);

          return sendJson(res, 200, {
            success: true,
            folderName: repoName,
            workspacePath: targetDir.replace(/\\/g, '/'),
            repoRoot: targetDir.replace(/\\/g, '/'),
            branch,
            files: loadedFiles,
          });
        }

        if (url === '/api/git/publish') {
          const {
            workspacePath,
            repoName,
            description = '',
            isPrivate = true,
            token,
            commitMessage = 'Initial commit from IntelliCode IDE',
            authorName,
            authorEmail,
            files: memoryFiles,
          } = body;

          if (!token || !repoName) {
            return sendJson(res, 400, { success: false, error: 'GitHub token and repository name are required' });
          }

          let targetDir = workspacePath && fs.existsSync(workspacePath) ? workspacePath : null;
          if (!targetDir) {
            const projectsRoot = path.join(os.homedir(), 'IntelliCodeProjects');
            targetDir = path.join(projectsRoot, repoName.replace(/[^a-zA-Z0-9._-]/g, '-'));
            fs.mkdirSync(targetDir, { recursive: true });
            if (Array.isArray(memoryFiles)) {
              for (const f of memoryFiles) {
                if (!f?.path) continue;
                const fullPath = resolveSafePath(targetDir, f.path);
                fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                fs.writeFileSync(fullPath, f.content ?? '', 'utf8');
              }
            }
          }

          const gh = await githubFetch('/user/repos', token, {
            method: 'POST',
            body: {
              name: repoName.trim(),
              description,
              private: !!isPrivate,
              auto_init: false,
            },
          });

          if (!gh.ok) {
            return sendJson(res, 200, {
              success: false,
              error: gh.data?.errors?.[0]?.message || gh.data?.message || 'Failed to create GitHub repository',
            });
          }

          const cloneUrl = gh.data.clone_url;

          const checkGit = await runGit(['rev-parse', '--is-inside-work-tree'], targetDir);
          if (checkGit.code !== 0) {
            const initRes = await runGit(['init', '-b', 'main'], targetDir);
            if (initRes.code !== 0) {
              await runGit(['init'], targetDir);
            }
          }

          if (authorName) {
            const checkName = await runGit(['config', 'user.name'], targetDir);
            if (!checkName.stdout.trim()) await runGit(['config', 'user.name', authorName], targetDir);
          }
          if (authorEmail) {
            const checkEmail = await runGit(['config', 'user.email'], targetDir);
            if (!checkEmail.stdout.trim()) await runGit(['config', 'user.email', authorEmail], targetDir);
          }

          await runGit(['add', '-A'], targetDir);
          const headCheck = await runGit(['rev-parse', '--verify', 'HEAD'], targetDir);
          const statusCheck = await runGit(['status', '--porcelain'], targetDir);
          if (headCheck.code !== 0 || statusCheck.stdout.trim()) {
            const commitRes = await runGit(['commit', '-m', commitMessage], targetDir);
            if (commitRes.code !== 0 && headCheck.code !== 0) {
              const readmePath = path.join(targetDir, 'README.md');
              if (!fs.existsSync(readmePath)) {
                fs.writeFileSync(readmePath, `# ${repoName}\n\nCreated with IntelliCode IDE.\n`, 'utf8');
                await runGit(['add', 'README.md'], targetDir);
                await runGit(['commit', '-m', commitMessage], targetDir);
              }
            }
          }

          const existingRemote = await runGit(['remote', 'get-url', 'origin'], targetDir);
          if (existingRemote.code === 0) {
            await runGit(['remote', 'set-url', 'origin', cloneUrl], targetDir);
          } else {
            await runGit(['remote', 'add', 'origin', cloneUrl], targetDir);
          }

          const branchRes = await runGit(['branch', '--show-current'], targetDir);
          const branch = branchRes.stdout.trim() || 'main';
          const pushRes = await runGit(['push', '-u', 'origin', branch], targetDir, token);

          if (pushRes.code !== 0) {
            return sendJson(res, 200, {
              success: false,
              error: pushRes.stderr || 'Created repo on GitHub, but failed to push initial commits',
            });
          }

          return sendJson(res, 200, {
            success: true,
            workspacePath: targetDir.replace(/\\/g, '/'),
            repoRoot: targetDir.replace(/\\/g, '/'),
            branch,
            remoteUrl: cloneUrl,
            repo: {
              id: gh.data.id,
              name: gh.data.name,
              fullName: gh.data.full_name,
              private: !!gh.data.private,
              htmlUrl: gh.data.html_url,
              cloneUrl,
              owner: gh.data.owner?.login || '',
            },
          });
        }

        return next();
      } catch (err) {
        console.error('IDE API middleware error:', err);
        return sendJson(res, 500, { error: err.message || 'Internal server error in IDE API' });
      }
    });
  };

  return {
    name: 'vite-plugin-git-api',
    configureServer(server) {
      setupMiddleware(server);
    },
    configurePreviewServer(server) {
      setupMiddleware(server);
    },
  };
}
