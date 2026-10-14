import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Code2,
  Command,
  FileCode,
  FileText,
  FolderOpen,
  GitBranch,
  Layers,
  Network,
  Play,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  ToggleLeft,
  X,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import type { CommandItem } from '../../types/ide';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  defaultMode?: 'all' | 'files' | 'symbols' | 'commands';
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  defaultMode = 'all',
}) => {
  const {
    files,
    openFile,
    activeFileId,
    saveFile,
    saveAllFiles,
    openProjectFolder,
    createFile,
    setSidebarView,
    setIsSidebarVisible,
    toggleSidebar,
    setActiveView,
    rebuildAST,
    isAnalyzingAST,
    runTests,
    isExecutingTests,
    editorSettings,
    updateEditorSettings,
    isCopilotOpen,
    setIsCopilotOpen,
    setTargetEditorLine,
  } = useIDE();

  const [query, setQuery] = useState(initialQuery);
  const [filterMode, setFilterMode] = useState<'all' | 'files' | 'symbols' | 'commands'>(defaultMode);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setFilterMode(defaultMode);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialQuery, defaultMode]);

  // Build executable commands list
  const commands: CommandItem[] = useMemo(() => [
    {
      id: 'cmd-save-file',
      title: 'File: Save Current File',
      category: 'File',
      shortcut: 'Ctrl+S',
      action: () => {
        if (activeFileId) saveFile(activeFileId);
      },
    },
    {
      id: 'cmd-save-all',
      title: 'File: Save All Changed Files',
      category: 'File',
      shortcut: 'Ctrl+K S',
      action: async () => {
        await saveAllFiles();
      },
    },
    {
      id: 'cmd-new-file',
      title: 'File: New File in Workspace',
      category: 'File',
      action: () => {
        const name = window.prompt('Enter file name (e.g. utils.ts):');
        if (name) createFile(name);
      },
    },
    {
      id: 'cmd-open-folder',
      title: 'File: Open Local Folder...',
      category: 'File',
      action: () => {
        openProjectFolder();
      },
    },
    {
      id: 'cmd-toggle-sidebar',
      title: 'View: Toggle Primary Sidebar',
      category: 'View',
      shortcut: 'Ctrl+B',
      action: () => {
        toggleSidebar();
      },
    },
    {
      id: 'cmd-view-explorer',
      title: 'View: Open File Explorer',
      category: 'View',
      action: () => {
        setSidebarView('explorer');
        setIsSidebarVisible(true);
        setActiveView('editor');
      },
    },
    {
      id: 'cmd-view-search',
      title: 'View: Open Global Search in Sidebar',
      category: 'View',
      shortcut: 'Ctrl+Shift+F',
      action: () => {
        setSidebarView('search');
        setIsSidebarVisible(true);
      },
    },
    {
      id: 'cmd-view-git',
      title: 'View: Open Source Control (Git)',
      category: 'View',
      shortcut: 'Ctrl+Shift+G',
      action: () => {
        setSidebarView('git');
        setIsSidebarVisible(true);
      },
    },
    {
      id: 'cmd-view-settings',
      title: 'View: Open Editor Settings',
      category: 'View',
      shortcut: 'Ctrl+,',
      action: () => {
        setSidebarView('settings');
        setIsSidebarVisible(true);
      },
    },
    {
      id: 'cmd-view-graph',
      title: 'View: Open Knowledge Graph',
      category: 'View',
      action: () => {
        setActiveView('graph');
      },
    },
    {
      id: 'cmd-view-cia',
      title: 'View: Open Change Impact Analysis (CIA)',
      category: 'View',
      action: () => {
        setActiveView('cia');
      },
    },
    {
      id: 'cmd-view-mcp',
      title: 'View: Open MCP Hub',
      category: 'View',
      action: () => {
        setActiveView('mcp');
      },
    },
    {
      id: 'cmd-view-editor',
      title: 'View: Open Code Editor',
      category: 'View',
      action: () => {
        setActiveView('editor');
      },
    },
    {
      id: 'cmd-rebuild-ast',
      title: 'Intelligence: Rebuild AST & Knowledge Graph',
      category: 'AST',
      action: async () => {
        await rebuildAST();
      },
    },
    {
      id: 'cmd-run-tests',
      title: 'Testing: Run Targeted Test Suites',
      category: 'Testing',
      action: async () => {
        await runTests();
      },
    },
    {
      id: 'cmd-toggle-wrap',
      title: `Preferences: Toggle Word Wrap (${editorSettings.wordWrap ? 'Disable' : 'Enable'})`,
      category: 'Preferences',
      shortcut: 'Alt+Z',
      action: () => {
        updateEditorSettings({ wordWrap: !editorSettings.wordWrap });
      },
    },
    {
      id: 'cmd-toggle-minimap',
      title: `Preferences: Toggle Minimap (${editorSettings.showMinimap ? 'Hide' : 'Show'})`,
      category: 'Preferences',
      action: () => {
        updateEditorSettings({ showMinimap: !editorSettings.showMinimap });
      },
    },
    {
      id: 'cmd-toggle-lines',
      title: `Preferences: Toggle Line Numbers (${editorSettings.lineNumbers ? 'Hide' : 'Show'})`,
      category: 'Preferences',
      action: () => {
        updateEditorSettings({ lineNumbers: !editorSettings.lineNumbers });
      },
    },
    {
      id: 'cmd-toggle-copilot',
      title: `AI: Toggle Context Inspector (${isCopilotOpen ? 'Close' : 'Open'})`,
      category: 'AI',
      action: () => {
        setIsCopilotOpen(!isCopilotOpen);
      },
    },
  ], [
    activeFileId,
    saveFile,
    saveAllFiles,
    createFile,
    openProjectFolder,
    toggleSidebar,
    setSidebarView,
    setIsSidebarVisible,
    setActiveView,
    rebuildAST,
    runTests,
    editorSettings,
    updateEditorSettings,
    isCopilotOpen,
    setIsCopilotOpen,
  ]);

  // Aggregate search results
  const results = useMemo(() => {
    const clean = query.trim();
    const isCommandQuery = clean.startsWith('>') || filterMode === 'commands';
    const effectiveQuery = clean.startsWith('>') ? clean.substring(1).trim().toLowerCase() : clean.toLowerCase();

    if (filterMode === 'commands' || isCommandQuery) {
      return commands
        .filter((cmd) => !effectiveQuery || cmd.title.toLowerCase().includes(effectiveQuery) || cmd.category.toLowerCase().includes(effectiveQuery))
        .map((cmd) => ({
          type: 'command' as const,
          id: cmd.id,
          title: cmd.title,
          subtitle: cmd.category,
          shortcut: cmd.shortcut,
          action: cmd.action,
        }));
    }

    // 2. Files
    const matchingFiles = (filterMode === 'all' || filterMode === 'files')
      ? files
          .filter((file) => {
            if (!effectiveQuery) return true;
            return file.name.toLowerCase().includes(effectiveQuery) || file.path.toLowerCase().includes(effectiveQuery);
          })
          .map((file) => ({
            type: 'file' as const,
            id: `file-${file.id}`,
            title: file.name,
            subtitle: file.path,
            isDirty: file.isDirty,
            file,
            action: () => {
              openFile(file.id);
              setActiveView('editor');
            },
          }))
      : [];

    // 3. AST Symbols
    const matchingSymbols: {
      type: 'symbol';
      id: string;
      title: string;
      subtitle: string;
      kind: string;
      line: number;
      fileId: string;
      action: () => void;
    }[] = [];

    if ((filterMode === 'all' || filterMode === 'symbols') && effectiveQuery) {
      files.forEach((file) => {
        if (!file.symbols) return;
        file.symbols.forEach((symbol) => {
          if (symbol.name.toLowerCase().includes(effectiveQuery)) {
            matchingSymbols.push({
              type: 'symbol',
              id: `sym-${file.id}-${symbol.id}`,
              title: symbol.name,
              subtitle: `${file.path}:${symbol.line}`,
              kind: symbol.kind,
              line: symbol.line,
              fileId: file.id,
              action: () => {
                openFile(file.id);
                setTargetEditorLine(symbol.line);
                setActiveView('editor');
              },
            });
          }
        });
      });
    }

    if (filterMode === 'files') return matchingFiles;
    if (filterMode === 'symbols') return matchingSymbols;

    // 'all' mode: Interleave files, symbols, and commands
    const matchingCommands = commands
      .filter((cmd) => !effectiveQuery || cmd.title.toLowerCase().includes(effectiveQuery) || cmd.category.toLowerCase().includes(effectiveQuery))
      .map((cmd) => ({
        type: 'command' as const,
        id: cmd.id,
        title: cmd.title,
        subtitle: cmd.category,
        shortcut: cmd.shortcut,
        action: cmd.action,
      }));

    return [...matchingFiles.slice(0, 8), ...matchingSymbols.slice(0, 10), ...matchingCommands.slice(0, 8)];
  }, [query, filterMode, files, commands, openFile, setActiveView, setTargetEditorLine]);

  // Adjust selected index on results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = results[selectedIndex];
      if (item) {
        item.action();
        onClose();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[12vh] backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search and command palette"
    >
      <div
        className="w-full max-w-[620px] overflow-hidden rounded-ide-panel border border-ide-border-strong bg-ide-panel shadow-2xl animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-2 border-b border-ide-border px-3.5 py-2.5 bg-ide-shell">
          <Search className="h-4 w-4 shrink-0 text-ide-focus" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              filterMode === 'commands' || query.startsWith('>')
                ? 'Type a command name…'
                : 'Search files, symbols, commands (type > for commands)…'
            }
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ide-strong outline-none placeholder:text-ide-subtle"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-ide-subtle hover:text-ide-text"
              aria-label="Clear query"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block border border-ide-border px-1.5 py-0.5 font-mono text-[10px] text-ide-subtle">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 border-b border-ide-border bg-ide-bg px-3.5 py-1.5 font-mono text-[11px]">
          {(['all', 'files', 'symbols', 'commands'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setFilterMode(mode);
                if (mode === 'commands' && !query.startsWith('>')) {
                  setQuery('>');
                } else if (mode !== 'commands' && query.startsWith('>')) {
                  setQuery('');
                }
              }}
              className={`ide-focus-ring rounded-ide-control px-2 py-0.5 capitalize transition-colors ${
                filterMode === mode
                  ? 'bg-ide-focus text-white font-medium'
                  : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
              }`}
            >
              {mode}
            </button>
          ))}
          <span className="ml-auto font-mono text-[10px] text-ide-subtle">
            {isAnalyzingAST ? 'Analyzing AST…' : `${results.length} result${results.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-1.5 font-mono text-[12px]"
          role="listbox"
        >
          {results.length === 0 ? (
            <div className="py-10 text-center font-sans text-xs text-ide-subtle">
              {query ? (
                <>
                  <p className="font-semibold text-ide-muted">No matching results found</p>
                  <p className="mt-1 text-[11px] text-ide-subtle font-mono">
                    Nothing matched &ldquo;{query}&rdquo;
                  </p>
                </>
              ) : (
                <p>No files in workspace. Create or open a file to start searching.</p>
              )}
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className={`group flex cursor-pointer items-center justify-between rounded-ide-control px-2.5 py-2 transition-colors ${
                    isSelected ? 'bg-ide-selected text-ide-strong' : 'text-ide-muted hover:bg-ide-hover/60 hover:text-ide-text'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {item.type === 'file' && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-ide-surface text-[10px] font-bold text-ide-cyan">
                        TS
                      </span>
                    )}
                    {item.type === 'symbol' && (
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold ${
                        item.kind === 'function' ? 'bg-ide-cyan/15 text-ide-cyan' :
                        item.kind === 'class' ? 'bg-ide-amber/15 text-ide-amber' :
                        item.kind === 'interface' ? 'bg-ide-purple/15 text-ide-purple' :
                        'bg-ide-surface text-ide-muted'
                      }`}>
                        {item.kind === 'function' ? 'ƒ' : item.kind === 'class' ? 'C' : item.kind === 'interface' ? 'I' : 's'}
                      </span>
                    )}
                    {item.type === 'command' && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-ide-focus">
                        <Command className="h-3.5 w-3.5" />
                      </span>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-ide-strong">{item.title}</span>
                        {item.type === 'file' && (item as any).isDirty && (
                          <span className="h-1.5 w-1.5 rounded-full bg-ide-focus" title="Unsaved changes" />
                        )}
                        {item.type === 'symbol' && (
                          <span className="text-[10px] font-normal uppercase text-ide-subtle">
                            {(item as any).kind}
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-[11px] text-ide-subtle font-sans">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="ml-3 shrink-0 text-right">
                    {item.type === 'command' && (item as any).shortcut && (
                      <kbd className="rounded-ide-control border border-ide-border bg-ide-shell px-1.5 py-0.5 text-[10px] text-ide-muted font-mono">
                        {(item as any).shortcut}
                      </kbd>
                    )}
                    {item.type === 'symbol' && (
                      <span className="text-[10px] text-ide-subtle">
                        line {(item as any).line}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between border-t border-ide-border bg-ide-shell px-3 py-1.5 text-[11px] text-ide-subtle font-sans">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono text-[10px] text-ide-muted">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono text-[10px] text-ide-muted">↵</kbd> select</span>
            <span><kbd className="font-mono text-[10px] text-ide-muted">esc</kbd> close</span>
          </div>
          <span className="font-mono text-[10px]">IntelliCode Search</span>
        </div>
      </div>
    </div>
  );
};
