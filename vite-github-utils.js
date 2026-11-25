import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SESSION_DIR = path.join(os.homedir(), '.intellicode');
const SESSION_FILE = path.join(SESSION_DIR, 'github-session.json');

let memorySession = {
  token: '',
  authMethod: null, // 'oauth' | 'gh-cli' | 'pat' | null
  user: null,
};

/**
 * Strip any sensitive token or base64 credential from logs or error messages.
 */
export function sanitizeCredentialText(text, token) {
  let out = String(text || '');
  if (token) {
    out = out.split(token).join('[REDACTED]');
    const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
    out = out.split(basic).join('[REDACTED]');
  }
  out = out.replace(/gh[pousr]_[A-Za-z0-9_]{10,}/g, '[REDACTED_GH_TOKEN]');
  out = out.replace(/github_pat_[A-Za-z0-9_]{10,}/g, '[REDACTED_GH_TOKEN]');
  return out;
}

/**
 * Validate that a repository URL is a trusted GitHub HTTPS remote.
 */
export function isTrustedGitHubUrl(urlStr) {
  try {
    const u = new URL(String(urlStr || '').trim());
    return u.protocol === 'https:' && (u.hostname === 'github.com' || u.hostname.endsWith('.github.com'));
  } catch {
    return false;
  }
}

export function getConfiguredOAuthClientId(env = process.env) {
  return String(env.GITHUB_OAUTH_CLIENT_ID || env.VITE_GITHUB_CLIENT_ID || '').trim();
}

export function saveBackendSession({ token, authMethod, user }, persistToDisk = true) {
  memorySession = {
    token: String(token || ''),
    authMethod: authMethod || null,
    user: user || null,
  };
  if (!persistToDisk) return;
  try {
    fs.mkdirSync(SESSION_DIR, { recursive: true, mode: 0o700 });
    fs.writeFileSync(
      SESSION_FILE,
      JSON.stringify({ token: memorySession.token, authMethod: memorySession.authMethod, user: memorySession.user }),
      { encoding: 'utf8', mode: 0o600 }
    );
  } catch {
    // Non-fatal if home directory is read-only
  }
}

export function loadBackendSession() {
  if (memorySession.token) return memorySession;
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      if (raw && raw.token) {
        memorySession = {
          token: String(raw.token),
          authMethod: raw.authMethod || 'pat',
          user: raw.user || null,
        };
      }
    }
  } catch {
    // Ignore corrupted session file
  }
  return memorySession;
}

export function clearBackendSession(clearDisk = true) {
  memorySession = { token: '', authMethod: null, user: null };
  if (!clearDisk) return;
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
  } catch {
    // Ignore unlink failure
  }
}

export function getActiveGitHubToken() {
  return loadBackendSession().token || '';
}

/**
 * Call GitHub REST API cleanly (strictly targeting api.github.com).
 */
export async function githubApiFetch(endpoint, token, options = {}, fetchImpl = globalThis.fetch) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `https://api.github.com${cleanEndpoint}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'IntelliCode-IDE',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetchImpl(url, {
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

/**
 * Verify a token against GitHub /user, clearing session automatically on HTTP 401.
 */
export async function verifyGitHubToken(token, fetchImpl = globalThis.fetch) {
  if (!token) {
    return { success: false, status: 401, unauthorized: true, error: 'Not signed in to GitHub.' };
  }
  const gh = await githubApiFetch('/user', token, {}, fetchImpl);
  if (!gh.ok) {
    if (gh.status === 401) {
      clearBackendSession();
    }
    return {
      success: false,
      status: gh.status,
      unauthorized: gh.status === 401,
      error: sanitizeCredentialText(gh.data?.message || 'GitHub authentication failed', token),
    };
  }

  const user = {
    login: gh.data.login,
    name: gh.data.name || gh.data.login,
    avatarUrl: gh.data.avatar_url,
    htmlUrl: gh.data.html_url,
    email: gh.data.email || `${gh.data.login}@users.noreply.github.com`,
    scopes: gh.headers?.get?.('x-oauth-scopes') || '',
  };

  return { success: true, status: 200, user };
}

/**
 * Initiate GitHub OAuth Device Flow using server-configured Client ID.
 */
export async function startOAuthDeviceFlow(
  { clientId, env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  const effectiveClientId = String(clientId || getConfiguredOAuthClientId(env)).trim();
  if (!effectiveClientId) {
    return {
      success: false,
      code: 'OAUTH_NOT_CONFIGURED',
      error:
        'GitHub OAuth App Client ID is not configured (set GITHUB_OAUTH_CLIENT_ID). Use GitHub CLI or Personal Access Token below.',
    };
  }

  const res = await fetchImpl('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: effectiveClientId,
      scope: 'repo read:user user:email',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    return {
      success: false,
      error: data.error_description || data.error || 'Failed to start GitHub OAuth Device Flow',
    };
  }

  return {
    success: true,
    clientId: effectiveClientId,
    device_code: data.device_code,
    user_code: data.user_code,
    verification_uri: data.verification_uri,
    expires_in: data.expires_in,
    interval: data.interval || 5,
  };
}

/**
 * Poll GitHub OAuth Device Flow and store token strictly on backend on success.
 */
export async function pollOAuthDeviceToken(
  { clientId, deviceCode, env = process.env, fetchImpl = globalThis.fetch, persistToDisk = true } = {}
) {
  const effectiveClientId = String(clientId || getConfiguredOAuthClientId(env)).trim();
  if (!effectiveClientId || !deviceCode) {
    return { success: false, error: 'OAuth clientId and deviceCode are required.' };
  }

  const res = await fetchImpl('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: effectiveClientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (data.access_token) {
    const verified = await verifyGitHubToken(data.access_token, fetchImpl);
    if (!verified.success || !verified.user) {
      return { success: false, error: verified.error || 'Token verification failed.' };
    }
    saveBackendSession({ token: data.access_token, authMethod: 'oauth', user: verified.user }, persistToDisk);
    return { success: true, authenticated: true, user: verified.user, authMethod: 'oauth' };
  }

  return {
    success: false,
    pending: data.error === 'authorization_pending' || data.error === 'slow_down',
    slowDown: data.error === 'slow_down',
    error: data.error,
    error_description: data.error_description,
  };
}

/**
 * Read token from local GitHub CLI (`gh auth token`) without exposing it to frontend.
 */
export function readGhCliToken() {
  return new Promise((resolve) => {
    execFile('gh', ['auth', 'token'], { timeout: 5000 }, (err, stdout) => {
      if (err || !stdout || !stdout.trim()) {
        return resolve(null);
      }
      resolve(stdout.trim());
    });
  });
}
