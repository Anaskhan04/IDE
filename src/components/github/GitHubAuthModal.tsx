import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FolderGit2,
  GitBranch,
  Github,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Terminal,
  UploadCloud,
  X,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { githubService } from '../../utils/githubService';

export const GitHubAuthModal: React.FC = () => {
  const {
    isGitHubModalOpen,
    setIsGitHubModalOpen,
    githubUser,
    githubAuthMethod,
    githubOAuthConfigured,
    githubCliAvailable,
    githubRepos,
    isGitHubLoading,
    githubError,
    refreshGitHubAuthStatus,
    loginWithGitHubCli,
    loginWithGitHubToken,
    setAuthenticatedGitHubUser,
    logoutGitHub,
    fetchGitHubRepos,
    cloneGitHubRepo,
    publishToGitHub,
    files,
    masterPrompt,
  } = useIDE();

  const [tokenInput, setTokenInput] = useState('');
  const [showAdvancedPat, setShowAdvancedPat] = useState(false);
  const [repoFilter, setRepoFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'private' | 'public'>('all');

  // Create / Publish Repo Form
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);

  // OAuth Device Flow state
  const [isStartingOAuth, setIsStartingOAuth] = useState(false);
  const [devicePrompt, setDevicePrompt] = useState<{
    userCode: string;
    verificationUri: string;
    deviceCode: string;
    clientId?: string;
  } | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flowActiveRef = useRef(false);

  const stopPolling = () => {
    flowActiveRef.current = false;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setDevicePrompt(null);
  };

  useEffect(() => {
    if (isGitHubModalOpen) {
      refreshGitHubAuthStatus();
    } else {
      stopPolling();
      setDeviceError(null);
    }
  }, [isGitHubModalOpen]);

  useEffect(() => {
    if (isGitHubModalOpen && githubUser && githubRepos.length === 0) {
      fetchGitHubRepos();
    }
  }, [isGitHubModalOpen, githubUser]);

  useEffect(() => {
    if (!isGitHubModalOpen) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsGitHubModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGitHubModalOpen, setIsGitHubModalOpen]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  if (!isGitHubModalOpen) return null;

  const handleTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    const ok = await loginWithGitHubToken(tokenInput.trim());
    if (ok) {
      setTokenInput('');
      setShowAdvancedPat(false);
    }
  };

  const handleStartDeviceFlow = async () => {
    stopPolling();
    setDeviceError(null);
    setIsStartingOAuth(true);

    const res = await githubService.startDeviceFlow();
    setIsStartingOAuth(false);

    if (!res.success || !res.device_code || !res.user_code || !res.verification_uri) {
      setDeviceError(res.error || 'Could not start GitHub sign-in.');
      return;
    }

    flowActiveRef.current = true;
    const promptState = {
      userCode: res.user_code,
      verificationUri: res.verification_uri,
      deviceCode: res.device_code,
      clientId: res.clientId,
    };
    setDevicePrompt(promptState);
    window.open(res.verification_uri, '_blank', 'noopener,noreferrer');

    let currentDelayMs = Math.max(5000, (res.interval || 5) * 1000);

    const scheduleNextPoll = () => {
      if (!flowActiveRef.current) return;
      pollTimeoutRef.current = setTimeout(async () => {
        if (!flowActiveRef.current) return;
        const tokRes = await githubService.pollDeviceToken(promptState.deviceCode, promptState.clientId);
        if (!flowActiveRef.current) return;

        if (tokRes.authenticated && tokRes.user) {
          stopPolling();
          await setAuthenticatedGitHubUser(tokRes.user, 'oauth');
          return;
        }

        if (tokRes.pending) {
          if (tokRes.slowDown) {
            currentDelayMs += 5000;
          }
          scheduleNextPoll();
          return;
        }

        stopPolling();
        if (tokRes.error === 'expired_token') {
          setDeviceError('GitHub sign-in code expired. Please try again.');
        } else if (tokRes.error === 'access_denied') {
          setDeviceError('GitHub sign-in was cancelled in the browser.');
        } else {
          setDeviceError(tokRes.error_description || tokRes.error || 'GitHub sign-in failed.');
        }
      }, currentDelayMs);
    };

    scheduleNextPoll();
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;
    const ok = await publishToGitHub(newRepoName.trim(), newRepoDesc.trim(), newRepoPrivate);
    if (ok) {
      setShowPublishForm(false);
      setNewRepoName('');
      setNewRepoDesc('');
    }
  };

  const filteredRepos = githubRepos.filter((r) => {
    if (visibilityFilter === 'private' && !r.private) return false;
    if (visibilityFilter === 'public' && r.private) return false;
    if (!repoFilter.trim()) return true;
    const q = repoFilter.toLowerCase();
    return r.fullName.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onClick={() => setIsGitHubModalOpen(false)}
    >
      <section
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-ide-panel border border-ide-border-strong bg-ide-panel shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b border-ide-border px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <Github className="h-5 w-5 text-ide-strong" aria-hidden="true" />
            <div>
              <h2 id="github-modal-title" className="text-sm font-semibold text-ide-strong">
                {githubUser ? `GitHub · @${githubUser.login}` : 'Sign in to GitHub'}
              </h2>
              <p className="text-[11px] text-ide-muted">
                {githubUser
                  ? 'Browse, clone, create, and sync private or public repositories.'
                  : 'Connect your GitHub account using a backend-managed session.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsGitHubModalOpen(false)}
            className="ide-focus-ring flex h-8 w-8 items-center justify-center rounded-ide-control text-ide-muted hover:bg-ide-hover hover:text-ide-text"
            aria-label="Close GitHub panel"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {githubError && (
          <div className="flex items-center gap-2 border-b border-ide-rose/30 bg-ide-rose/10 px-4 py-2 text-xs text-ide-rose" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{githubError}</span>
          </div>
        )}

        {!githubUser ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
            {/* Primary Browser Sign-In */}
            <div className="rounded-ide-panel border border-ide-border bg-ide-surface p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-ide-strong">Browser OAuth Sign-In</div>
                  <p className="mt-0.5 text-[11px] text-ide-muted">
                    Authorize IntelliCode in your browser without pasting tokens.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartDeviceFlow}
                  disabled={isStartingOAuth || Boolean(devicePrompt)}
                  className="ide-focus-ring inline-flex items-center gap-2 rounded-ide-control bg-ide-focus px-4 py-2 text-xs font-semibold text-ide-strong hover:bg-ide-focus/90 disabled:opacity-50"
                >
                  <Github className="h-3.5 w-3.5" />
                  {isStartingOAuth ? 'Starting…' : devicePrompt ? 'Waiting…' : 'Sign in with GitHub'}
                </button>
              </div>

              {!githubOAuthConfigured && !deviceError && !devicePrompt && (
                <div className="rounded-ide-control border border-ide-border bg-ide-bg px-3 py-2 text-[11px] text-ide-muted">
                  Server OAuth Client ID (<code className="font-mono text-ide-text">GITHUB_OAUTH_CLIENT_ID</code>) is not configured.
                  Use GitHub CLI or Personal Access Token below.
                </div>
              )}

              {deviceError && (
                <div className="rounded-ide-control border border-ide-rose/30 bg-ide-rose/10 px-3 py-2 text-xs text-ide-rose">
                  {deviceError}
                </div>
              )}

              {devicePrompt && (
                <div className="rounded-ide-control border border-ide-focus/40 bg-ide-selected p-3 text-xs space-y-2">
                  <div className="text-ide-text">
                    Enter this code at{' '}
                    <a
                      href={devicePrompt.verificationUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-ide-cyan underline"
                    >
                      {devicePrompt.verificationUri} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="font-mono text-lg font-bold tracking-widest text-ide-strong">
                    {devicePrompt.userCode}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-ide-muted">Waiting for browser authorization…</span>
                    <button
                      type="button"
                      onClick={() => {
                        stopPolling();
                        setDeviceError('GitHub sign-in cancelled.');
                      }}
                      className="ide-focus-ring rounded-ide-control border border-ide-border px-2 py-1 text-[10px] text-ide-text hover:bg-ide-hover"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* GitHub CLI Option */}
            <div className="rounded-ide-panel border border-ide-border bg-ide-surface p-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Terminal className="mt-0.5 h-4 w-4 text-ide-cyan shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-ide-strong">GitHub CLI Session</div>
                  <p className="mt-0.5 text-[11px] text-ide-muted">
                    {githubCliAvailable
                      ? 'Detected an active GitHub CLI (`gh`) session on this machine. Token stays strictly on the backend.'
                      : 'Sign in locally via `gh auth login` in your terminal to connect without pasting tokens.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loginWithGitHubCli()}
                disabled={!githubCliAvailable || isGitHubLoading}
                className="ide-focus-ring shrink-0 rounded-ide-control border border-ide-border-strong bg-ide-card px-3 py-1.5 text-xs font-medium text-ide-text hover:bg-ide-hover disabled:opacity-40"
              >
                Use GitHub CLI
              </button>
            </div>

            {/* Advanced: Personal Access Token (Collapsed by default) */}
            <div className="rounded-ide-panel border border-ide-border bg-ide-bg">
              <button
                type="button"
                onClick={() => setShowAdvancedPat((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-ide-muted hover:text-ide-text"
              >
                <span className="flex items-center gap-2">
                  {showAdvancedPat ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <KeyRound className="h-3.5 w-3.5 text-ide-subtle" />
                  Advanced: Sign in with Personal Access Token
                </span>
              </button>

              {showAdvancedPat && (
                <form onSubmit={handleTokenLogin} className="border-t border-ide-border p-4 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-ide-muted">
                    <span>Requires <code className="font-mono text-ide-text">repo</code> scope. Stored only in backend session.</span>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=IntelliCode+IDE"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[10px] text-ide-focus hover:underline"
                    >
                      Create Token <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="ghp_... or github_pat_..."
                      className="ide-focus-ring min-w-0 flex-1 rounded-ide-control border border-ide-border-strong bg-ide-surface px-3 py-1.5 font-mono text-xs text-ide-strong outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!tokenInput.trim() || isGitHubLoading}
                      className="ide-focus-ring rounded-ide-control bg-ide-focus px-4 py-1.5 text-xs font-semibold text-ide-strong hover:bg-ide-focus/90 disabled:opacity-50"
                    >
                      {isGitHubLoading ? 'Verifying…' : 'Sign in'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Authenticated User Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ide-border bg-ide-surface px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                {githubUser.avatarUrl && (
                  <img
                    src={githubUser.avatarUrl}
                    alt={githubUser.login}
                    className="h-7 w-7 rounded-full border border-ide-border-strong"
                  />
                )}
                <div className="text-xs">
                  <div className="flex items-center gap-2 font-semibold text-ide-strong">
                    <span>{githubUser.name}</span>
                    {githubAuthMethod && (
                      <span className="rounded-ide-control border border-ide-border bg-ide-bg px-1.5 py-0.5 font-mono text-[9px] text-ide-muted">
                        via {githubAuthMethod}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-ide-emerald">Connected as @{githubUser.login}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewRepoName(
                      masterPrompt.projectName && masterPrompt.projectName !== 'workspace'
                        ? masterPrompt.projectName.toLowerCase().replace(/[^a-z0-9-_]/g, '-')
                        : 'intellicode-project'
                    );
                    setShowPublishForm((v) => !v);
                  }}
                  className="ide-focus-ring inline-flex items-center gap-1.5 rounded-ide-control bg-ide-emerald px-3 py-1.5 text-xs font-semibold text-ide-shell hover:bg-ide-emerald/90"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Publish Workspace
                </button>
                <button
                  type="button"
                  onClick={() => fetchGitHubRepos()}
                  disabled={isGitHubLoading}
                  className="ide-focus-ring inline-flex items-center gap-1 rounded-ide-control border border-ide-border-strong bg-ide-bg px-2.5 py-1.5 text-xs text-ide-text hover:bg-ide-hover disabled:opacity-50"
                  title="Refresh repositories"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isGitHubLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => logoutGitHub()}
                  className="ide-focus-ring inline-flex items-center gap-1 rounded-ide-control border border-ide-border px-2.5 py-1.5 text-xs text-ide-muted hover:bg-ide-hover hover:text-ide-rose"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </div>

            {showPublishForm && (
              <form onSubmit={handlePublishSubmit} className="border-b border-ide-border bg-ide-bg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-ide-strong">
                    <Plus className="h-3.5 w-3.5 text-ide-emerald" />
                    <span>Publish Current Workspace ({files.length} files) to New GitHub Repository</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPublishForm(false)}
                    className="text-xs text-ide-muted hover:text-ide-text"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="Repository name (e.g. my-app)"
                    className="ide-focus-ring rounded-ide-control border border-ide-border-strong bg-ide-surface px-3 py-1.5 font-mono text-xs text-ide-strong outline-none"
                  />
                  <input
                    type="text"
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="ide-focus-ring rounded-ide-control border border-ide-border-strong bg-ide-surface px-3 py-1.5 text-xs text-ide-strong outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-ide-text">
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="radio"
                        checked={newRepoPrivate}
                        onChange={() => setNewRepoPrivate(true)}
                      />
                      <Lock className="h-3.5 w-3.5 text-ide-amber" />
                      <span>Private Repository</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="radio"
                        checked={!newRepoPrivate}
                        onChange={() => setNewRepoPrivate(false)}
                      />
                      <Globe className="h-3.5 w-3.5 text-ide-emerald" />
                      <span>Public Repository</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="ide-focus-ring rounded-ide-control bg-ide-focus px-4 py-1.5 text-xs font-semibold text-ide-strong hover:bg-ide-focus/90"
                  >
                    Create &amp; Push
                  </button>
                </div>
              </form>
            )}

            {/* Repository Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-ide-border bg-ide-bg px-4 py-2">
              <div className="relative flex min-w-[200px] flex-1 items-center rounded-ide-control border border-ide-border bg-ide-surface px-2.5">
                <Search className="h-3.5 w-3.5 text-ide-subtle" />
                <input
                  type="text"
                  value={repoFilter}
                  onChange={(e) => setRepoFilter(e.target.value)}
                  placeholder="Filter repositories…"
                  className="min-w-0 flex-1 bg-transparent px-2 py-1 text-xs text-ide-strong outline-none placeholder:text-ide-subtle"
                />
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px]">
                {(['all', 'private', 'public'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisibilityFilter(v)}
                    className={`rounded-ide-control px-2 py-1 capitalize ${
                      visibilityFilter === v
                        ? 'bg-ide-selected text-ide-strong font-semibold'
                        : 'text-ide-muted hover:bg-ide-hover'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Repositories List */}
            <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-ide-border">
              {isGitHubLoading && githubRepos.length === 0 ? (
                <div className="p-8 text-center font-mono text-xs text-ide-muted">
                  Loading repositories from GitHub…
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="p-8 text-center text-xs text-ide-muted">
                  No matching repositories found.
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ide-hover/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="h-4 w-4 shrink-0 text-ide-cyan" />
                        <span className="truncate font-mono text-xs font-semibold text-ide-strong">
                          {repo.fullName}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] ${
                            repo.private
                              ? 'border-ide-amber/40 bg-ide-amber/10 text-ide-amber'
                              : 'border-ide-emerald/40 bg-ide-emerald/10 text-ide-emerald'
                          }`}
                        >
                          {repo.private ? <Lock className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
                          {repo.private ? 'Private' : 'Public'}
                        </span>
                        {repo.language && (
                          <span className="font-mono text-[10px] text-ide-subtle">{repo.language}</span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="mt-1 truncate text-xs text-ide-muted">{repo.description}</p>
                      )}
                      <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-ide-subtle">
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" /> {repo.defaultBranch}
                        </span>
                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-ide-focus"
                        >
                          View on GitHub <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => cloneGitHubRepo(repo)}
                      disabled={isGitHubLoading}
                      className="ide-focus-ring shrink-0 rounded-ide-control border border-ide-focus/60 bg-ide-selected px-3 py-1.5 text-xs font-semibold text-ide-strong hover:bg-ide-focus hover:text-ide-strong disabled:opacity-50 transition-colors"
                    >
                      Clone &amp; Open
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
