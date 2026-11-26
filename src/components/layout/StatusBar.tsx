import React from 'react';
import { AlertTriangle, GitBranch, Github, RefreshCw, Terminal, XCircle } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';

export const StatusBar: React.FC = () => {
  const {
    files,
    activeFileId,
    gitBranch,
    isGitRepo,
    stagedFiles,
    unstagedFiles,
    stagedFileIds,
    setSidebarView,
    setIsSidebarVisible,
    diagnosticsSummary,
    toggleProblemsPanel,
    isProblemsPanelOpen,
    toggleTerminal,
    isTerminalOpen,
    githubUser,
    setIsGitHubModalOpen,
    fetchFromRemote,
    gitAhead,
    gitBehind,
    gitLoading,
  } = useIDE();

  const activeFile = files.find((file) => file.id === activeFileId);
  const changedCount = isGitRepo
    ? stagedFiles.length + unstagedFiles.length
    : files.filter((f) => f.isDirty || f.isModified).length + stagedFileIds.length;

  const languageLabel = activeFile
    ? activeFile.name.endsWith('.c') || activeFile.name.endsWith('.h')
      ? 'C'
      : activeFile.name.endsWith('.ts') || activeFile.name.endsWith('.tsx')
        ? 'TypeScript'
        : activeFile.name.endsWith('.js') || activeFile.name.endsWith('.jsx')
          ? 'JavaScript'
          : activeFile.language
    : 'Plain Text';

  return (
    <footer
      className="flex h-6 shrink-0 items-center justify-between gap-4 border-t border-ide-border bg-ide-shell px-3 font-sans text-[11px] text-ide-muted select-none"
      data-purpose="ide-status-bar"
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setSidebarView('git');
            setIsSidebarVisible(true);
          }}
          className="ide-focus-ring flex items-center gap-1.5 whitespace-nowrap rounded-ide-small px-1 py-0.5 text-ide-text hover:bg-ide-hover hover:text-ide-strong transition-colors"
          title={isGitRepo ? `Git branch: ${gitBranch}` : 'Open Source Control'}
        >
          <GitBranch className={`h-3.5 w-3.5 ${isGitRepo ? 'text-ide-focus' : 'text-ide-subtle'}`} aria-hidden="true" />
          <span>{isGitRepo ? (gitBranch || 'HEAD') : 'No Git'}</span>
          {isGitRepo && changedCount > 0 && (
            <span className="font-mono text-ide-amber">*{changedCount}</span>
          )}
        </button>

        {isGitRepo && (
          <button
            type="button"
            onClick={() => fetchFromRemote()}
            disabled={gitLoading}
            className="ide-focus-ring flex items-center gap-1 whitespace-nowrap rounded-ide-small px-1 py-0.5 text-ide-muted hover:bg-ide-hover hover:text-ide-text disabled:opacity-50"
            title="Fetch from remote"
          >
            <RefreshCw className={`h-3 w-3 ${gitLoading ? 'animate-spin text-ide-focus' : ''}`} aria-hidden="true" />
            <span className="font-mono">
              {gitAhead > 0 || gitBehind > 0 ? `↓${gitBehind} ↑${gitAhead}` : 'Sync'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={toggleProblemsPanel}
          className={`ide-focus-ring flex items-center gap-1.5 whitespace-nowrap rounded-ide-small px-1.5 py-0.5 transition-colors ${
            isProblemsPanelOpen ? 'bg-ide-selected text-ide-strong' : 'hover:bg-ide-hover hover:text-ide-text'
          }`}
          title="Toggle Problems panel (Ctrl+Shift+M)"
        >
          <XCircle
            className={`h-3.5 w-3.5 ${diagnosticsSummary.errorCount > 0 ? 'text-ide-rose' : 'text-ide-subtle'}`}
            aria-hidden="true"
          />
          <span className="font-mono">{diagnosticsSummary.errorCount}</span>
          <AlertTriangle
            className={`h-3.5 w-3.5 ${diagnosticsSummary.warningCount > 0 ? 'text-ide-amber' : 'text-ide-subtle'}`}
            aria-hidden="true"
          />
          <span className="font-mono">{diagnosticsSummary.warningCount}</span>
        </button>

        <button
          type="button"
          onClick={toggleTerminal}
          className={`ide-focus-ring hidden items-center gap-1 whitespace-nowrap rounded-ide-small px-1.5 py-0.5 transition-colors sm:flex ${
            isTerminalOpen ? 'bg-ide-selected text-ide-strong' : 'hover:bg-ide-hover hover:text-ide-text'
          }`}
          title="Toggle Terminal (Ctrl+`)"
        >
          <Terminal className="h-3.5 w-3.5 text-ide-cyan" aria-hidden="true" />
          <span>Terminal</span>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {activeFile && (
          <>
            <span className="hidden font-mono text-ide-muted sm:inline">UTF-8</span>
            <span className="text-ide-text">{languageLabel}</span>
          </>
        )}

        <button
          type="button"
          onClick={() => setIsGitHubModalOpen(true)}
          className="ide-focus-ring flex items-center gap-1.5 whitespace-nowrap rounded-ide-small px-1.5 py-0.5 hover:bg-ide-hover hover:text-ide-text transition-colors"
          title={githubUser ? `GitHub connected as @${githubUser.login}` : 'Connect GitHub'}
        >
          <Github className={`h-3.5 w-3.5 ${githubUser ? 'text-ide-emerald' : 'text-ide-subtle'}`} aria-hidden="true" />
          <span>{githubUser ? `@${githubUser.login}` : 'Connect GitHub'}</span>
        </button>
      </div>
    </footer>
  );
};
