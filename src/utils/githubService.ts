import type { GitHubRepo, GitHubUser, ProjectFile } from '../types/ide';

async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data?.error) {
    throw new Error(`Request failed (${res.status})`);
  }
  return data as T;
}

export const githubService = {
  async verifyToken(token: string): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    try {
      return await postJson('/api/github/user', { token });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to verify GitHub token' };
    }
  },

  async startDeviceFlow(clientId: string): Promise<{
    success: boolean;
    device_code?: string;
    user_code?: string;
    verification_uri?: string;
    expires_in?: number;
    interval?: number;
    error?: string;
  }> {
    try {
      return await postJson('/api/github/device-code', { clientId });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to start GitHub Device Flow' };
    }
  },

  async pollDeviceToken(clientId: string, deviceCode: string): Promise<{
    success: boolean;
    access_token?: string;
    error?: string;
    error_description?: string;
  }> {
    try {
      return await postJson('/api/github/device-token', { clientId, deviceCode });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Polling failed' };
    }
  },

  async listRepos(token: string): Promise<{ success: boolean; repos?: GitHubRepo[]; error?: string }> {
    try {
      return await postJson('/api/github/repos', { token });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to fetch repositories' };
    }
  },

  async createRepo(
    token: string,
    name: string,
    description: string,
    isPrivate: boolean
  ): Promise<{ success: boolean; repo?: GitHubRepo; error?: string }> {
    try {
      return await postJson('/api/github/create-repo', { token, name, description, isPrivate });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create repository' };
    }
  },

  async cloneRepo(params: {
    token?: string;
    cloneUrl: string;
    repoName: string;
    owner?: string;
  }): Promise<{
    success: boolean;
    folderName?: string;
    workspacePath?: string;
    repoRoot?: string;
    branch?: string;
    files?: ProjectFile[];
    error?: string;
  }> {
    try {
      return await postJson('/api/github/clone', params);
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to clone repository' };
    }
  },

  async publishWorkspace(params: {
    workspacePath?: string | null;
    repoName: string;
    description?: string;
    isPrivate: boolean;
    token: string;
    commitMessage?: string;
    authorName?: string;
    authorEmail?: string;
    files?: { path: string; content: string }[];
  }): Promise<{
    success: boolean;
    workspacePath?: string;
    repoRoot?: string;
    branch?: string;
    remoteUrl?: string;
    repo?: GitHubRepo;
    error?: string;
  }> {
    try {
      return await postJson('/api/git/publish', params);
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to publish to GitHub' };
    }
  },
};
