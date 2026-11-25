import type { GitCommit, GitFileItem, GitRepoStatus, ProjectFile } from '../types/ide';

interface ResolveWorkspaceResult {
  success: boolean;
  workspacePath?: string;
  repoRoot?: string;
  isGit: boolean;
  branch?: string;
  remoteUrl?: string;
  githubRepo?: { owner: string; repo: string } | null;
  message?: string;
  error?: string;
}

interface GitStatusResult {
  success: boolean;
  isGit: boolean;
  repoRoot?: string;
  branch?: string;
  remoteUrl?: string;
  githubRepo?: { owner: string; repo: string } | null;
  stagedFiles: GitFileItem[];
  unstagedFiles: GitFileItem[];
  error?: string;
  message?: string;
}

interface GitLogResult {
  success: boolean;
  commits: GitCommit[];
  error?: string;
}

interface SimpleGitResult {
  success: boolean;
  error?: string;
  commitHash?: string;
  message?: string;
  repoRoot?: string;
  branch?: string;
}

interface GitDiffResult {
  success: boolean;
  diffText?: string;
  originalContent?: string;
  currentContent?: string;
  error?: string;
}

interface ReadFolderResult {
  success: boolean;
  folderName?: string;
  workspacePath?: string;
  files?: ProjectFile[];
  error?: string;
}

async function postApi<T>(url: string, data: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let errMsg = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson?.error) errMsg = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export const gitService = {
  /**
   * Resolve workspace filesystem path on the host and detect whether it belongs to a Git repository.
   */
  async resolveWorkspace(options: {
    path?: string;
    folderName?: string;
    sampleFiles?: string[];
  }): Promise<ResolveWorkspaceResult> {
    try {
      return await postApi<ResolveWorkspaceResult>('/api/git/resolve-workspace', options);
    } catch (err: any) {
      return {
        success: false,
        isGit: false,
        error: err?.message || 'Failed to resolve workspace',
      };
    }
  },

  /**
   * Get live Git status for the active repository root.
   */
  async getStatus(repoRoot: string, workspacePath?: string): Promise<GitStatusResult> {
    try {
      return await postApi<GitStatusResult>('/api/git/status', { repoRoot, workspacePath });
    } catch (err: any) {
      return {
        success: false,
        isGit: false,
        stagedFiles: [],
        unstagedFiles: [],
        error: err?.message || 'Failed to fetch git status',
      };
    }
  },

  /**
   * Get genuine commit history for the active repository root.
   */
  async getLog(repoRoot: string, limit: number = 25): Promise<GitLogResult> {
    try {
      return await postApi<GitLogResult>('/api/git/log', { repoRoot, limit });
    } catch (err: any) {
      return {
        success: false,
        commits: [],
        error: err?.message || 'Failed to fetch commit history',
      };
    }
  },

  /**
   * Stage specific files or all changed files.
   */
  async stage(repoRoot: string, filePaths?: string[], all: boolean = false): Promise<SimpleGitResult> {
    try {
      return await postApi<SimpleGitResult>('/api/git/stage', { repoRoot, filePaths, all });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to stage files' };
    }
  },

  /**
   * Unstage specific files or all staged files.
   */
  async unstage(repoRoot: string, filePaths?: string[], all: boolean = false): Promise<SimpleGitResult> {
    try {
      return await postApi<SimpleGitResult>('/api/git/unstage', { repoRoot, filePaths, all });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to unstage files' };
    }
  },

  /**
   * Discard changes in a file (restore from index/HEAD).
   */
  async discard(repoRoot: string, filePath: string): Promise<SimpleGitResult> {
    try {
      return await postApi<SimpleGitResult>('/api/git/discard', { repoRoot, filePath });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to discard changes' };
    }
  },

  /**
   * Commit staged changes with a genuine commit message.
   */
  async commit(repoRoot: string, message: string, authorName?: string, authorEmail?: string): Promise<SimpleGitResult> {
    try {
      return await postApi<SimpleGitResult>('/api/git/commit', { repoRoot, message, authorName, authorEmail });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to commit changes' };
    }
  },

  async push(repoRoot: string, branch?: string, token?: string): Promise<SimpleGitResult & { output?: string }> {
    try {
      return await postApi('/api/git/push', { repoRoot, branch, token });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to push to GitHub' };
    }
  },

  async pull(repoRoot: string, branch?: string, token?: string): Promise<SimpleGitResult & { output?: string }> {
    try {
      return await postApi('/api/git/pull', { repoRoot, branch, token });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to pull from GitHub' };
    }
  },

  async getBranches(repoRoot: string): Promise<{ success: boolean; current: string; branches: string[]; error?: string }> {
    try {
      return await postApi('/api/git/branches', { repoRoot });
    } catch (err: any) {
      return { success: false, current: 'main', branches: [], error: err?.message };
    }
  },

  async checkout(repoRoot: string, branch: string, create = false): Promise<SimpleGitResult> {
    try {
      return await postApi('/api/git/checkout', { repoRoot, branch, create });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to checkout branch' };
    }
  },

  /**
   * Initialize a new Git repository in a workspace folder.
   */
  async initRepo(workspacePath: string): Promise<SimpleGitResult> {
    try {
      return await postApi<SimpleGitResult>('/api/git/init', { workspacePath });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to initialize Git repository' };
    }
  },

  /**
   * Retrieve diff for a file (staged or unstaged).
   */
  async getDiff(repoRoot: string, filePath: string, staged: boolean = false): Promise<GitDiffResult> {
    try {
      return await postApi<GitDiffResult>('/api/git/diff', { repoRoot, filePath, staged });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to retrieve git diff' };
    }
  },

  /**
   * Read all workspace files from a directory path on host.
   */
  async readWorkspaceFolder(path: string): Promise<ReadFolderResult> {
    try {
      return await postApi<ReadFolderResult>('/api/workspace/read-folder', { path });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to read workspace folder' };
    }
  },

  async writeWorkspaceFile(workspacePath: string, filePath: string, content: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await postApi('/api/workspace/write-file', { workspacePath, filePath, content });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to write file' };
    }
  },

  async deleteWorkspaceFile(workspacePath: string, filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await postApi('/api/workspace/delete-file', { workspacePath, filePath });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete file' };
    }
  },

  async renameWorkspaceFile(workspacePath: string, oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await postApi('/api/workspace/rename-file', { workspacePath, oldPath, newPath });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to rename file' };
    }
  },

  async mkdirWorkspace(workspacePath: string, folderPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await postApi('/api/workspace/mkdir', { workspacePath, folderPath });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create folder' };
    }
  },

  async createWorkspaceDir(folderName: string, files?: { path: string; content: string }[]): Promise<{
    success: boolean;
    workspacePath?: string;
    folderName?: string;
    error?: string;
  }> {
    try {
      return await postApi('/api/workspace/create-dir', { folderName, files });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create workspace folder' };
    }
  },

  async execTerminal(command: string, cwd?: string, workspaceRoot?: string): Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    cwd: string;
    shell?: string;
    warning?: string | null;
    error?: string;
  }> {
    try {
      return await postApi('/api/terminal/exec', { command, cwd, workspaceRoot });
    } catch (err: any) {
      return {
        success: false,
        stdout: '',
        stderr: err?.message || 'Terminal execution failed',
        exitCode: 1,
        cwd: cwd || '',
      };
    }
  },
};
