import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeCredentialText } from './vite-github-utils.js';

/**
 * Execute a git command safely with explicit argument arrays (preventing shell injection)
 * and pass GitHub credentials via scoped GIT_CONFIG_* env vars rather than CLI args.
 */
export function runGit(args, cwd, token) {
  return new Promise((resolve) => {
    const gitEnv = {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
    };

    if (token) {
      const basicAuth = Buffer.from(`x-access-token:${token}`).toString('base64');
      gitEnv.GIT_CONFIG_COUNT = '1';
      gitEnv.GIT_CONFIG_KEY_0 = 'http.https://github.com/.extraheader';
      gitEnv.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: basic ${basicAuth}`;
    }

    execFile(
      'git',
      args,
      {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
        env: gitEnv,
      },
      (err, stdout, stderr) => {
        resolve({
          stdout: sanitizeCredentialText(stdout ? stdout.toString() : '', token),
          stderr: sanitizeCredentialText(stderr ? stderr.toString() : '', token),
          code: err ? (err.code || 1) : 0,
        });
      }
    );
  });
}

/**
 * Translate raw Git stderr into clear, actionable user-facing error messages.
 */
export function formatGitError(rawError, fallback = 'Git operation failed') {
  const msg = String(rawError || '').trim();
  if (!msg) return fallback;

  if (/CONFLICT|Automatic merge failed|needs merge|unmerged files/i.test(msg)) {
    return `Merge conflict detected. Resolve conflicted files in the editor, stage them, and commit.\n${msg}`;
  }
  if (/Authentication failed|Invalid username or password|could not read Username|403|401|Permission denied/i.test(msg)) {
    return `Authentication failed. Check your GitHub sign-in/token permissions and try again.\n${msg}`;
  }
  if (/non-fast-forward|fetch first|rejected.*failed to push/i.test(msg)) {
    return `Push rejected: remote has newer commits. Pull or Fetch & merge before pushing.\n${msg}`;
  }
  if (/Your local changes to the following files would be overwritten|Please commit your changes or stash them/i.test(msg)) {
    return `Branch switch blocked: you have uncommitted changes that would be overwritten. Commit, stage, or discard them first.\n${msg}`;
  }
  return msg;
}

/**
 * Parse `git status --porcelain=v1 -uall` output into staged and unstaged file lists.
 * Handles M (Modified), A (Added), U (Untracked), D (Deleted), and R (Renamed).
 */
export function parseGitStatusPorcelain(stdout) {
  const stagedFiles = [];
  const unstagedFiles = [];
  const lines = String(stdout || '').split('\n');

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (!line || line.length < 4) continue;

    const indexStatus = line[0];
    const worktreeStatus = line[1];
    let filePath = line.substring(3).trim();

    if (filePath.includes(' -> ')) {
      filePath = filePath.split(' -> ')[1].trim();
    }
    if (filePath.startsWith('"') && filePath.endsWith('"')) {
      filePath = filePath.slice(1, -1);
    }

    const normPath = filePath.replace(/\\/g, '/');
    const fileName = path.basename(normPath);

    if (indexStatus !== ' ' && indexStatus !== '?' && indexStatus !== '!') {
      stagedFiles.push({
        path: normPath,
        name: fileName,
        status: indexStatus,
        isStaged: true,
      });
    }

    if (worktreeStatus !== ' ' && worktreeStatus !== '!') {
      unstagedFiles.push({
        path: normPath,
        name: fileName,
        status: worktreeStatus === '?' ? 'U' : worktreeStatus,
        isStaged: false,
      });
    }
  }

  return { stagedFiles, unstagedFiles };
}

/**
 * Compute ahead/behind commit counts relative to upstream tracking branch.
 */
export async function getAheadBehindCounts(repoRoot) {
  const res = await runGit(['rev-list', '--left-right', '--count', 'HEAD...@{upstream}'], repoRoot);
  if (res.code !== 0 || !res.stdout.trim()) {
    return { ahead: 0, behind: 0, hasUpstream: false };
  }
  const parts = res.stdout.trim().split(/\s+/);
  const ahead = parseInt(parts[0] || '0', 10) || 0;
  const behind = parseInt(parts[1] || '0', 10) || 0;
  return { ahead, behind, hasUpstream: true };
}

/**
 * Discard local changes for a tracked or untracked file.
 */
export async function discardFileChanges(repoRoot, filePath) {
  const statusRes = await runGit(['status', '--porcelain=v1', '--', filePath], repoRoot);
  const statusLine = statusRes.stdout.trim();
  const isUntracked = statusLine.startsWith('??');

  if (isUntracked) {
    const cleanRes = await runGit(['clean', '-f', '--', filePath], repoRoot);
    if (cleanRes.code !== 0) {
      return { success: false, deleted: false, error: formatGitError(cleanRes.stderr, 'Failed to remove untracked file') };
    }
    return { success: true, deleted: true };
  }

  let discardRes = await runGit(['restore', '--worktree', '--', filePath], repoRoot);
  if (discardRes.code !== 0) {
    discardRes = await runGit(['checkout', '--', filePath], repoRoot);
  }
  if (discardRes.code !== 0) {
    return { success: false, deleted: false, error: formatGitError(discardRes.stderr, 'Failed to discard changes') };
  }
  return { success: true, deleted: false };
}

/**
 * Safely switch or create a Git branch, protecting uncommitted changes.
 */
export async function checkoutBranchSafe(repoRoot, branch, create = false) {
  const cleanBranch = String(branch || '').trim();
  if (!cleanBranch) {
    return { success: false, error: 'Branch name is required' };
  }
  if (!fs.existsSync(repoRoot)) {
    return { success: false, error: 'Invalid repository directory' };
  }

  const args = create ? ['checkout', '-b', cleanBranch] : ['checkout', cleanBranch];
  const res = await runGit(args, repoRoot);
  if (res.code !== 0) {
    return { success: false, error: formatGitError(res.stderr || res.stdout, 'Failed to switch branch') };
  }
  return { success: true, branch: cleanBranch };
}

/**
 * Fetch remote refs without modifying working tree.
 */
export async function fetchFromRemote(repoRoot, token) {
  const res = await runGit(['fetch', '--prune', 'origin'], repoRoot, token);
  if (res.code !== 0) {
    return { success: false, error: formatGitError(res.stderr || res.stdout, 'Failed to fetch from remote') };
  }
  const counts = await getAheadBehindCounts(repoRoot);
  return {
    success: true,
    output: res.stderr || res.stdout || 'Fetched latest remote refs.',
    ...counts,
  };
}
