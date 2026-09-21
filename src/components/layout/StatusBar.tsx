import React from 'react';
import { GitBranch, RefreshCw } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';

export const StatusBar: React.FC = () => {
  const { masterPrompt, mcpServers, files, activeFileId } = useIDE();
  const activeFile = files.find((file) => file.id === activeFileId);

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
  const cacheLabel = masterPrompt.cacheHitRatio || 'Unknown';

  return (
    <footer
      className="flex h-7 shrink-0 items-center justify-between gap-4 border-t border-ide-border bg-ide-shell px-3 font-mono text-[10px] text-ide-muted"
      data-purpose="ide-status-bar"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-ide-text" title="Current git branch">
          <GitBranch className="h-3 w-3 text-ide-subtle" aria-hidden="true" />
          main
        </span>
        <span className="text-ide-border-strong" aria-hidden="true">|</span>
        <span className="flex items-center gap-1.5 whitespace-nowrap text-ide-subtle" title="Synchronize changes">
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          Sync
        </span>
        <span className="hidden items-center gap-2 whitespace-nowrap sm:flex" aria-label="Diagnostics: zero errors and zero warnings">
          <span>Errors 0</span>
          <span>Warnings 0</span>
        </span>
        <span className="hidden items-center gap-1.5 whitespace-nowrap text-ide-amber md:flex">
          <span className="h-1.5 w-1.5 bg-ide-amber" aria-hidden="true" />
          CIA Guard Active
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
        <span>MCP: {connectedMcpCount}/{totalMcpCount} Connected</span>
        <span className="hidden text-ide-cyan sm:inline">Cache: {cacheLabel}</span>
        <span className="text-ide-focus">{shortLanguage}</span>
        <span className="hidden md:inline">UTF-8</span>
        <span className="hidden md:inline">LF</span>
        <span className="text-ide-text">{'{ }'} {languageLabel}</span>
      </div>
    </footer>
  );
};
