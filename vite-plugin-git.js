import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Execute a git command safely with explicit argument arrays (preventing shell injection).
 */
function runGit(args, cwd) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout ? stdout.toString() : '',
        stderr: stderr ? stderr.toString() : '',
        code: err ? (err.code || 1) : 0,
      });
    });
  });
}

/**
 * Helper to parse json body from request stream.
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
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

  // 1. Check if current working directory matches
  if (path.basename(cwd).toLowerCase() === folderName.toLowerCase() || folderName.toLowerCase() === 'ide') {
    return cwd;
  }

  const searchRoots = [
    path.resolve(cwd, '..'), // e.g. c:\Users\ASUS\Downloads\Anas\vs code
    path.resolve(cwd, '../..'), // e.g. c:\Users\ASUS\Downloads\Anas
    path.resolve(cwd, '../../..'), // e.g. c:\Users\ASUS\Downloads
  ];

  for (const root of searchRoots) {
    if (!fs.existsSync(root)) continue;

    // Direct child check
    const directPath = path.join(root, folderName);
    if (fs.existsSync(directPath) && fs.statSync(directPath).isDirectory()) {
      return directPath;
    }

    // 1-level deep search (e.g. root/INTERNSHIP/HRFlow)
    try {
      const items = fs.readdirSync(root, { withFileTypes: true });
      for (const item of items) {
        if (!item.isDirectory() || item.name.startsWith('.') || item.name === 'node_modules') continue;
        const subChild = path.join(root, item.name, folderName);
        if (fs.existsSync(subChild) && fs.statSync(subChild).isDirectory()) {
          return subChild;
        }

        // Also check if item itself matches folderName
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
      // Skip binary and large files
      const binaryExts = ['.exe', '.dll', '.bin', '.iso', '.zip', '.tar', '.gz', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.woff', '.woff2'];
      if (binaryExts.includes(ext)) continue;

      try {
        const stats = fs.statSync(fullPath);
        if (stats.size > 500 * 1024) continue; // Skip files > 500KB

        const content = fs.readFileSync(fullPath, 'utf8');
        result.push({
          id: `file-${Buffer.from(relPath).toString('base64').substring(0, 16)}`,
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

export function gitApiPlugin() {
  const setupMiddleware = (server) => {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url ? req.url.split('?')[0] : '';

      // Only handle /api/git and /api/workspace
      if (!url.startsWith('/api/git') && !url.startsWith('/api/workspace')) {
        return next();
      }

      try {
        if (req.method !== 'POST') {
          return sendJson(res, 405, { error: 'Method not allowed' });
        }

        const body = await readJsonBody(req);

        // 1. Resolve Workspace
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

          // Check if directory is inside a git work tree
          const checkGit = await runGit(['rev-parse', '--is-inside-work-tree'], resolvedDir);
          if (checkGit.code !== 0 || !checkGit.stdout.includes('true')) {
            return sendJson(res, 200, {
              success: true,
              workspacePath: resolvedDir,
              isGit: false,
              message: 'No Git repository found in this workspace',
            });
          }

          // Find repo root (detects parent repo if workspace is a subfolder!)
          const topLevel = await runGit(['rev-parse', '--show-toplevel'], resolvedDir);
          const repoRoot = (topLevel.stdout.trim() || resolvedDir).replace(/\\/g, '/');

          // Get current branch
          let branchResult = await runGit(['branch', '--show-current'], resolvedDir);
          let branch = branchResult.stdout.trim();
          if (!branch) {
            const abbrev = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], resolvedDir);
            branch = abbrev.stdout.trim() || 'main';
          }

          return sendJson(res, 200, {
            success: true,
            workspacePath: resolvedDir,
            repoRoot,
            isGit: true,
            branch,
          });
        }

        // 2. Git Status
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

          // Top level repo root
          const topLevel = await runGit(['rev-parse', '--show-toplevel'], targetDir);
          const repoRoot = (topLevel.stdout.trim() || targetDir).replace(/\\/g, '/');

          // Branch
          let branchResult = await runGit(['branch', '--show-current'], repoRoot);
          let branch = branchResult.stdout.trim();
          if (!branch) {
            const abbrev = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot);
            branch = abbrev.stdout.trim() || 'main';
          }

          // Run status
          const statusResult = await runGit(['status', '--porcelain=v1', '-uall'], repoRoot);
          if (statusResult.code !== 0) {
            return sendJson(res, 200, {
              success: false,
              isGit: true,
              error: statusResult.stderr || 'Failed to read git status',
            });
          }

          const stagedFiles = [];
          const unstagedFiles = [];

          const lines = statusResult.stdout.split('\n');
          for (const line of lines) {
            if (!line || line.length < 4) continue;
            const indexStatus = line[0];
            const worktreeStatus = line[1];
            let filePath = line.substring(3).trim();
            // Handle rename format: orig -> new
            if (filePath.includes(' -> ')) {
              filePath = filePath.split(' -> ')[1].trim();
            }
            // Strip quotes if any
            if (filePath.startsWith('"') && filePath.endsWith('"')) {
              filePath = filePath.slice(1, -1);
            }

            const fileName = path.basename(filePath);

            // Staged file
            if (indexStatus !== ' ' && indexStatus !== '?' && indexStatus !== '!') {
              stagedFiles.push({
                path: filePath.replace(/\\/g, '/'),
                name: fileName,
                status: indexStatus,
                isStaged: true,
              });
            }

            // Unstaged file
            if (worktreeStatus !== ' ' && worktreeStatus !== '!') {
              unstagedFiles.push({
                path: filePath.replace(/\\/g, '/'),
                name: fileName,
                status: worktreeStatus === '?' ? 'U' : worktreeStatus,
                isStaged: false,
              });
            }
          }

          return sendJson(res, 200, {
            success: true,
            isGit: true,
            repoRoot,
            branch,
            stagedFiles,
            unstagedFiles,
          });
        }

        // 3. Git Log (Commits)
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
            // New repository with no commits yet
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

        // 4. Git Stage
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

        // 5. Git Unstage
        if (url === '/api/git/unstage') {
          const repoRoot = body.repoRoot;
          if (!repoRoot || !fs.existsSync(repoRoot)) {
            return sendJson(res, 400, { error: 'Invalid repository directory' });
          }

          let unstageResult;
          if (body.all) {
            unstageResult = await runGit(['restore', '--staged', '.'], repoRoot);
            if (unstageResult.code !== 0) {
              // Fallback to git reset HEAD
              unstageResult = await runGit(['reset', 'HEAD'], repoRoot);
            }
          } else if (Array.isArray(body.filePaths) && body.filePaths.length > 0) {
            unstageResult = await runGit(['restore', '--staged', '--', ...body.filePaths], repoRoot);
            if (unstageResult.code !== 0) {
              // Fallback to git reset HEAD
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

        // 6. Git Discard Changes
        if (url === '/api/git/discard') {
          const repoRoot = body.repoRoot;
          const filePath = body.filePath;
          if (!repoRoot || !filePath) {
            return sendJson(res, 400, { error: 'Missing repository directory or file path' });
          }

          // Try git restore first
          let discardResult = await runGit(['restore', '--', filePath], repoRoot);
          if (discardResult.code !== 0) {
            // Try checkout
            discardResult = await runGit(['checkout', '--', filePath], repoRoot);
          }
          if (discardResult.code !== 0) {
            // Might be an untracked file, try git clean
            discardResult = await runGit(['clean', '-f', '--', filePath], repoRoot);
          }

          if (discardResult.code !== 0) {
            return sendJson(res, 200, {
              success: false,
              error: discardResult.stderr || 'Failed to discard changes',
            });
          }

          return sendJson(res, 200, { success: true });
        }

        // 7. Git Commit
        if (url === '/api/git/commit') {
          const repoRoot = body.repoRoot;
          const message = (body.message || '').trim();
          if (!repoRoot || !message) {
            return sendJson(res, 400, { error: 'Repository directory and commit message are required' });
          }

          const commitResult = await runGit(['commit', '-m', message], repoRoot);
          if (commitResult.code !== 0) {
            return sendJson(res, 200, {
              success: false,
              error: commitResult.stderr || commitResult.stdout || 'Failed to commit',
            });
          }

          // Fetch the new commit hash
          const hashResult = await runGit(['rev-parse', '--short', 'HEAD'], repoRoot);
          const hash = hashResult.stdout.trim();

          return sendJson(res, 200, {
            success: true,
            commitHash: hash,
            message,
          });
        }

        // 8. Git Init
        if (url === '/api/git/init') {
          const workspacePath = body.workspacePath;
          if (!workspacePath || !fs.existsSync(workspacePath)) {
            return sendJson(res, 400, { error: 'Valid workspace directory is required' });
          }

          const initResult = await runGit(['init'], workspacePath);
          if (initResult.code !== 0) {
            return sendJson(res, 200, {
              success: false,
              error: initResult.stderr || 'Failed to initialize git repository',
            });
          }

          return sendJson(res, 200, {
            success: true,
            repoRoot: workspacePath.replace(/\\/g, '/'),
            branch: 'main',
          });
        }

        // 9. Git Diff
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

          // Get original content from HEAD
          let origResult = await runGit(['show', `HEAD:${filePath}`], repoRoot);
          const originalContent = origResult.code === 0 ? origResult.stdout : '';

          // Get current content from disk
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

        // 10. Workspace Read Folder (open by path)
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

        return next();
      } catch (err) {
        console.error('Git API middleware error:', err);
        return sendJson(res, 500, { error: err.message || 'Internal server error in Git API' });
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
