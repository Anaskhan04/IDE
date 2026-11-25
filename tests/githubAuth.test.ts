import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  clearBackendSession,
  getActiveGitHubToken,
  isTrustedGitHubUrl,
  pollOAuthDeviceToken,
  sanitizeCredentialText,
  saveBackendSession,
  startOAuthDeviceFlow,
  verifyGitHubToken,
} from '../vite-github-utils.js';

describe('GitHub Authentication & Credential Security (Mocked HTTP)', () => {
  beforeEach(() => {
    clearBackendSession(false);
  });

  it('rejects invalid credentials (HTTP 401) and clears any active session', async () => {
    saveBackendSession({ token: 'ghp_expired_secret_token_12345', authMethod: 'pat', user: { login: 'old' } }, false);

    const mockFetch = async () => ({
      ok: false,
      status: 401,
      headers: new Map(),
      text: async () => JSON.stringify({ message: 'Bad credentials' }),
    });

    const res = await verifyGitHubToken('ghp_expired_secret_token_12345', mockFetch as any);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.unauthorized, true);
    assert.ok(res.error && res.error.includes('Bad credentials'));
    assert.strictEqual(getActiveGitHubToken(), '');
  });

  it('reports missing OAuth configuration honestly', async () => {
    const res = await startOAuthDeviceFlow({ env: {} });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, 'OAUTH_NOT_CONFIGURED');
    assert.ok(res.error && res.error.includes('GITHUB_OAUTH_CLIENT_ID'));
  });

  it('handles OAuth Device Flow pending, slow_down, cancellation, expiration, and success without leaking token', async () => {
    const pendingFetch = async () => ({
      ok: true,
      json: async () => ({ error: 'authorization_pending' }),
    });
    const pendingRes = await pollOAuthDeviceToken({
      clientId: 'Ov23liTestClient',
      deviceCode: 'dev123',
      fetchImpl: pendingFetch as any,
      persistToDisk: false,
    });
    assert.strictEqual(pendingRes.pending, true);

    const slowFetch = async () => ({
      ok: true,
      json: async () => ({ error: 'slow_down' }),
    });
    const slowRes = await pollOAuthDeviceToken({
      clientId: 'Ov23liTestClient',
      deviceCode: 'dev123',
      fetchImpl: slowFetch as any,
      persistToDisk: false,
    });
    assert.strictEqual(slowRes.pending, true);
    assert.strictEqual(slowRes.slowDown, true);

    const deniedFetch = async () => ({
      ok: true,
      json: async () => ({ error: 'access_denied', error_description: 'The user has denied your application access.' }),
    });
    const deniedRes = await pollOAuthDeviceToken({
      clientId: 'Ov23liTestClient',
      deviceCode: 'dev123',
      fetchImpl: deniedFetch as any,
      persistToDisk: false,
    });
    assert.strictEqual(deniedRes.success, false);
    assert.strictEqual(deniedRes.error, 'access_denied');

    const successFetch = async (url: string) => {
      if (url.includes('oauth/access_token')) {
        return { ok: true, json: async () => ({ access_token: 'gho_mock_oauth_secret_999' }) };
      }
      return {
        ok: true,
        status: 200,
        headers: new Map([['x-oauth-scopes', 'repo']]),
        text: async () => JSON.stringify({ login: 'octocat', name: 'The Octocat', avatar_url: 'https://avatars.githubusercontent.com/u/1', html_url: 'https://github.com/octocat' }),
      };
    };
    const okRes = await pollOAuthDeviceToken({
      clientId: 'Ov23liTestClient',
      deviceCode: 'dev123',
      fetchImpl: successFetch as any,
      persistToDisk: false,
    });
    assert.strictEqual(okRes.success, true);
    assert.strictEqual(okRes.user?.login, 'octocat');
    // Token must NEVER be returned to the frontend payload
    assert.strictEqual((okRes as any).access_token, undefined);
    assert.strictEqual((okRes as any).token, undefined);
  });

  it('prevents credential leakage in logs/errors and validates trusted GitHub URLs', () => {
    const secret = 'ghp_superSecretTokenValue123456';
    const b64 = Buffer.from(`x-access-token:${secret}`).toString('base64');
    const raw = `fatal: unable to access with header AUTHORIZATION: basic ${b64} and token ${secret}`;
    const clean = sanitizeCredentialText(raw, secret);

    assert.strictEqual(clean.includes(secret), false);
    assert.strictEqual(clean.includes(b64), false);
    assert.ok(clean.includes('[REDACTED]'));

    assert.strictEqual(isTrustedGitHubUrl('https://github.com/octocat/hello-world.git'), true);
    assert.strictEqual(isTrustedGitHubUrl('file:///etc/passwd'), false);
    assert.strictEqual(isTrustedGitHubUrl('https://evil.example.com/repo.git'), false);
  });
});
