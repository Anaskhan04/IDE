import React from 'react';
import { ChevronDown, Code2, Command, Search, Settings, Sparkles } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';

export const TopNav: React.FC = () => {
  const {
    activeModel,
    masterPrompt,
    isCopilotOpen,
    setIsCopilotOpen,
    setIsModelSwitchingModalOpen,
  } = useIDE();

  return (
    <header
      className="flex h-12 shrink-0 items-center gap-4 border-b border-ide-border bg-ide-shell px-3"
      data-purpose="top-navigation"
    >
      <div className="flex w-[175px] shrink-0 items-center gap-2.5 lg:w-[230px]">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-ide-focus/70 bg-ide-selected text-ide-focus" aria-hidden="true">
          <Code2 className="h-4 w-4" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 leading-none">
            <span className="font-semibold tracking-[0.01em] text-ide-strong">IntelliCode</span>
            <span className="font-mono text-[10px] text-ide-subtle">v0.24</span>
          </div>
          <span className="mt-1 block truncate font-mono text-[10px] text-ide-muted">
            {masterPrompt.projectName || 'workspace'}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor="global-command-search">Search files, symbols, commands</label>
        <div className="group mx-auto flex max-w-[680px] items-center gap-2 border-b border-ide-border-strong/70 px-1.5 text-ide-muted transition-colors focus-within:border-ide-focus">
          <Search className="h-3.5 w-3.5 shrink-0 text-ide-subtle" aria-hidden="true" />
          <input
            id="global-command-search"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-xs text-ide-text outline-none placeholder:text-ide-subtle"
            placeholder="Search files, symbols, commands…"
            type="search"
          />
          <kbd className="flex items-center gap-1 border border-ide-border-strong px-1.5 py-0.5 font-mono text-[10px] text-ide-muted">
            <Command className="h-2.5 w-2.5" aria-hidden="true" />K
          </kbd>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-l border-ide-border pl-3 text-[11px]">
        <div className="hidden items-center gap-1.5 pr-2 text-ide-emerald xl:flex" title={`AST ${masterPrompt.astVersion || 'synced'}`}>
          <span className="h-1.5 w-1.5 bg-ide-emerald" aria-hidden="true" />
          <span>AST synced</span>
        </div>

        <button
          type="button"
          onClick={() => setIsModelSwitchingModalOpen(true)}
          className="ide-focus-ring ide-control flex min-h-[30px] items-center gap-1.5 border-l border-ide-border px-2 text-ide-text hover:bg-ide-hover hover:text-ide-strong"
          title="Choose coding model"
        >
          <span className="font-mono text-[10px] text-ide-cyan">MODEL</span>
          <span className="max-w-[130px] truncate font-medium">{activeModel.name}</span>
          <ChevronDown className="h-3 w-3 text-ide-subtle" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => setIsCopilotOpen(!isCopilotOpen)}
          className={`ide-focus-ring ide-control flex min-h-[30px] items-center gap-1.5 border-l border-ide-border px-2 ${
            isCopilotOpen ? 'text-ide-cyan' : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
          }`}
          aria-pressed={isCopilotOpen}
          title={isCopilotOpen ? 'Close context inspector' : 'Open context inspector'}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden lg:inline">Context</span>
        </button>

        <span className="border-l border-ide-border pl-2 text-ide-subtle" title="Settings are not available in this build">
          <Settings className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Settings unavailable</span>
        </span>

        <div className="flex h-7 w-7 items-center justify-center border border-ide-border bg-ide-panel font-mono text-[10px] font-semibold text-ide-text" title="Profile: NK">
          NK
        </div>
      </div>
    </header>
  );
};
