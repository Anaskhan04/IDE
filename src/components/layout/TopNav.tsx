import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Code2,
  Cpu,
  FolderGit2,
  Github,
  HardDrive,
  KeyRound,
  LogOut,
  Search,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { GlobalSearchModal } from '../search/GlobalSearchModal';
import { Button, IconButton } from '../ui';

const isMacOS =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');

export const TopNav: React.FC = () => {
  const {
    activeModel,
    masterPrompt,
    isCopilotOpen,
    setIsCopilotOpen,
    setIsModelSwitchingModalOpen,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    toggleProblemsPanel,
    toggleTerminal,
    setIsSettingsOpen,
    githubUser,
    setIsGitHubModalOpen,
    gitBranch,
    isGitRepo,
    pushToGitHub,
    logoutGitHub,
    gitLoading,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
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

  // Global keyboard shortcuts for Search / Quick Open / Command Palette / Panels
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        setIsSettingsOpen(true);
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key === 'ArrowLeft') {
        if (canGoBack) {
          event.preventDefault();
          goBack();
        }
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key === 'ArrowRight') {
        if (canGoForward) {
          event.preventDefault();
          goForward();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === '`') {
        event.preventDefault();
        toggleTerminal();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        toggleProblemsPanel();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchInitialQuery('');
        setSearchMode('all');
        setIsCommandPaletteOpen(true);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setSearchInitialQuery('');
        setSearchMode(event.shiftKey ? 'commands' : 'files');
        setIsCommandPaletteOpen(true);
      } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        setSearchInitialQuery('');
        setSearchMode('symbols');
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCommandPaletteOpen, setIsSettingsOpen, toggleProblemsPanel, toggleTerminal, canGoBack, canGoForward, goBack, goForward]);

  const handleOpenSearch = (mode: 'all' | 'files' | 'symbols' | 'commands' = 'all') => {
    setSearchInitialQuery('');
    setSearchMode(mode);
    setIsCommandPaletteOpen(true);
  };

  const shortcutLabel = isMacOS ? '⌘K' : 'Ctrl+K';

  return (
    <>
      <header
        className="flex h-11 shrink-0 items-center justify-between gap-4 border-b border-ide-border bg-ide-shell px-3 select-none"
        data-purpose="top-navigation"
      >
        {/* Project Identity */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-ide-control border border-ide-borderStrong bg-ide-surface text-ide-focus"
            aria-hidden="true"
          >
            <Code2 className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="font-sans text-[13px] font-semibold text-ide-strong">IntelliCode</span>
            {masterPrompt.projectName && (
              <span
                className="hidden truncate font-sans text-[12px] text-ide-muted sm:inline"
                title={masterPrompt.projectName}
              >
                / {masterPrompt.projectName}
              </span>
            )}
          </div>
          <div className="ml-1 flex items-center gap-0.5" role="group" aria-label="Workspace navigation history">
            <IconButton
              label="Go Back (Alt+Left)"
              size="sm"
              disabled={!canGoBack}
              onClick={goBack}
              data-testid="nav-back-button"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
            <IconButton
              label="Go Forward (Alt+Right)"
              size="sm"
              disabled={!canGoForward}
              onClick={goForward}
              data-testid="nav-forward-button"
            >
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
          </div>
        </div>

        {/* Global Search */}
        <div className="flex min-w-0 flex-1 justify-center">
          <button
            type="button"
            onClick={() => handleOpenSearch('all')}
            aria-label={`Search files, symbols, and commands (${shortcutLabel})`}
            className="ide-focus-ring flex h-8 w-full max-w-[460px] items-center gap-2 rounded-ide-control border border-ide-borderStrong bg-ide-bg px-3 text-left font-sans text-[12px] text-ide-muted transition-colors duration-150 hover:border-ide-muted hover:text-ide-text"
          >
            <Search className="h-4 w-4 shrink-0 text-ide-subtle" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">Search files, symbols, commands…</span>
            <kbd className="shrink-0 rounded-ide-small border border-ide-border bg-ide-surface px-1.5 py-0.5 font-mono text-[11px] text-ide-subtle">
              {shortcutLabel}
            </kbd>
          </button>
        </div>

        {/* Right Actions: Assistant & Accounts */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant={isCopilotOpen ? 'primary' : 'secondary'}
            leftIcon={<Sparkles className="h-4 w-4" />}
            onClick={() => setIsCopilotOpen(!isCopilotOpen)}
            aria-pressed={isCopilotOpen}
            title={isCopilotOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
          >
            <span className="hidden sm:inline">Assistant</span>
          </Button>

          <div ref={profilePopoverRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`ide-focus-ring flex h-7 items-center gap-1.5 rounded-ide-control border px-2.5 font-sans text-[12px] font-medium transition-colors duration-150 ${
                githubUser
                  ? 'border-ide-emerald/40 bg-ide-surface text-ide-strong hover:bg-ide-hover'
                  : 'border-ide-borderStrong bg-ide-surface text-ide-text hover:bg-ide-hover'
              }`}
              title={githubUser ? `Accounts · GitHub @${githubUser.login}` : 'Accounts & Connected Services'}
              aria-label="Accounts and connected services"
              aria-expanded={isProfileOpen}
            >
              {githubUser?.avatarUrl ? (
                <img src={githubUser.avatarUrl} alt={githubUser.login} className="h-4 w-4 rounded-full" />
              ) : (
                <Github className="h-4 w-4 text-ide-muted" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{githubUser ? `@${githubUser.login}` : 'Accounts'}</span>
            </button>

            {isProfileOpen && (
              <div
                className="absolute right-0 top-9 z-50 w-80 rounded-ide-menu border border-ide-borderStrong bg-ide-panel p-4 shadow-lg font-sans"
                role="dialog"
                aria-label="Accounts and connected services"
              >
                <div className="flex items-center justify-between border-b border-ide-border pb-3">
                  <div>
                    <div className="text-[13px] font-semibold text-ide-strong">Accounts &amp; Services</div>
                    <div className="text-[12px] text-ide-muted">
                      Local workspace works offline.
                    </div>
                  </div>
                  <IconButton size="sm" label="Close accounts menu" onClick={() => setIsProfileOpen(false)}>
                    <X className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                </div>

                <div className="mt-3 space-y-3 text-[12px]">
                  {/* Local Workspace Status */}
                  <div className="rounded-ide-control border border-ide-border bg-ide-bg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-ide-strong">
                        <HardDrive className="h-4 w-4 text-ide-cyan" aria-hidden="true" />
                        Local Workspace
                      </span>
                      <span className="rounded-ide-small bg-ide-emerald/15 px-1.5 py-0.5 text-[11px] font-medium text-ide-emerald">
                        Active
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-ide-muted">
                      <span className="truncate">{masterPrompt.projectName || 'workspace'}</span>
                      <span className="font-mono text-ide-text">{isGitRepo ? gitBranch || 'HEAD' : 'No Git'}</span>
                    </div>
                  </div>

                  {/* GitHub Connection */}
                  <div className="rounded-ide-control border border-ide-border bg-ide-bg p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {githubUser?.avatarUrl ? (
                          <img
                            src={githubUser.avatarUrl}
                            alt={githubUser.login}
                            className="h-7 w-7 shrink-0 rounded-full border border-ide-borderStrong"
                          />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ide-border bg-ide-surface text-ide-strong">
                            <Github className="h-4 w-4" aria-hidden="true" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ide-strong">
                            {githubUser ? githubUser.name : 'GitHub'}
                          </div>
                          <div className="truncate text-[11px] text-ide-muted">
                            {githubUser ? `@${githubUser.login}` : 'Not connected'}
                          </div>
                        </div>
                      </div>
                      {githubUser ? (
                        <span className="inline-flex items-center gap-1 rounded-ide-small bg-ide-emerald/15 px-1.5 py-0.5 text-[11px] font-medium text-ide-emerald">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Connected
                        </span>
                      ) : (
                        <span className="rounded-ide-small border border-ide-border bg-ide-surface px-1.5 py-0.5 text-[11px] text-ide-subtle">
                          Disconnected
                        </span>
                      )}
                    </div>

                    {githubUser ? (
                      <div className="space-y-1.5">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          leftIcon={<FolderGit2 className="h-4 w-4" />}
                          onClick={() => {
                            setIsProfileOpen(false);
                            setIsGitHubModalOpen(true);
                          }}
                        >
                          Manage GitHub Repositories
                        </Button>
                        {isGitRepo && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            disabled={gitLoading}
                            leftIcon={<UploadCloud className="h-4 w-4" />}
                            onClick={() => {
                              setIsProfileOpen(false);
                              pushToGitHub();
                            }}
                          >
                            Push Current Branch
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-ide-muted hover:text-ide-rose"
                          leftIcon={<LogOut className="h-4 w-4" />}
                          onClick={() => {
                            logoutGitHub();
                            setIsProfileOpen(false);
                          }}
                        >
                          Disconnect GitHub
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        leftIcon={<Github className="h-4 w-4" />}
                        onClick={() => {
                          setIsProfileOpen(false);
                          setIsGitHubModalOpen(true);
                        }}
                      >
                        Connect GitHub
                      </Button>
                    )}
                  </div>

                  {/* AI Providers */}
                  <div className="rounded-ide-control border border-ide-border bg-ide-bg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-ide-strong">
                        <Cpu className="h-4 w-4 text-ide-purple" aria-hidden="true" />
                        AI models
                      </span>
                      <span className="max-w-[130px] truncate text-[11px] text-ide-muted">
                        {activeModel.name}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsModelSwitchingModalOpen(true);
                      }}
                    >
                      Configure AI Providers
                    </Button>
                  </div>

                  {/* Advanced Authentication */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsGitHubModalOpen(true);
                    }}
                    className="ide-focus-ring flex w-full items-center justify-between rounded-ide-control border border-ide-border bg-ide-bg px-3 py-2 text-[12px] text-ide-muted transition-colors hover:bg-ide-hover hover:text-ide-text"
                  >
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="h-4 w-4 text-ide-subtle" aria-hidden="true" />
                      Advanced authentication
                    </span>
                    <span className="text-[11px] text-ide-subtle">GitHub</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <GlobalSearchModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        initialQuery={searchInitialQuery}
        defaultMode={searchMode}
      />
    </>
  );
};
