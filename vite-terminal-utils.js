import { exec } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Check whether a hostname refers to the local loopback interface.
 */
export function isLocalHostname(hostname) {
  if (!hostname) return false;
  const clean = String(hostname).trim().toLowerCase();
  return clean === 'localhost' || clean === '127.0.0.1' || clean === '::1' || clean === '[::1]';
}

/**
 * Extract hostname from a Host header value (handling IPv6 brackets and ports).
 */
function extractHostHeaderHostname(hostHeader) {
  if (!hostHeader) return '';
  const trimmed = String(hostHeader).trim();
  if (trimmed.startsWith('[')) {
    const endBracket = trimmed.indexOf(']');
    return endBracket !== -1 ? trimmed.slice(0, endBracket + 1) : trimmed;
  }
  const colonIdx = trimmed.indexOf(':');
  return colonIdx !== -1 ? trimmed.slice(0, colonIdx) : trimmed;
}

/**
 * Validate that an HTTP request originates from localhost and is not a cross-site request.
 * Note: This protects against remote/CSRF browser requests, not local same-origin processes.
 */
export function isAuthorizedLocalRequest(req) {
  const headers = req?.headers || {};

  const hostHostname = extractHostHeaderHostname(headers.host);
  if (!isLocalHostname(hostHostname)) {
    return false;
  }

  const secFetchSite = String(headers['sec-fetch-site'] || '').toLowerCase();
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    return false;
  }

  if (headers.origin) {
    try {
      const originUrl = new URL(headers.origin);
      if (!isLocalHostname(originUrl.hostname)) {
        return false;
      }
    } catch {
      return false;
    }
  } else if (headers.referer) {
    try {
      const refUrl = new URL(headers.referer);
      if (!isLocalHostname(refUrl.hostname)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  const remoteAddr = req?.socket?.remoteAddress;
  if (remoteAddr) {
    const cleanAddr = String(remoteAddr).toLowerCase();
    const isLoopback =
      cleanAddr === '127.0.0.1' ||
      cleanAddr === '::1' ||
      cleanAddr === '::ffff:127.0.0.1';
    if (!isLoopback) {
      return false;
    }
  }

  return true;
}

/**
 * Detect an available system shell for Windows, macOS, or Linux.
 */
export function detectSystemShell(
  platform = process.platform,
  env = process.env,
  existsSync = fs.existsSync
) {
  if (platform === 'win32') {
    const comSpec = env?.ComSpec || env?.COMSPEC;
    if (comSpec && existsSync(comSpec)) {
      return { shell: comSpec, name: path.basename(comSpec), platform };
    }
    return { shell: 'cmd.exe', name: 'cmd.exe', platform };
  }

  const candidates = [
    env?.SHELL,
    platform === 'darwin' ? '/bin/zsh' : '/bin/bash',
    '/bin/bash',
    '/bin/zsh',
    '/bin/sh',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return { shell: candidate, name: path.basename(candidate), platform };
    }
  }

  return { shell: '/bin/sh', name: 'sh', platform };
}

/**
 * Check whether targetPath is equal to or inside rootPath.
 */
export function isPathWithinRoot(targetPath, rootPath, platform = process.platform) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(rootPath);
  const normTarget = platform === 'win32' ? resolvedTarget.toLowerCase() : resolvedTarget;
  const normRoot = platform === 'win32' ? resolvedRoot.toLowerCase() : resolvedRoot;
  return normTarget === normRoot || normTarget.startsWith(normRoot + path.sep);
}

/**
 * Resolve and validate the working directory for terminal execution.
 * Rejects nonexistent/stale paths and paths outside allowed workspace roots.
 */
export function resolveTerminalCwd({
  requestedCwd,
  workspaceRoot,
  fallbackCwd = process.cwd(),
}) {
  const validFallback =
    fallbackCwd && fs.existsSync(fallbackCwd) && fs.statSync(fallbackCwd).isDirectory()
      ? path.resolve(fallbackCwd)
      : process.cwd();

  const validWorkspaceRoot =
    workspaceRoot && fs.existsSync(workspaceRoot) && fs.statSync(workspaceRoot).isDirectory()
      ? path.resolve(workspaceRoot)
      : null;

  const primaryRoot = validWorkspaceRoot || validFallback;
  const projectsDir = path.join(os.homedir(), 'IntelliCodeProjects');
  const allowedRoots = [primaryRoot, validFallback];
  if (fs.existsSync(projectsDir) && fs.statSync(projectsDir).isDirectory()) {
    allowedRoots.push(path.resolve(projectsDir));
  }

  if (!requestedCwd || !String(requestedCwd).trim()) {
    return {
      cwd: primaryRoot,
      allowedRoot: primaryRoot,
      corrected: false,
      warning: null,
    };
  }

  const resolvedRequested = path.resolve(String(requestedCwd).trim());
  if (!fs.existsSync(resolvedRequested) || !fs.statSync(resolvedRequested).isDirectory()) {
    return {
      cwd: primaryRoot,
      allowedRoot: primaryRoot,
      corrected: true,
      warning: `Stale or invalid working directory "${requestedCwd}" was reset to "${primaryRoot}".`,
    };
  }

  const withinAllowed = allowedRoots.some((root) => isPathWithinRoot(resolvedRequested, root));
  if (!withinAllowed) {
    return {
      cwd: primaryRoot,
      allowedRoot: primaryRoot,
      corrected: true,
      warning: `Working directory "${requestedCwd}" is outside the active workspace; reset to "${primaryRoot}".`,
    };
  }

  return {
    cwd: resolvedRequested,
    allowedRoot: validWorkspaceRoot || primaryRoot,
    corrected: false,
    warning: null,
  };
}

