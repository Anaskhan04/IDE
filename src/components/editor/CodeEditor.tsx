import React, { useState, useEffect, useRef } from 'react';
import { useIDE } from '../../context/IDEContext';
import { 
  FileCode, 
  X, 
  Play, 
  ShieldAlert, 
  GitFork, 
  Save, 
  Check, 
  Copy, 
  Plus, 
  Folder, 
  FilePlus, 
  ExternalLink,
  ChevronRight,
  Code2,
  Terminal,
  Zap
} from 'lucide-react';

export const CodeEditor: React.FC = () => {
  const { 
    files, 
    activeFileId, 
    openFileIds, 
    openFile, 
    closeFile, 
    updateFileContent,
    saveFile,
    createFile,
    setActiveView,
    ciaResult,
    runTests,
    isExecutingTests
  } = useIDE();

  const activeFile = files.find(f => f.id === activeFileId);
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle keyboard shortcuts (Ctrl+S to save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFile) saveFile(activeFile.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, saveFile]);

  if (!activeFile) {
    return (
      <div className="flex-1 bg-code flex flex-col items-center justify-center text-slate-500 font-mono text-xs space-y-4">
        <FileCode className="w-12 h-12 text-slate-700" />
        <div className="text-center">
          <p className="text-slate-300 font-bold text-sm">No editor tab open</p>
          <p className="text-slate-500 mt-1">Select a file from the explorer or create a new file.</p>
        </div>
        <button
          onClick={() => createFile('newFile.ts')}
          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New File</span>
        </button>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFileContent(activeFile.id, e.target.value);
    updateCursorInfo(e.target);
  };

  const updateCursorInfo = (target: HTMLTextAreaElement) => {
    const textBefore = target.value.substring(0, target.selectionStart);
    const lines = textBefore.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1
    });
  };

  const pathParts = activeFile.path.split('/');
  const lines = activeFile.content.split('\n');
  const isModifiedService = activeFile.id === 'payment-service' || activeFile.id === 'cbm-cypher';

  return (
    <div className="flex-1 flex flex-col bg-code h-[calc(100vh-3.5rem-1.75rem)] overflow-hidden">
      {/* VS Code Styled Tab Bar */}
      <div className="flex items-center bg-ide-sidebar border-b border-ide-border overflow-x-auto select-none">
        {openFileIds.map((fileId) => {
          const file = files.find(f => f.id === fileId);
          if (!file) return null;
          const isActive = file.id === activeFileId;
          const isTarget = file.id === 'payment-service' || file.id === 'cbm-cypher';

          return (
            <div
              key={file.id}
              onClick={() => openFile(file.id)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-mono border-r border-ide-border cursor-pointer transition-colors border-t-2 group ${
                isActive
                  ? 'bg-code text-cyan-300 border-t-cyan-400 border-b-transparent'
                  : 'bg-ide-panel/60 text-slate-400 hover:bg-ide-panel hover:text-slate-200 border-t-transparent'
              }`}
            >
              <FileCode className={`w-3.5 h-3.5 shrink-0 ${isTarget ? 'text-rose-400' : 'text-cyan-400'}`} />
              <span className="truncate max-w-[130px]">{file.name}</span>

              {/* Dirty or modified indicator */}
              {file.isDirty ? (
                <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 group-hover:hidden" title="Unsaved changes" />
              ) : isTarget ? (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" title="Active CIA target" />
              ) : null}

              {/* Close Tab button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.id);
                }}
                className={`p-0.5 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-colors ${
                  file.isDirty ? 'hidden group-hover:block' : ''
                }`}
                title="Close tab"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Quick New File Tab Button */}
        <button
          onClick={() => createFile('module.ts')}
          className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-ide-panel transition-colors"
          title="New File (Ctrl+N)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* VS Code Breadcrumb Bar */}
      <div className="h-8 bg-ide-panel/80 border-b border-ide-border px-3 flex items-center justify-between text-xs font-mono text-slate-400 select-none">
        <div className="flex items-center gap-1.5 truncate">
          <Folder className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          {pathParts.map((part, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
              <span className={idx === pathParts.length - 1 ? 'text-slate-200 font-semibold' : 'text-slate-400 hover:text-slate-200 cursor-pointer'}>
                {part}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Knowledge Graph disabled:
          <button
            onClick={() => setActiveView('graph')}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-ide-card hover:bg-ide-hover border border-ide-border text-slate-300 hover:text-cyan-300 text-[11px] transition-colors"
            title="Inspect in Knowledge Graph"
          >
            <GitFork className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Graph</span>
          </button>
          */}

          <button
            onClick={() => setActiveView('cia')}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] transition-colors"
            title="Change Impact Analysis"
          >
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Impact</span>
          </button>

          <button
            onClick={handleCopy}
            className="p-1 rounded bg-ide-card hover:bg-ide-hover border border-ide-border text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => saveFile(activeFile.id)}
            disabled={!activeFile.isDirty}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              activeFile.isDirty
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                : 'bg-ide-card border border-ide-border text-slate-500'
            }`}
          >
            <Save className="w-3 h-3" />
            <span>{activeFile.isDirty ? 'Save (Ctrl+S)' : 'Saved'}</span>
          </button>
        </div>
      </div>

      {/* Inline Change Impact Warning Banner (PDF Section 2.2) */}
      {isModifiedService && (
        <div className="bg-gradient-to-r from-rose-950/40 via-amber-950/30 to-ide-panel border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-200">
              <strong className="text-amber-300 font-mono">{activeFile.name}</strong> modification is being actively monitored by CIA.
            </span>
            <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
              Score: {ciaResult.blastRadiusScore}/100
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('cia')}
              className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] font-mono hover:bg-amber-500/30"
            >
              Inspect Blast Radius
            </button>
            <button
              onClick={() => {
                setActiveView('validation');
                runTests();
              }}
              disabled={isExecutingTests}
              className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              <span>{isExecutingTests ? 'Running...' : 'Run Tests'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Code Area with Live Typing & Line Numbers */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Line Numbers Gutter */}
        <div className="w-12 bg-code/90 py-3 text-right pr-3 text-slate-600 select-none border-r border-ide-border shrink-0 font-mono text-xs overflow-hidden leading-5">
          {lines.map((_, i) => (
            <div key={i} className="h-5 leading-5 text-[11px]">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Live Editable Textarea Editor */}
        <textarea
          ref={textareaRef}
          value={activeFile.content}
          onChange={handleTextareaChange}
          onSelect={(e) => updateCursorInfo(e.currentTarget)}
          onKeyUp={(e) => updateCursorInfo(e.currentTarget)}
          onClick={(e) => updateCursorInfo(e.currentTarget)}
          spellCheck={false}
          className="flex-1 bg-code text-slate-100 p-3 font-mono text-xs leading-5 resize-none focus:outline-none overflow-auto whitespace-pre selection:bg-cyan-500/30 selection:text-cyan-200 tab-size-2"
          style={{ tabSize: 2 }}
        />
      </div>

      {/* Bottom Editor Status Bar (VS Code Style) */}
      <div className="h-6 bg-ide-panel border-t border-ide-border px-3 flex items-center justify-between text-[10px] font-mono text-slate-400 select-none">
        <div className="flex items-center space-x-4">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-cyan-400 font-semibold uppercase">{activeFile.language}</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <Zap className="w-3 h-3" /> AST Continuous Watcher
          </span>
        </div>
      </div>
    </div>
  );
};
