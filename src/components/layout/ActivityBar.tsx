import React from 'react';
import { Database, Folder, GitBranch, Layers, Search, Settings } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';

export const ActivityBar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    sidebarView,
    setSidebarView,
    isSidebarVisible,
    setIsSidebarVisible,
    files,
    stagedFileIds,
  } = useIDE();

  const changedCount = files.filter((f) => f.isDirty || f.isModified).length + stagedFileIds.length;

  const handleSidebarItemClick = (view: 'explorer' | 'search' | 'git' | 'settings') => {
    if (sidebarView === view && isSidebarVisible) {
      setIsSidebarVisible(false);
    } else {
      setSidebarView(view);
      setIsSidebarVisible(true);
      if (view === 'explorer' && activeView !== 'editor') {
        setActiveView('editor');
      }
    }
  };

  const handleWorkspaceViewClick = (view: 'graph' | 'mcp') => {
    setActiveView(view);
  };

  return (
    <aside
      className="flex w-12 shrink-0 flex-col items-center justify-between border-r border-ide-border bg-ide-shell py-2 select-none"
      data-purpose="activity-bar"
      aria-label="Activity navigation"
    >
      <div className="flex w-full flex-col items-center gap-1">
        {/* Explorer */}
        <button
          type="button"
          onClick={() => handleSidebarItemClick('explorer')}
          className={`ide-focus-ring relative flex h-10 w-10 items-center justify-center border-l-2 transition-colors ${
            sidebarView === 'explorer' && isSidebarVisible && activeView === 'editor'
              ? 'border-ide-focus bg-ide-hover/60 text-ide-strong'
              : 'border-transparent text-ide-muted hover:bg-ide-hover hover:text-ide-text'
          }`}
          title="Explorer (Files, Outline, Timeline)"
          aria-label="Explorer"
          aria-pressed={sidebarView === 'explorer' && isSidebarVisible}
        >
          {sidebarView === 'explorer' && isSidebarVisible && activeView === 'editor' && (
            <span className="absolute inset-y-2 left-[-2px] w-0.5 bg-ide-focus" aria-hidden="true" />
          )}
          <Folder className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
        </button>

        {/* Search */}
        <button
          type="button"
          onClick={() => handleSidebarItemClick('search')}
          className={`ide-focus-ring relative flex h-10 w-10 items-center justify-center border-l-2 transition-colors ${
            sidebarView === 'search' && isSidebarVisible
              ? 'border-ide-focus bg-ide-hover/60 text-ide-strong'
              : 'border-transparent text-ide-muted hover:bg-ide-hover hover:text-ide-text'
          }`}
          title="Search (Find in files & symbols)"
          aria-label="Search"
          aria-pressed={sidebarView === 'search' && isSidebarVisible}
        >
          {sidebarView === 'search' && isSidebarVisible && (
            <span className="absolute inset-y-2 left-[-2px] w-0.5 bg-ide-focus" aria-hidden="true" />
          )}
          <Search className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
        </button>

        {/* Source Control */}
        <button
          type="button"
          onClick={() => handleSidebarItemClick('git')}
          className={`ide-focus-ring relative flex h-10 w-10 items-center justify-center border-l-2 transition-colors ${
            sidebarView === 'git' && isSidebarVisible
              ? 'border-ide-focus bg-ide-hover/60 text-ide-strong'
              : 'border-transparent text-ide-muted hover:bg-ide-hover hover:text-ide-text'
          }`}
          title={`Source Control (Git)${changedCount > 0 ? ` - ${changedCount} changed files` : ''}`}
          aria-label="Source Control"
          aria-pressed={sidebarView === 'git' && isSidebarVisible}
        >
          {sidebarView === 'git' && isSidebarVisible && (
            <span className="absolute inset-y-2 left-[-2px] w-0.5 bg-ide-focus" aria-hidden="true" />
          )}
          <GitBranch className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
          {changedCount > 0 && (
            <span className="absolute top-1.5 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ide-focus px-1 font-mono text-[9px] font-bold text-white">
              {changedCount}
            </span>
          )}
        </button>

        {/* Knowledge Graph */}
        <button
          type="button"
          onClick={() => handleWorkspaceViewClick('graph')}
          className={`ide-focus-ring relative flex h-10 w-10 items-center justify-center border-l-2 transition-colors ${
            activeView === 'graph'
              ? 'border-ide-focus bg-ide-hover/60 text-ide-strong'
              : 'border-transparent text-ide-muted hover:bg-ide-hover hover:text-ide-text'
          }`}
          title="Knowledge Graph (AST Code Intelligence)"
          aria-label="Knowledge Graph"
          aria-pressed={activeView === 'graph'}
        >
          {activeView === 'graph' && (
            <span className="absolute inset-y-2 left-[-2px] w-0.5 bg-ide-focus" aria-hidden="true" />
          )}
          <Database className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
        </button>

        {/* MCP Hub / Extensions */}
        <button
          type="button"
          onClick={() => handleWorkspaceViewClick('mcp')}
          className={`ide-focus-ring relative flex h-10 w-10 items-center justify-center border-l-2 transition-colors ${
            activeView === 'mcp'
              ? 'border-ide-focus bg-ide-hover/60 text-ide-strong'
              : 'border-transparent text-ide-muted hover:bg-ide-hover hover:text-ide-text'
          }`}
          title="MCP Hub (Tools & Protocols)"
          aria-label="MCP Hub"
          aria-pressed={activeView === 'mcp'}
        >
          {activeView === 'mcp' && (
            <span className="absolute inset-y-2 left-[-2px] w-0.5 bg-ide-focus" aria-hidden="true" />
          )}
          <Layers className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
        </button>
      </div>

      {/* Bottom Actions: Settings */}
      <div className="flex w-full flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => handleSidebarItemClick('settings')}
          className={`ide-focus-ring relative flex h-10 w-10 items-center justify-center border-l-2 transition-colors ${
            sidebarView === 'settings' && isSidebarVisible
              ? 'border-ide-focus bg-ide-hover/60 text-ide-strong'
              : 'border-transparent text-ide-muted hover:bg-ide-hover hover:text-ide-text'
          }`}
          title="Settings (Preferences & Environment)"
          aria-label="Settings"
          aria-pressed={sidebarView === 'settings' && isSidebarVisible}
        >
          {sidebarView === 'settings' && isSidebarVisible && (
            <span className="absolute inset-y-2 left-[-2px] w-0.5 bg-ide-focus" aria-hidden="true" />
          )}
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};
