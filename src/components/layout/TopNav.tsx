import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Code2,
  Command,
  Github,
  Search,
  Settings,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { GlobalSearchModal } from '../search/GlobalSearchModal';

export const TopNav: React.FC = () => {
  const {
    activeModel,
    apiKeys,
    masterPrompt,
    isCopilotOpen,
    setIsCopilotOpen,
    setIsModelSwitchingModalOpen,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setSidebarView,
    setIsSidebarVisible,
    toggleProblemsPanel,
    toggleTerminal,
    githubUser,
    setIsGitHubModalOpen,
    gitBranch,
    isGitRepo,
    pushToGitHub,
    logoutGitHub,
    gitLoading,
  } = useIDE();

  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'all' | 'files' | 'symbols' | 'commands'>('all');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Global keyboard shortcuts for Search / Quick Open / Command Palette
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+` -> Toggle Integrated Terminal
      if ((event.ctrlKey || event.metaKey) && event.key === '`') {
        event.preventDefault();
        toggleTerminal();
        return;
      }

      // Ctrl+Shift+M -> Toggle Problems Panel
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        toggleProblemsPanel();
        return;
      }

      // Ctrl+Shift+P or F1 -> Command Palette
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setSearchMode('commands');
        setSearchInitialQuery('>');
        setIsCommandPaletteOpen(true);
      } else if (event.key === 'F1') {
        event.preventDefault();
        setSearchMode('commands');
        setSearchInitialQuery('>');
        setIsCommandPaletteOpen(true);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
        // Ctrl+P -> Quick File Open
        event.preventDefault();
        setSearchMode('files');
        setSearchInitialQuery('');
        setIsCommandPaletteOpen(true);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        // Ctrl+K -> Global Search
        event.preventDefault();
        setSearchMode('all');
        setSearchInitialQuery('');
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCommandPaletteOpen, toggleProblemsPanel, toggleTerminal]);

  const handleOpenSearch = (mode: 'all' | 'files' | 'symbols' | 'commands' = 'all', query = '') => {
    setSearchMode(mode);
    setSearchInitialQuery(query);
    setIsCommandPaletteOpen(true);
  };

  return (
    <>
      <header
        className="flex h-12 shrink-0 items-center gap-4 border-b border-ide-border bg-ide-shell px-3 select-none"
        data-purpose="top-navigation"
      >
        {/* Logo and Project Name */}
        <div className="flex w-[175px] shrink-0 items-center gap-2.5 lg:w-[230px]">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center border border-ide-focus/70 bg-ide-selected text-ide-focus"
            aria-hidden="true"
          >
            <Code2 className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 leading-none">
              <span className="font-semibold tracking-[0.01em] text-ide-strong">IntelliCode</span>
              <span className="font-mono text-[10px] text-ide-subtle">v0.24</span>
            </div>
            <span className="mt-1 block truncate font-mono text-[10px] text-ide-muted" title={masterPrompt.projectName || 'workspace'}>
              {masterPrompt.projectName || 'workspace'}
            </span>
          </div>
        </div>

        {/* Global Search Bar (Fully Interactive!) */}
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="global-command-search">
            Search files, symbols, commands
          </label>
          <div
            onClick={() => handleOpenSearch('all')}
            className="group mx-auto flex max-w-[680px] cursor-pointer items-center gap-2 border-b border-ide-border-strong/70 px-1.5 text-ide-muted transition-colors hover:border-ide-focus"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-ide-subtle group-hover:text-ide-focus" aria-hidden="true" />
            <input
              id="global-command-search"
              readOnly
              onClick={() => handleOpenSearch('all')}
              className="min-w-0 flex-1 cursor-pointer bg-transparent py-1.5 text-xs text-ide-text outline-none placeholder:text-ide-subtle"
              placeholder="Search files, symbols, commands (Ctrl+K or Ctrl+P)…"
            />
            <kbd className="flex items-center gap-1 border border-ide-border-strong px-1.5 py-0.5 font-mono text-[10px] text-ide-muted">
              <Command className="h-2.5 w-2.5" aria-hidden="true" />K
            </kbd>
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="relative flex shrink-0 items-center gap-2 border-l border-ide-border pl-3 text-[11px]">
          {/* AST sync indicator */}
          <div
            className="hidden items-center gap-1.5 pr-2 text-ide-emerald xl:flex cursor-pointer hover:text-ide-strong transition-colors"
            title={`AST Engine Synced - Click to search symbols`}
            onClick={() => handleOpenSearch('symbols')}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-ide-emerald" aria-hidden="true" />
            <span>AST synced</span>
          </div>

          {/* AI Model Switcher */}
          <button
            type="button"
            onClick={() => setIsModelSwitchingModalOpen(true)}
            className="ide-focus-ring ide-control flex min-h-[30px] items-center gap-1.5 border-l border-ide-border px-2 text-ide-text hover:bg-ide-hover hover:text-ide-strong"
            title="Choose AI model, configure API keys, or add custom provider"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                activeModel.requiresApiKey === false || apiKeys[activeModel.providerKey]
                  ? 'bg-ide-emerald'
                  : 'bg-ide-amber'
              }`}
              aria-hidden="true"
            />
            <span className="font-mono text-[10px] text-ide-cyan">MODEL</span>
            <span className="max-w-[130px] truncate font-medium">{activeModel.name}</span>
            <ChevronDown className="h-3 w-3 text-ide-subtle" aria-hidden="true" />
          </button>

          {/* AI Assistant / Context Inspector */}
          <button
            type="button"
            onClick={() => setIsCopilotOpen(!isCopilotOpen)}
            className={`ide-focus-ring ide-control flex min-h-[30px] items-center gap-1.5 border-l border-ide-border px-2 ${
              isCopilotOpen ? 'text-ide-cyan bg-ide-hover/50' : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
            }`}
            aria-pressed={isCopilotOpen}
            title={isCopilotOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden lg:inline">AI Chat</span>
          </button>

          {/* Settings Button (Active and working!) */}
          <button
            type="button"
            onClick={() => {
              setSidebarView('settings');
              setIsSidebarVisible(true);
            }}
            className="ide-focus-ring ide-control flex min-h-[30px] items-center border-l border-ide-border px-2 text-ide-muted hover:bg-ide-hover hover:text-ide-text"
            title="Open Editor Settings (Ctrl+,)"
            aria-label="Settings"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          {/* GitHub Login / Profile Popover */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`ide-focus-ring flex h-7 items-center gap-1.5 rounded-ide-control border px-2 font-mono text-[10px] font-semibold transition-colors ${
              githubUser
                ? 'border-ide-emerald/40 bg-ide-panel text-ide-strong hover:border-ide-emerald'
                : 'border-ide-border bg-ide-panel text-ide-text hover:border-ide-focus hover:text-ide-focus'
            }`}
            title={githubUser ? `GitHub: @${githubUser.login}` : 'Sign in with GitHub'}
            aria-label="GitHub and Account Status"
            aria-expanded={isProfileOpen}
          >
            {githubUser?.avatarUrl ? (
              <img src={githubUser.avatarUrl} alt={githubUser.login} className="h-4 w-4 rounded-full" />
            ) : (
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{githubUser ? `@${githubUser.login}` : 'GitHub'}</span>
          </button>

          {/* GitHub Auth & Environment Popover */}
          {isProfileOpen && (
            <div
              className="absolute right-0 top-10 z-50 w-76 rounded-ide-panel border border-ide-border-strong bg-ide-panel p-3.5 shadow-xl font-sans"
              role="dialog"
              aria-label="GitHub and account status"
            >
              <div className="flex items-center justify-between border-b border-ide-border pb-2.5">
                <div className="flex items-center gap-2">
                  {githubUser?.avatarUrl ? (
                    <img src={githubUser.avatarUrl} alt={githubUser.login} className="h-8 w-8 rounded-full border border-ide-border-strong" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-ide-surface font-mono text-xs font-semibold text-ide-strong">
                      <Github className="h-4 w-4" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-semibold text-ide-strong">
                      {githubUser ? githubUser.name : 'Not Signed in to GitHub'}
                    </div>
                    <div className="text-[10px] text-ide-subtle font-mono">
                      {githubUser ? `@${githubUser.login}` : 'Local Workspace Mode'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="text-ide-subtle hover:text-ide-text"
                  aria-label="Close popover"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 space-y-2.5 text-[11px]">
                {githubUser ? (
                  <div className="flex items-start gap-2 rounded-sm bg-ide-emerald/10 p-2 border border-ide-emerald/30">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-ide-emerald mt-0.5" />
                    <div>
                      <div className="font-semibold text-ide-strong">GitHub Connected</div>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-ide-muted">
                        Direct push, pull, clone, and repo creation enabled for your public &amp; private repositories.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-sm bg-ide-surface/60 p-2 border border-ide-border">
                    <AlertCircle className="h-4 w-4 shrink-0 text-ide-amber mt-0.5" />
                    <div>
                      <div className="font-semibold text-ide-text">GitHub Not Connected</div>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-ide-muted">
                        Sign in with GitHub to open private/public repos and push updates directly.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] text-ide-muted px-1">
                  <span>Active Branch:</span>
                  <span className="font-mono text-ide-text">{isGitRepo ? gitBranch || 'HEAD' : 'No Git'}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-ide-muted px-1">
                  <span>Active Model:</span>
                  <span className="font-mono text-ide-cyan">{activeModel.name}</span>
                </div>

                <div className="pt-2 border-t border-ide-border space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsGitHubModalOpen(true);
                    }}
                    className="ide-focus-ring w-full rounded-ide-control bg-ide-focus py-1.5 text-center text-[11px] font-semibold text-white hover:bg-ide-focus/90"
                  >
                    {githubUser ? 'Browse & Open GitHub Repos' : 'Sign in with GitHub'}
                  </button>
                  {githubUser && isGitRepo && (
                    <button
                      type="button"
                      disabled={gitLoading}
                      onClick={() => {
                        setIsProfileOpen(false);
                        pushToGitHub();
                      }}
                      className="ide-focus-ring w-full rounded-ide-control bg-ide-surface py-1.5 text-center text-[11px] font-medium text-ide-text hover:bg-ide-hover border border-ide-border disabled:opacity-50"
                    >
                      Push Current Branch to GitHub
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsModelSwitchingModalOpen(true);
                    }}
                    className="ide-focus-ring w-full rounded-ide-control bg-ide-surface py-1.5 text-center text-[11px] font-medium text-ide-text hover:bg-ide-hover border border-ide-border"
                  >
                    Configure AI Models &amp; API Keys
                  </button>
                  {githubUser && (
                    <button
                      type="button"
                      onClick={() => {
                        logoutGitHub();
                        setIsProfileOpen(false);
                      }}
                      className="ide-focus-ring w-full rounded-ide-control py-1 text-center text-[10px] text-ide-muted hover:text-ide-rose"
                    >
                      Sign out of GitHub
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Global Search and Command Palette Modal */}
      <GlobalSearchModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        initialQuery={searchInitialQuery}
        defaultMode={searchMode}
      />
    </>
  );
};
