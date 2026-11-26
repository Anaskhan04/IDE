import React from 'react';
import {
  FlaskConical,
  Folder,
  GitBranch,
  Layers,
  Network,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { Menu } from '../ui';

export const ActivityBar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    sidebarView,
    setSidebarView,
    isSidebarVisible,
    setIsSidebarVisible,
    isSettingsOpen,
    setIsSettingsOpen,
    files,
    stagedFileIds,
  } = useIDE();

  const changedCount = files.filter((f) => f.isDirty || f.isModified).length + stagedFileIds.length;

  const handleSidebarItemClick = (view: 'explorer' | 'search' | 'git' | 'settings') => {
    if (view === 'explorer' && activeView !== 'editor') {
      setActiveView('editor');
      setSidebarView('explorer');
      setIsSidebarVisible(true);
      return;
    }

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

  const handleWorkspaceViewClick = (view: 'graph' | 'cia' | 'mcp' | 'validation' | 'analyzer' | 'evaluation') => {
    setActiveView(view);
  };

  const isToolsActive =
    activeView === 'mcp' ||
    activeView === 'validation' ||
    activeView === 'analyzer' ||
    activeView === 'evaluation';

  const navBtnClass = (isActive: boolean) =>
    `ide-focus-ring relative flex h-10 w-10 items-center justify-center rounded-ide-control transition-colors duration-150 ${
      isActive
        ? 'bg-ide-selected text-ide-strong'
        : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
    }`;

  return (
    <aside
      className="flex w-12 shrink-0 flex-col items-center justify-between border-r border-ide-border bg-ide-activitybar py-2 select-none"
      data-purpose="activity-bar"
      aria-label="Primary navigation"
    >
      <div className="flex w-full flex-col items-center gap-1">
        {/* Explorer */}
        <button
          type="button"
          onClick={() => handleSidebarItemClick('explorer')}
          className={navBtnClass(sidebarView === 'explorer' && isSidebarVisible && activeView === 'editor')}
          title="Explorer"
          aria-label="Explorer"
          aria-pressed={sidebarView === 'explorer' && isSidebarVisible && activeView === 'editor'}
        >
          {sidebarView === 'explorer' && isSidebarVisible && activeView === 'editor' && (
            <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-ide-focus" aria-hidden="true" />
          )}
          <Folder className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </button>

        {/* Search */}
        <button
          type="button"
          onClick={() => handleSidebarItemClick('search')}
          className={navBtnClass(sidebarView === 'search' && isSidebarVisible)}
          title="Search"
          aria-label="Search"
          aria-pressed={sidebarView === 'search' && isSidebarVisible}
        >
          {sidebarView === 'search' && isSidebarVisible && (
            <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-ide-focus" aria-hidden="true" />
          )}
          <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </button>

        {/* Source Control */}
        <button
          type="button"
          onClick={() => handleSidebarItemClick('git')}
          className={navBtnClass(sidebarView === 'git' && isSidebarVisible)}
          title={`Source Control${changedCount > 0 ? ` (${changedCount} changes)` : ''}`}
          aria-label="Source Control"
          aria-pressed={sidebarView === 'git' && isSidebarVisible}
        >
          {sidebarView === 'git' && isSidebarVisible && (
            <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-ide-focus" aria-hidden="true" />
          )}
          <GitBranch className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          {changedCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ide-focus px-1 font-mono text-[10px] font-semibold text-ide-onAccent">
              {changedCount}
            </span>
          )}
        </button>

        {/* Knowledge Graph */}
        <button
          type="button"
          onClick={() => handleWorkspaceViewClick('graph')}
          className={navBtnClass(activeView === 'graph')}
          title="Knowledge graph"
          aria-label="Knowledge graph"
          aria-pressed={activeView === 'graph'}
        >
          {activeView === 'graph' && (
            <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-ide-focus" aria-hidden="true" />
          )}
          <Network className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </button>

        {/* Impact Analysis */}
        <button
          type="button"
          onClick={() => handleWorkspaceViewClick('cia')}
          className={navBtnClass(activeView === 'cia')}
          title="Impact analysis"
          aria-label="Impact analysis"
          aria-pressed={activeView === 'cia'}
        >
          {activeView === 'cia' && (
            <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-ide-focus" aria-hidden="true" />
          )}
          <ShieldAlert className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </button>

        {/* Tools Menu (MCP Hub, Validation) */}
        <Menu
          align="left"
          trigger={(props) => (
            <button
              type="button"
              onClick={props.toggle}
              aria-expanded={props['aria-expanded']}
              aria-haspopup={props['aria-haspopup']}
              className={navBtnClass(isToolsActive)}
              title="Tools (MCP Hub & Validation)"
              aria-label="Tools"
            >
              {isToolsActive && (
                <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-ide-focus" aria-hidden="true" />
              )}
              <Wrench className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
          items={[
            {
              id: 'mcp',
              label: 'MCP Hub',
              icon: <Layers className="h-4 w-4 text-ide-cyan" />,
              selected: activeView === 'mcp',
              onSelect: () => handleWorkspaceViewClick('mcp'),
            },
            {
              id: 'validation',
              label: 'Validation',
              icon: <ShieldCheck className="h-4 w-4 text-ide-emerald" />,
              selected: activeView === 'validation',
              onSelect: () => handleWorkspaceViewClick('validation'),
            },
            {
              id: 'analyzer',
              label: 'Prompt analyzer',
              icon: <Sparkles className="h-4 w-4 text-ide-purple" />,
              selected: activeView === 'analyzer',
              onSelect: () => handleWorkspaceViewClick('analyzer'),
            },
            {
              id: 'evaluation',
              label: 'Benchmarks',
              icon: <FlaskConical className="h-4 w-4 text-ide-amber" />,
              selected: activeView === 'evaluation',
              onSelect: () => handleWorkspaceViewClick('evaluation'),
            },
          ]}
        />
      </div>

      {/* Bottom: Settings */}
      <div className="flex w-full flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className={navBtnClass(isSettingsOpen)}
          title="Settings"
          aria-label="Settings"
          aria-pressed={isSettingsOpen}
        >
          {isSettingsOpen && (
            <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-ide-focus" aria-hidden="true" />
          )}
          <Settings className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};
