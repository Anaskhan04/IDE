import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Play, Terminal as TerminalIcon, Trash2, X } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';

export const TerminalPanel: React.FC = () => {
  const {
    terminalHistory,
    terminalCwd,
    workspacePath,
    repoRoot,
    isRunningCommand,
    runTerminalCommand,
    clearTerminal,
    setIsTerminalOpen,
    files,
    activeFileId,
  } = useIDE();

  const [commandInput, setCommandInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [panelHeight, setPanelHeight] = useState(220);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartYRef = useRef(0);
  const startHeightRef = useRef(220);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeFile = files.find((f) => f.id === activeFileId);
  const displayCwd = terminalCwd || workspacePath || repoRoot || 'workspace';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalHistory, isRunningCommand]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    startHeightRef.current = panelHeight;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dy = dragStartYRef.current - e.clientY;
    setPanelHeight(Math.min(520, Math.max(140, startHeightRef.current + dy)));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd || isRunningCommand) return;
    if (cmd.toLowerCase() === 'clear' || cmd.toLowerCase() === 'cls') {
      clearTerminal();
      setCommandInput('');
      return;
    }
    setCmdHistory((prev) => [cmd, ...prev].slice(0, 50));
    setHistoryIndex(-1);
    setCommandInput('');
    await runTerminalCommand(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = Math.min(historyIndex + 1, cmdHistory.length - 1);
      setHistoryIndex(nextIdx);
      setCommandInput(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setCommandInput('');
      } else {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCommandInput(cmdHistory[nextIdx]);
      }
    }
  };

  const handleRunActiveFile = () => {
    if (!activeFile) return;
    const p = activeFile.path;
    if (p.endsWith('.py')) {
      runTerminalCommand(`python "${p}"`);
    } else if (p.endsWith('.js') || p.endsWith('.mjs')) {
      runTerminalCommand(`node "${p}"`);
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      runTerminalCommand(`npx tsx "${p}"`);
    } else {
      runTerminalCommand(`node "${p}"`);
    }
  };

  return (
    <aside
      className="relative z-20 flex flex-col border-t border-ide-border bg-ide-panel select-none"
      style={{ height: isMaximized ? '65%' : `${panelHeight}px` }}
      data-purpose="integrated-terminal-panel"
      aria-label="Integrated Terminal"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Top resize handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute -top-1.5 inset-x-0 z-30 h-3 cursor-ns-resize transition-colors hover:bg-ide-focus/40"
        title="Drag to resize terminal"
      />

      {/* Header */}
      <header className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-ide-border bg-ide-shell px-3 text-[11px]">
        <div className="flex items-center gap-2.5 min-w-0">
          <TerminalIcon className="h-3.5 w-3.5 text-ide-cyan shrink-0" aria-hidden="true" />
          <span className="font-semibold uppercase tracking-wide text-ide-strong">Terminal</span>
          <span className="truncate font-mono text-[10px] text-ide-subtle" title={displayCwd}>
            {displayCwd}
          </span>
          {isRunningCommand && (
            <span className="font-mono text-[10px] text-ide-amber animate-pulse">Running…</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {activeFile && (activeFile.name.endsWith('.js') || activeFile.name.endsWith('.ts') || activeFile.name.endsWith('.py')) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRunActiveFile();
              }}
              disabled={isRunningCommand}
              className="ide-focus-ring flex items-center gap-1 rounded-ide-control border border-ide-emerald/40 bg-ide-emerald/15 px-2 py-0.5 font-mono text-[10px] text-ide-emerald hover:bg-ide-emerald/25 disabled:opacity-50"
              title={`Run ${activeFile.name}`}
            >
              <Play className="h-2.5 w-2.5" />
              Run {activeFile.name}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearTerminal();
            }}
            className="ide-focus-ring rounded-ide-control p-1 text-ide-muted hover:bg-ide-hover hover:text-ide-text"
            title="Clear terminal"
            aria-label="Clear terminal"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMaximized((m) => !m);
            }}
            className="ide-focus-ring rounded-ide-control p-1 text-ide-muted hover:bg-ide-hover hover:text-ide-text"
            title={isMaximized ? 'Restore terminal height' : 'Maximize terminal'}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsTerminalOpen(false);
            }}
            className="ide-focus-ring rounded-ide-control p-1 text-ide-muted hover:bg-ide-hover hover:text-ide-rose"
            title="Close Terminal (Ctrl+`)"
            aria-label="Close Terminal"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Output Stream */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-ide-bg p-3 font-mono text-[11.5px] leading-relaxed select-text"
      >
        {terminalHistory.map((entry) => (
          <div key={entry.id} className="mb-2.5">
            {entry.command && (
              <div className="flex items-center gap-2 text-ide-strong">
                <span className="text-ide-cyan">❯</span>
                <span className="text-ide-subtle text-[10px]">{entry.cwd ? entry.cwd.split('/').pop() : 'workspace'}</span>
                <span>{entry.command}</span>
                {entry.exitCode !== undefined && entry.exitCode !== 0 && (
                  <span className="ml-auto text-[10px] text-ide-rose">exit {entry.exitCode}</span>
                )}
              </div>
            )}
            {entry.stdout && (
              <pre className="mt-1 whitespace-pre-wrap break-words text-ide-text">{entry.stdout}</pre>
            )}
            {entry.stderr && (
              <pre className="mt-1 whitespace-pre-wrap break-words text-ide-rose">{entry.stderr}</pre>
            )}
          </div>
        ))}
      </div>

      {/* Command Input Prompt */}
      <form onSubmit={handleRun} className="flex shrink-0 items-center gap-2 border-t border-ide-border bg-ide-shell px-3 py-1.5 font-mono text-xs">
        <span className="text-ide-cyan font-bold">❯</span>
        <input
          ref={inputRef}
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunningCommand}
          placeholder="Type shell command (e.g. npm test, git status, node app.js)…"
          className="min-w-0 flex-1 bg-transparent text-ide-strong outline-none placeholder:text-ide-subtle"
        />
      </form>
    </aside>
  );
};
