import React from 'react';
import { AlertTriangle, GitBranch, Github, RefreshCw, Terminal, XCircle } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';

export const StatusBar: React.FC = () => {
  const {
    masterPrompt,
    mcpServers,
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
        : activeFile.language.toUpperCase()
    : 'Plain Text';

  const shortLanguage = activeFile
    ? activeFile.name.endsWith('.c') || activeFile.name.endsWith('.h')
      ? 'C'
      : activeFile.name.endsWith('.ts') || activeFile.name.endsWith('.tsx')
        ? 'TS'
        : activeFile.language.toUpperCase()
    : '--';

  const connectedMcpCount = mcpServers.filter((server) => server.status === 'connected').length;
  const totalMcpCount = mcpServers.length;

  return (
    <footer
      className="flex h-7 shrink-0 items-center justify-between gap-4 border-t border-ide-border bg-ide-shell px-3 font-mono text-[10px] text-ide-muted select-none"
      data-purpose="ide-status-bar"
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setSidebarView('git');
            setIsSidebarVisible(true);
          }}
          className="ide-focus-ring flex items-center gap-1.5 whitespace-nowrap text-ide-text hover:text-ide-strong transition-colors"
          title={isGitRepo ? `Git Branch: ${gitBranch} (Click to open Source Control)` : 'Source Control (No Git repository)'}
        >
          <GitBranch className={`h-3 w-3 ${isGitRepo ? 'text-ide-focus' : 'text-ide-subtle'}`} aria-hidden="true" />
          <span>{isGitRepo ? (gitBranch || 'HEAD') : 'No Git'}</span>
          {isGitRepo && changedCount > 0 && (
            <span className="text-ide-amber font-bold">*{changedCount}</span>
          )}
        </button>
        <span className="text-ide-border-strong" aria-hidden="true">|</span>
        <button
          type="button"
          onClick={() => {
            if (isGitRepo) {
              fetchFromRemote();
            } else {
              setSidebarView('git');
              setIsSidebarVisible(true);
            }
          }}
          disabled={gitLoading}
          className="flex items-center gap-1.5 whitespace-nowrap text-ide-subtle hover:text-ide-text disabled:opacity-50"
          title={isGitRepo ? 'Fetch latest from remote' : 'Open Source Control'}
        >
          <RefreshCw className={`h-3 w-3 ${gitLoading ? 'animate-spin text-ide-focus' : ''}`} aria-hidden="true" />
          <span>
            {isGitRepo
              ? gitAhead > 0 || gitBehind > 0
                ? `↓${gitBehind} ↑${gitAhead}`
                : 'Fetch'
              : 'Source Control'}
          </span>
        </button>
        <button
          type="button"
          onClick={toggleTerminal}
          className={`ide-focus-ring hidden items-center gap-1 whitespace-nowrap rounded-ide-control px-1.5 py-0.5 sm:flex transition-colors ${
            isTerminalOpen
              ? 'bg-ide-hover/80 text-ide-cyan'
              : 'text-ide-muted hover:bg-ide-hover/50 hover:text-ide-text'
          }`}
          title="Toggle Integrated Terminal (Ctrl+`)"
        >
          <Terminal className="h-3 w-3" aria-hidden="true" />
          <span>Terminal</span>
        </button>
        <button
          type="button"
          onClick={toggleProblemsPanel}
          className={`ide-focus-ring hidden items-center gap-2 whitespace-nowrap rounded-ide-control px-1.5 py-0.5 sm:flex transition-colors ${
            isProblemsPanelOpen
              ? 'bg-ide-hover/80 text-ide-strong'
              : 'text-ide-muted hover:bg-ide-hover/50 hover:text-ide-text'
          }`}
          title={`Problems: ${diagnosticsSummary.errorCount} error${diagnosticsSummary.errorCount === 1 ? '' : 's'}, ${diagnosticsSummary.warningCount} warning${diagnosticsSummary.warningCount === 1 ? '' : 's'} (Click to toggle Problems panel)`}
          aria-label={`Diagnostics: ${diagnosticsSummary.errorCount} errors and ${diagnosticsSummary.warningCount} warnings`}
        >
          <span className={`flex items-center gap-1 ${diagnosticsSummary.errorCount > 0 ? 'text-ide-rose font-semibold' : 'text-ide-subtle'}`}>
            <XCircle className="h-3 w-3" aria-hidden="true" />
            <span>{diagnosticsSummary.errorCount}</span>
          </span>
          <span className={`flex items-center gap-1 ${diagnosticsSummary.warningCount > 0 ? 'text-ide-amber font-semibold' : 'text-ide-subtle'}`}>
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            <span>{diagnosticsSummary.warningCount}</span>
          </span>
        </button>
        <span className="hidden items-center gap-1.5 whitespace-nowrap text-ide-amber md:flex">
          <span className="h-1.5 w-1.5 bg-ide-amber" aria-hidden="true" />
          CIA Guard Active
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
        <button
          type="button"
          onClick={() => setIsGitHubModalOpen(true)}
          className="ide-focus-ring flex items-center gap-1.5 rounded-ide-control px-1.5 py-0.5 text-ide-muted hover:bg-ide-hover hover:text-ide-text"
          title={githubUser ? `GitHub connected as @${githubUser.login}` : 'Sign in with GitHub'}
        >
          <Github className={`h-3 w-3 ${githubUser ? 'text-ide-emerald' : 'text-ide-subtle'}`} aria-hidden="true" />
          <span>{githubUser ? `@${githubUser.login}` : 'GitHub: Sign in'}</span>
        </button>
        <span>MCP: {connectedMcpCount}/{totalMcpCount}</span>
        <span className="text-ide-focus">{shortLanguage}</span>
        <span className="hidden md:inline">UTF-8</span>
        <span className="hidden md:inline">LF</span>
        <span className="text-ide-text">{'{ }'} {languageLabel}</span>
      </div>
    </footer>
  );
};
