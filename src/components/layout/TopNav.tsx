import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Code2,
  Command,
  Cpu,
  FolderGit2,
  Github,
  HardDrive,
  KeyRound,
  LogOut,
  Search,
  Settings,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { GlobalSearchModal } from '../search/GlobalSearchModal';

export const TopNav: React.FC = () => {
  const {
    activeModel,
    configuredProviders,
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
  const profilePopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileOpen) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (profilePopoverRef.current && !profilePopoverRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileOpen]);

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
                activeModel.requiresApiKey === false || configuredProviders[activeModel.providerKey]
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

          {/* Accounts & Connected Services Popover */}
          <div ref={profilePopoverRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`ide-focus-ring flex h-7 items-center gap-1.5 rounded-ide-control border px-2 font-mono text-[10px] font-semibold transition-colors ${
                githubUser
                  ? 'border-ide-emerald/40 bg-ide-panel text-ide-strong hover:border-ide-emerald'
                  : 'border-ide-border bg-ide-panel text-ide-text hover:border-ide-focus hover:text-ide-focus'
              }`}
              title={githubUser ? `Accounts · GitHub @${githubUser.login}` : 'Accounts & Connected Services'}
              aria-label="Accounts and connected services"
              aria-expanded={isProfileOpen}
            >
              {githubUser?.avatarUrl ? (
                <img src={githubUser.avatarUrl} alt={githubUser.login} className="h-4 w-4 rounded-full" />
              ) : (
                <Github className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{githubUser ? `@${githubUser.login}` : 'Accounts'}</span>
            </button>

            {isProfileOpen && (
              <div
                className="absolute right-0 top-9 z-50 w-80 rounded-ide-panel border border-ide-border-strong bg-ide-panel p-3.5 shadow-xl font-sans"
                role="dialog"
                aria-label="Accounts and connected services"
              >
                <div className="flex items-center justify-between border-b border-ide-border pb-2.5">
                  <div>
                    <div className="text-xs font-semibold text-ide-strong">Accounts &amp; Services</div>
                    <div className="text-[10px] text-ide-muted">
                      Local workspace works offline. Connect external services as needed.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(false)}
                    className="ide-focus-ring rounded-ide-control p-1 text-ide-subtle hover:bg-ide-hover hover:text-ide-text"
                    aria-label="Close accounts menu"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-3 space-y-2.5 text-[11px]">
                  {/* Local Workspace Status */}
                  <div className="rounded-ide-control border border-ide-border bg-ide-surface px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold text-ide-strong">
                        <HardDrive className="h-3.5 w-3.5 text-ide-cyan" aria-hidden="true" />
                        Local Workspace
                      </span>
                      <span className="rounded-ide-control bg-ide-emerald/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-ide-emerald">
                        Active
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-ide-muted">
                      <span className="truncate">{masterPrompt.projectName || 'workspace'}</span>
                      <span className="font-mono text-ide-text">{isGitRepo ? gitBranch || 'HEAD' : 'Local Git off'}</span>
                    </div>
                  </div>

                  {/* GitHub Connection Status */}
                  <div className="rounded-ide-control border border-ide-border bg-ide-surface p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {githubUser?.avatarUrl ? (
                          <img
                            src={githubUser.avatarUrl}
                            alt={githubUser.login}
                            className="h-7 w-7 shrink-0 rounded-full border border-ide-border-strong"
                          />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ide-border bg-ide-bg text-ide-strong">
                            <Github className="h-3.5 w-3.5" aria-hidden="true" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ide-strong">
                            {githubUser ? githubUser.name : 'GitHub'}
                          </div>
                          <div className="truncate font-mono text-[10px] text-ide-muted">
                            {githubUser ? `@${githubUser.login}` : 'Not connected'}
                          </div>
                        </div>
                      </div>
                      {githubUser ? (
                        <span className="inline-flex items-center gap-1 rounded-ide-control bg-ide-emerald/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-ide-emerald">
                          <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
                          Connected
                        </span>
                      ) : (
                        <span className="rounded-ide-control bg-ide-bg px-1.5 py-0.5 font-mono text-[9px] text-ide-subtle border border-ide-border">
                          Disconnected
                        </span>
                      )}
                    </div>

                    {githubUser ? (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            setIsGitHubModalOpen(true);
                          }}
                          className="ide-focus-ring flex w-full items-center justify-center gap-1.5 rounded-ide-control bg-ide-focus py-1.5 text-[11px] font-semibold text-ide-strong hover:bg-ide-focus/90"
                        >
                          <FolderGit2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Manage GitHub Repositories
                        </button>
                        {isGitRepo && (
                          <button
                            type="button"
                            disabled={gitLoading}
                            onClick={() => {
                              setIsProfileOpen(false);
                              pushToGitHub();
                            }}
                            className="ide-focus-ring flex w-full items-center justify-center gap-1.5 rounded-ide-control border border-ide-border bg-ide-bg py-1.5 text-[11px] font-medium text-ide-text hover:bg-ide-hover disabled:opacity-50"
                          >
                            <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
                            Push Current Branch
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            logoutGitHub();
                            setIsProfileOpen(false);
                          }}
                          className="ide-focus-ring flex w-full items-center justify-center gap-1.5 rounded-ide-control py-1 text-[10px] text-ide-muted hover:bg-ide-hover hover:text-ide-rose"
                        >
                          <LogOut className="h-3 w-3" aria-hidden="true" />
                          Disconnect GitHub
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          setIsGitHubModalOpen(true);
                        }}
                        className="ide-focus-ring flex w-full items-center justify-center gap-1.5 rounded-ide-control bg-ide-focus py-1.5 text-[11px] font-semibold text-ide-strong hover:bg-ide-focus/90"
                      >
                        <Github className="h-3.5 w-3.5" aria-hidden="true" />
                        Connect GitHub
                      </button>
                    )}
                  </div>

                  {/* AI Providers Configuration */}
                  <div className="rounded-ide-control border border-ide-border bg-ide-surface px-3 py-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold text-ide-strong">
                        <Cpu className="h-3.5 w-3.5 text-ide-purple" aria-hidden="true" />
                        AI Providers
                      </span>
                      <span className="max-w-[130px] truncate font-mono text-[10px] text-ide-cyan">
                        {activeModel.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsModelSwitchingModalOpen(true);
                      }}
                      className="ide-focus-ring w-full rounded-ide-control border border-ide-border bg-ide-bg py-1.5 text-center text-[11px] font-medium text-ide-text hover:bg-ide-hover"
                    >
                      Configure AI Providers
                    </button>
                  </div>

                  {/* Advanced Authentication Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsGitHubModalOpen(true);
                    }}
                    className="ide-focus-ring flex w-full items-center justify-between rounded-ide-control border border-ide-border bg-ide-bg px-3 py-1.5 text-[10px] text-ide-muted hover:bg-ide-hover hover:text-ide-text"
                  >
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="h-3 w-3 text-ide-subtle" aria-hidden="true" />
                      Advanced authentication settings
                    </span>
                    <span className="font-mono text-ide-subtle">GitHub</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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
