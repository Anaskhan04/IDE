import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
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
    githubRepos,
    isGitHubLoading,
    githubError,
    loginWithGitHubToken,
    logoutGitHub,
    fetchGitHubRepos,
    cloneGitHubRepo,
    publishToGitHub,
    files,
    masterPrompt,
  } = useIDE();

  const [tokenInput, setTokenInput] = useState('');
  const [repoFilter, setRepoFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'private' | 'public'>('all');

  // Create / Publish Repo Form
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);

  // OAuth Device Flow state
  const [showDeviceFlow, setShowDeviceFlow] = useState(false);
  const [oauthClientId, setOauthClientId] = useState('');
  const [devicePrompt, setDevicePrompt] = useState<{
    userCode: string;
    verificationUri: string;
    deviceCode: string;
  } | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);

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

  if (!isGitHubModalOpen) return null;

  const handleTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    const ok = await loginWithGitHubToken(tokenInput.trim());
    if (ok) {
      setTokenInput('');
    }
  };

  const handleStartDeviceFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeviceError(null);
    if (!oauthClientId.trim()) {
      setDeviceError('Enter your GitHub OAuth App Client ID.');
      return;
    }
    const res = await githubService.startDeviceFlow(oauthClientId.trim());
    if (!res.success || !res.device_code || !res.user_code || !res.verification_uri) {
      setDeviceError(res.error || 'Could not start GitHub Device Flow.');
      return;
    }
    setDevicePrompt({
      userCode: res.user_code,
      verificationUri: res.verification_uri,
      deviceCode: res.device_code,
    });
    window.open(res.verification_uri, '_blank', 'noopener,noreferrer');

    // Poll for access token
    const intervalMs = Math.max(5000, (res.interval || 5) * 1000);
    const timer = setInterval(async () => {
      const tokRes = await githubService.pollDeviceToken(oauthClientId.trim(), res.device_code!);
      if (tokRes.access_token) {
        clearInterval(timer);
        setDevicePrompt(null);
        await loginWithGitHubToken(tokRes.access_token);
      } else if (tokRes.error && tokRes.error !== 'authorization_pending' && tokRes.error !== 'slow_down') {
        clearInterval(timer);
        setDeviceError(tokRes.error_description || tokRes.error);
        setDevicePrompt(null);
      }
    }, intervalMs);
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
                {githubUser ? `GitHub · @${githubUser.login}` : 'Sign in with GitHub'}
              </h2>
              <p className="text-[11px] text-ide-muted">
                {githubUser
                  ? 'Open any private or public repository and sync commits directly to GitHub.'
                  : 'Connect your GitHub account to work directly on your private and public repositories.'}
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
          <div className="flex items-center gap-2 border-b border-ide-rose/30 bg-ide-rose/10 px-4 py-2 text-xs text-ide-rose">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{githubError}</span>
          </div>
        )}

        {!githubUser ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-5">
            <form onSubmit={handleTokenLogin} className="space-y-3 rounded-ide-panel border border-ide-border bg-ide-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-ide-strong">
                  <KeyRound className="h-4 w-4 text-ide-cyan" />
                  <span>Sign in with GitHub Personal Access Token</span>
                </div>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=IntelliCode+IDE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-ide-focus hover:underline"
                >
                  Generate Token on GitHub <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-xs leading-relaxed text-ide-muted">
                Enable the <code className="font-mono text-ide-text">repo</code> scope to read, clone, commit, and push to both <strong>private</strong> and <strong>public</strong> repositories.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_... or github_pat_..."
                  className="ide-focus-ring min-w-0 flex-1 rounded-ide-control border border-ide-border-strong bg-ide-bg px-3 py-2 font-mono text-xs text-ide-strong outline-none"
                />
                <button
                  type="submit"
                  disabled={!tokenInput.trim() || isGitHubLoading}
                  className="ide-focus-ring rounded-ide-control bg-ide-focus px-4 py-2 text-xs font-semibold text-white hover:bg-ide-focus/90 disabled:opacity-50"
                >
                  {isGitHubLoading ? 'Verifying…' : 'Sign in'}
                </button>
              </div>
            </form>

            {/* Optional GitHub OAuth Device Flow */}
            <div className="rounded-ide-panel border border-ide-border bg-ide-bg p-4">
              <button
                type="button"
                onClick={() => setShowDeviceFlow((v) => !v)}
                className="flex w-full items-center justify-between text-xs font-semibold text-ide-text"
              >
                <span>Or Sign in via GitHub Browser OAuth (Device Flow)</span>
                <span className="font-mono text-[10px] text-ide-focus">{showDeviceFlow ? 'Hide' : 'Expand'}</span>
              </button>

              {showDeviceFlow && (
                <form onSubmit={handleStartDeviceFlow} className="mt-3 space-y-3 border-t border-ide-border pt-3">
                  <p className="text-[11px] text-ide-muted">
                    Requires a GitHub OAuth App Client ID with Device Flow enabled in GitHub Developer Settings.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={oauthClientId}
                      onChange={(e) => setOauthClientId(e.target.value)}
                      placeholder="GitHub OAuth Client ID (Ov23...)"
                      className="ide-focus-ring min-w-0 flex-1 rounded-ide-control border border-ide-border-strong bg-ide-surface px-3 py-1.5 font-mono text-xs text-ide-strong outline-none"
                    />
                    <button
                      type="submit"
                      className="ide-focus-ring rounded-ide-control border border-ide-border-strong bg-ide-card px-3 py-1.5 text-xs font-medium text-ide-text hover:bg-ide-hover"
                    >
                      Authorize in Browser
                    </button>
                  </div>
                  {deviceError && <div className="text-xs text-ide-rose">{deviceError}</div>}
                  {devicePrompt && (
                    <div className="rounded-ide-control border border-ide-focus/40 bg-ide-selected p-3 text-xs">
                      <div className="text-ide-text">
                        Enter this code at{' '}
                        <a
                          href={devicePrompt.verificationUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ide-cyan underline"
                        >
                          {devicePrompt.verificationUri}
                        </a>
                        :
                      </div>
                      <div className="mt-1.5 font-mono text-lg font-bold tracking-widest text-ide-strong">
                        {devicePrompt.userCode}
                      </div>
                      <div className="mt-1 text-[10px] text-ide-muted">Waiting for authorization…</div>
                    </div>
                  )}
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
                <div>
                  <div className="text-xs font-semibold text-ide-strong">{githubUser.name}</div>
                  <div className="font-mono text-[10px] text-ide-subtle">@{githubUser.login}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPublishForm((v) => !v);
                    if (!newRepoName) {
                      setNewRepoName(
                        masterPrompt.projectName && masterPrompt.projectName !== 'workspace'
                          ? masterPrompt.projectName.replace(/[^a-zA-Z0-9._-]/g, '-')
                          : 'my-intellicode-project'
                      );
                    }
                  }}
                  className="ide-focus-ring flex items-center gap-1.5 rounded-ide-control bg-ide-focus px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-ide-focus/90"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>{files.length > 0 ? 'Publish Workspace' : 'New GitHub Repo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fetchGitHubRepos()}
                  disabled={isGitHubLoading}
                  className="ide-focus-ring flex items-center gap-1 rounded-ide-control border border-ide-border-strong px-2.5 py-1.5 text-xs text-ide-text hover:bg-ide-hover"
                  title="Refresh repositories"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isGitHubLoading ? 'animate-spin text-ide-cyan' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={logoutGitHub}
                  className="ide-focus-ring flex items-center gap-1 rounded-ide-control border border-ide-border px-2.5 py-1.5 text-xs text-ide-muted hover:text-ide-rose"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>

            {/* Publish / Create Repo Form */}
            {showPublishForm && (
              <form onSubmit={handlePublishSubmit} className="border-b border-ide-border bg-ide-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ide-strong">
                    Create & Publish Repository on GitHub
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPublishForm(false)}
                    className="text-ide-muted hover:text-ide-text"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="Repository name"
                    className="ide-focus-ring rounded-ide-control border border-ide-border-strong bg-ide-bg px-3 py-1.5 font-mono text-xs text-ide-strong outline-none"
                  />
                  <input
                    type="text"
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="ide-focus-ring rounded-ide-control border border-ide-border-strong bg-ide-bg px-3 py-1.5 text-xs text-ide-strong outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewRepoPrivate(true)}
                      className={`flex items-center gap-1.5 rounded-ide-control border px-2.5 py-1 text-xs ${
                        newRepoPrivate
                          ? 'border-ide-amber bg-ide-amber/15 text-ide-amber font-semibold'
                          : 'border-ide-border text-ide-muted'
                      }`}
                    >
                      <Lock className="h-3 w-3" /> Private
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRepoPrivate(false)}
                      className={`flex items-center gap-1.5 rounded-ide-control border px-2.5 py-1 text-xs ${
                        !newRepoPrivate
                          ? 'border-ide-emerald bg-ide-emerald/15 text-ide-emerald font-semibold'
                          : 'border-ide-border text-ide-muted'
                      }`}
                    >
                      <Globe className="h-3 w-3" /> Public
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={!newRepoName.trim() || isGitHubLoading}
                    className="ide-focus-ring flex items-center gap-1.5 rounded-ide-control bg-ide-focus px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-ide-focus/90 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create & Push Workspace</span>
                  </button>
                </div>
              </form>
            )}

            {/* Repo Search & Visibility Filter */}
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
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.2 font-mono text-[9px] ${
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
                      className="ide-focus-ring shrink-0 rounded-ide-control border border-ide-focus/60 bg-ide-selected px-3 py-1.5 text-xs font-semibold text-ide-strong hover:bg-ide-focus hover:text-white disabled:opacity-50 transition-colors"
                    >
                      Clone & Open
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
