import { describe, it } from 'node:test';
import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import {
  detectSystemShell,
  executeTerminalCommand,
  handleCdCommand,
  isAuthorizedLocalRequest,
  resolveTerminalCwd,
} from '../vite-terminal-utils.js';

const REPO_ROOT = process.cwd();

describe('Integrated Terminal Utilities', () => {
  describe('Shell Detection', () => {
    it('detects Windows shell from ComSpec or falls back to cmd.exe', () => {
      const res = detectSystemShell('win32', { ComSpec: 'C:\\Windows\\System32\\cmd.exe' }, () => true);
      assert.strictEqual(res.name, 'cmd.exe');
      assert.strictEqual(res.platform, 'win32');

      const fallback = detectSystemShell('win32', {}, () => false);
      assert.strictEqual(fallback.shell, 'cmd.exe');
    });

    it('detects macOS and Linux shells', () => {
      const mac = detectSystemShell('darwin', { SHELL: '/bin/zsh' }, (p) => p === '/bin/zsh');
      assert.strictEqual(mac.shell, '/bin/zsh');
      assert.strictEqual(mac.name, 'zsh');

      const linux = detectSystemShell('linux', {}, (p) => p === '/bin/bash');
      assert.strictEqual(linux.shell, '/bin/bash');
      assert.strictEqual(linux.name, 'bash');
    });
  });

  describe('Workspace Path Validation', () => {
    it('resets stale or machine-specific paths to active workspace root', () => {
      const stale = 'C:\\Users\\corey\\OneDrive\\Documents\\workspace\\missing-project';
      const res = resolveTerminalCwd({
        requestedCwd: stale,
        workspaceRoot: REPO_ROOT,
        fallbackCwd: REPO_ROOT,
      });
      assert.strictEqual(res.corrected, true);
      assert.strictEqual(res.cwd, path.resolve(REPO_ROOT));
      assert.ok(res.warning && res.warning.includes('Stale or invalid'));
    });

    it('rejects paths outside the active workspace root', () => {
      const outside = os.tmpdir();
      const res = resolveTerminalCwd({
        requestedCwd: outside,
        workspaceRoot: REPO_ROOT,
        fallbackCwd: REPO_ROOT,
      });
      assert.strictEqual(res.corrected, true);
      assert.strictEqual(res.cwd, path.resolve(REPO_ROOT));
      assert.ok(res.warning && res.warning.includes('outside the active workspace'));
    });

    it('accepts valid subdirectory inside workspace', () => {
      const subDir = path.join(REPO_ROOT, 'src');
      const res = resolveTerminalCwd({
        requestedCwd: subDir,
        workspaceRoot: REPO_ROOT,
        fallbackCwd: REPO_ROOT,
      });
      assert.strictEqual(res.corrected, false);
      assert.strictEqual(res.cwd, path.resolve(subDir));
      assert.strictEqual(res.warning, null);
    });
  });

  describe('cd Command Handling', () => {
    it('navigates within workspace and blocks escaping workspace root', () => {
      const cdIntoSrc = handleCdCommand('cd src', REPO_ROOT, REPO_ROOT);
      assert.ok(cdIntoSrc);
      assert.strictEqual(cdIntoSrc.success, true);
      assert.strictEqual(cdIntoSrc.exitCode, 0);
      assert.ok(cdIntoSrc.cwd.endsWith('/src'));

      const cdEscape = handleCdCommand('cd ..', REPO_ROOT, REPO_ROOT);
      assert.ok(cdEscape);
      assert.strictEqual(cdEscape.success, false);
      assert.strictEqual(cdEscape.exitCode, 1);
      assert.ok(cdEscape.stderr.includes('access restricted'));

      const cdMissing = handleCdCommand('cd does-not-exist-xyz', REPO_ROOT, REPO_ROOT);
      assert.ok(cdMissing);
      assert.strictEqual(cdMissing.success, false);
      assert.strictEqual(cdMissing.exitCode, 1);
    });
  });

  describe('Real Command Execution', () => {
    it('runs git --version, node --version, git status, and cd', async () => {
      const gitVer = await executeTerminalCommand('git --version', {
        requestedCwd: REPO_ROOT,
        workspaceRoot: REPO_ROOT,
      });
      assert.strictEqual(gitVer.exitCode, 0);
      assert.ok(gitVer.stdout.toLowerCase().includes('git version'));

      const nodeVer = await executeTerminalCommand('node --version', {
        requestedCwd: REPO_ROOT,
        workspaceRoot: REPO_ROOT,
      });
      assert.strictEqual(nodeVer.exitCode, 0);
      assert.ok(nodeVer.stdout.trim().startsWith('v'));

      const gitStatus = await executeTerminalCommand('git status --short', {
        requestedCwd: REPO_ROOT,
        workspaceRoot: REPO_ROOT,
      });
      assert.strictEqual(gitStatus.exitCode, 0);

      const cdRes = await executeTerminalCommand('cd src', {
        requestedCwd: REPO_ROOT,
        workspaceRoot: REPO_ROOT,
      });
      assert.strictEqual(cdRes.exitCode, 0);
      assert.ok(cdRes.cwd.endsWith('/src'));
    });

    it('recovers from invalid cwd and still executes command in valid fallback', async () => {
      const res = await executeTerminalCommand('node --version', {
        requestedCwd: 'C:\\Users\\corey\\OneDrive\\Documents\\workspace\\fake',
        workspaceRoot: REPO_ROOT,
        fallbackCwd: REPO_ROOT,
      });
      assert.strictEqual(res.exitCode, 0);
      assert.ok(res.stdout.trim().startsWith('v'));
      assert.ok(res.stderr.includes('Stale or invalid'));
      assert.strictEqual(res.cwd, path.resolve(REPO_ROOT).replace(/\\/g, '/'));
    });
  });

  describe('Local API Request Authorization', () => {
    it('allows localhost and 127.0.0.1 same-origin requests', () => {
      assert.strictEqual(
        isAuthorizedLocalRequest({
          headers: {
            host: '127.0.0.1:3000',
            origin: 'http://127.0.0.1:3000',
            'sec-fetch-site': 'same-origin',
          },
          socket: { remoteAddress: '127.0.0.1' },
        }),
        true
      );

      assert.strictEqual(
        isAuthorizedLocalRequest({
          headers: { host: 'localhost:3000' },
          socket: { remoteAddress: '::1' },
        }),
        true
      );
    });

    it('rejects non-localhost hosts, cross-origin requests, and remote IPs', () => {
      assert.strictEqual(
        isAuthorizedLocalRequest({
          headers: { host: 'evil.example.com:3000' },
          socket: { remoteAddress: '127.0.0.1' },
        }),
        false
      );

      assert.strictEqual(
        isAuthorizedLocalRequest({
          headers: {
            host: 'localhost:3000',
            origin: 'https://attacker.example',
            'sec-fetch-site': 'cross-site',
          },
          socket: { remoteAddress: '127.0.0.1' },
        }),
        false
      );

      assert.strictEqual(
        isAuthorizedLocalRequest({
          headers: { host: 'localhost:3000' },
          socket: { remoteAddress: '192.168.1.42' },
        }),
        false
      );
    });
  });
});