/**
 * Handle `cd` commands safely within the active workspace root.
 */
export function handleCdCommand(command, currentCwd, allowedRoot) {
  const cdMatch = String(command || '').trim().match(/^cd(?:\s+\/d)?(?:\s+(.*))?$/i);
  if (!cdMatch) return null;

  const rawTarget = (cdMatch[1] || '').trim().replace(/^["']|["']$/g, '');
  if (!rawTarget || rawTarget === '~') {
    const target = allowedRoot || os.homedir();
    return {
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      cwd: path.resolve(target).replace(/\\/g, '/'),
    };
  }

  const nextDir = path.resolve(currentCwd, rawTarget);
  if (!fs.existsSync(nextDir) || !fs.statSync(nextDir).isDirectory()) {
    return {
      success: false,
      stdout: '',
      stderr: `cd: no such directory: ${rawTarget}`,
      exitCode: 1,
      cwd: path.resolve(currentCwd).replace(/\\/g, '/'),
    };
  }

  if (allowedRoot && !isPathWithinRoot(nextDir, allowedRoot)) {
    return {
      success: false,
      stdout: '',
      stderr: `cd: access restricted to active workspace root (${allowedRoot.replace(/\\/g, '/')})`,
      exitCode: 1,
      cwd: path.resolve(currentCwd).replace(/\\/g, '/'),
    };
  }

  return {
    success: true,
    stdout: '',
    stderr: '',
    exitCode: 0,
    cwd: nextDir.replace(/\\/g, '/'),
  };
}

/**
 * Execute a shell command inside a validated workspace directory.
 * Note: Working-directory validation is not a complete OS security sandbox.
 */
export function executeTerminalCommand(
  command,
  { requestedCwd, workspaceRoot, fallbackCwd = process.cwd(), timeoutMs = 30000 } = {}
) {
  const trimmed = String(command || '').trim();
  const shellInfo = detectSystemShell();
  const cwdResolution = resolveTerminalCwd({ requestedCwd, workspaceRoot, fallbackCwd });
  const effectiveCwd = cwdResolution.cwd;
  const normalizedCwd = effectiveCwd.replace(/\\/g, '/');

  if (!trimmed) {
    return Promise.resolve({
      success: true,
      stdout: '',
      stderr: cwdResolution.warning || '',
      exitCode: 0,
      cwd: normalizedCwd,
      shell: shellInfo.name,
      warning: cwdResolution.warning,
    });
  }

  const cdResult = handleCdCommand(trimmed, effectiveCwd, cwdResolution.allowedRoot);
  if (cdResult) {
    return Promise.resolve({
      ...cdResult,
      stderr: cwdResolution.warning
        ? [cwdResolution.warning, cdResult.stderr].filter(Boolean).join('\n')
        : cdResult.stderr,
      shell: shellInfo.name,
      warning: cwdResolution.warning,
    });
  }

  return new Promise((resolve) => {
    exec(
      trimmed,
      {
        cwd: effectiveCwd,
        shell: shellInfo.shell,
        timeout: timeoutMs,
        maxBuffer: 5 * 1024 * 1024,
        env: {
          ...process.env,
          FORCE_COLOR: '0',
        },
      },
      (err, stdout, stderr) => {
        let exitCode = 0;
        if (err) {
          exitCode = typeof err.code === 'number' ? err.code : 1;
        }
        const errText = stderr ? stderr.toString() : err && !stdout ? err.message : '';
        const combinedStderr = cwdResolution.warning
          ? [cwdResolution.warning, errText].filter(Boolean).join('\n')
          : errText;

        resolve({
          success: exitCode === 0,
          stdout: stdout ? stdout.toString() : '',
          stderr: combinedStderr,
          exitCode,
          cwd: normalizedCwd,
          shell: shellInfo.name,
          warning: cwdResolution.warning,
        });
      }
    );
  });
}
