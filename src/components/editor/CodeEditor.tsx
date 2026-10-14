import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronRight, FilePlus, FolderOpen, Play, Save, Search, X } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';

const getLanguageMark = (fileName: string) => {
  if (fileName.endsWith('.c') || fileName.endsWith('.h')) return 'C';
  if (fileName.endsWith('.json')) return '{}';
  if (fileName.endsWith('.md')) return 'MD';
  return 'TS';
};

const getLanguageClass = (fileName: string) => {
  if (fileName.endsWith('.c') || fileName.endsWith('.h')) return 'text-ide-purple';
  if (fileName.endsWith('.json')) return 'text-ide-amber';
  return 'text-ide-cyan';
};

export const CodeEditor: React.FC = () => {
  const {
    files,
    activeFileId,
    openFileIds,
    openFile,
    closeFile,
    updateFileContent,
    saveFile,
    saveError,
    clearSaveError,
    createFile,
    loadExternalFiles,
    openProjectFolder,
    ciaResult,
    runTests,
    isExecutingTests,
    setActiveView,
    isRestoringWorkspace,
    pendingReconnect,
    reconnectWorkspace,
    dismissReconnect,
    editorSettings,
    targetEditorLine,
    setTargetEditorLine,
  } = useIDE();

  const activeFile = files.find((file) => file.id === activeFileId);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (activeFile) saveFile(activeFile.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, saveFile]);

  // Jump to target line when navigated from Global Search or Outline
  useEffect(() => {
    if (targetEditorLine && textareaRef.current && activeFile) {
      const allLines = activeFile.content.split('\n');
      const targetIdx = Math.max(0, Math.min(targetEditorLine - 1, allLines.length - 1));

      let charOffset = 0;
      for (let i = 0; i < targetIdx; i++) {
        charOffset += allLines[i].length + 1;
      }

      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charOffset, charOffset + allLines[targetIdx].length);

      const approxLineHeight = editorSettings.fontSize * 1.6;
      textareaRef.current.scrollTop = Math.max(0, targetIdx * approxLineHeight - 120);
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }

      setCursorPos({ line: targetIdx + 1, col: 1 });
      setTargetEditorLine(null);
    }
  }, [targetEditorLine, activeFile, setTargetEditorLine, editorSettings.fontSize]);

  const handleSelectFolder = async () => {
    const opened = await openProjectFolder();
    if (!opened) {
      folderInputRef.current?.click();
    }
  };

  const handleFolderInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList?.length) return;

    const loadedFiles: any[] = [];
    let folderName = 'Imported Project';
    const supportedFiles = Array.from(fileList).filter((file) => !file.webkitRelativePath.includes('node_modules/'));

    supportedFiles.forEach((file) => {
      const relativePath = file.webkitRelativePath || file.name;
      const parts = relativePath.split('/');
      if (parts.length > 1) folderName = parts[0];
      if (relativePath.includes('.git/')) return;

      const reader = new FileReader();
      reader.onload = () => {
        const fileContent = String(reader.result || '');
        loadedFiles.push({
          id: `file-${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          path: relativePath,
          language: file.name.split('.').pop() || 'typescript',
          content: fileContent,
          savedContent: fileContent,
          isDirty: false,
        });
        if (loadedFiles.length === supportedFiles.length) loadExternalFiles(loadedFiles, folderName);
      };
      reader.readAsText(file);
    });
  };

  const updateCursorInfo = (target: HTMLTextAreaElement) => {
    const textBefore = target.value.substring(0, target.selectionStart);
    const linesBefore = textBefore.split('\n');
    setCursorPos({ line: linesBefore.length, col: linesBefore[linesBefore.length - 1].length + 1 });
  };

  if (!activeFile) {
    return (
      <main id="editor-workspace" className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-ide-bg" data-purpose="editor-workspace">
        <input
          ref={folderInputRef}
          type="file"
          onChange={handleFolderInputChange}
          // @ts-ignore webkitdirectory is browser-specific.
          webkitdirectory="true"
          directory="true"
          multiple
          className="hidden"
        />

        {saveError && (
          <div className="flex min-h-[34px] shrink-0 items-center justify-between gap-3 border-b border-ide-rose/40 bg-ide-panel px-3 font-mono text-[10px] text-ide-rose" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-ide-rose" aria-hidden="true" />
              <span>{saveError}</span>
            </div>
            <button
              type="button"
              onClick={clearSaveError}
              className="ide-focus-ring flex h-6 w-6 items-center justify-center text-ide-muted hover:text-ide-text"
              aria-label="Dismiss save error"
              title="Dismiss error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-10">
          <div className="w-full max-w-[540px] border-l border-ide-border-strong pl-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center border border-ide-focus bg-ide-selected font-mono text-sm font-semibold text-ide-focus" aria-hidden="true">
                {'<>'}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <h1 className="text-lg font-semibold tracking-tight text-ide-strong">IntelliCode IDE</h1>
                  <span className="font-mono text-[10px] text-ide-subtle">v0.24</span>
                </div>
                <p className="mt-1 text-xs text-ide-muted">Workspace is empty. Create a file or open a local folder to start.</p>
              </div>
            </div>

            {pendingReconnect && (
              <div className="mb-6 border border-ide-amber/40 bg-ide-amber/10 p-4 font-sans text-xs">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-ide-amber mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-ide-strong">Reconnect "{pendingReconnect.folderName}"</h2>
                    <p className="mt-1 text-xs text-ide-muted leading-relaxed">
                      Your browser requires permission to access the local folder after a refresh. Click Reconnect to resume editing your project files.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => reconnectWorkspace()}
                        className="ide-focus-ring flex items-center gap-1.5 bg-ide-focus px-3 py-1.5 text-xs font-semibold text-white hover:bg-ide-focus/90"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        Reconnect Folder
                      </button>
                      <button
                        type="button"
                        onClick={dismissReconnect}
                        className="ide-focus-ring border border-ide-border px-3 py-1.5 text-xs text-ide-muted hover:bg-ide-hover hover:text-ide-text"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isRestoringWorkspace && (
              <div className="mb-6 flex items-center gap-2.5 border border-ide-border bg-ide-surface px-4 py-3 font-mono text-xs text-ide-muted">
                <div className="h-2.5 w-2.5 rounded-full bg-ide-focus animate-pulse" />
                <span>Restoring workspace from disk...</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-y border-ide-border py-4">
              <button
                type="button"
                onClick={() => createFile('index.ts', '')}
                className="ide-focus-ring ide-control inline-flex min-h-[34px] items-center gap-2 bg-ide-focus px-3 text-xs font-semibold text-white hover:bg-ide-focus/85"
              >
                <FilePlus className="h-3.5 w-3.5" aria-hidden="true" />
                New file
              </button>
              <button
                type="button"
                onClick={handleSelectFolder}
                className="ide-focus-ring ide-control inline-flex min-h-[34px] items-center gap-2 border border-ide-border-strong px-3 text-xs font-medium text-ide-text hover:bg-ide-hover hover:text-ide-strong"
              >
                <FolderOpen className="h-3.5 w-3.5 text-ide-focus" aria-hidden="true" />
                Open folder
              </button>
              <span className="ml-auto hidden font-mono text-[10px] text-ide-subtle md:inline">Context index starts after import</span>
            </div>

            <div className="mt-5 grid max-w-[460px] grid-cols-[1fr_auto] border-y border-ide-border font-mono text-[10px] text-ide-muted">
              <span className="border-b border-ide-border py-2">Show all commands</span>
              <kbd className="border-b border-l border-ide-border px-2 py-2 text-ide-text">Ctrl+Shift+P</kbd>
              <span className="border-b border-ide-border py-2">Quick file open</span>
              <kbd className="border-b border-l border-ide-border px-2 py-2 text-ide-text">Ctrl+P</kbd>
              <span className="py-2">Save changes</span>
              <kbd className="border-l border-ide-border px-2 py-2 text-ide-text">Ctrl+S</kbd>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const pathParts = activeFile.path.split('/');
  const lines = activeFile.content.split('\n');
  const isPendingAnalysis = Boolean(activeFile.isModified);
  const hasImpactScore = isPendingAnalysis && ciaResult.targetId === activeFile.id;

  return (
    <main id="editor-workspace" className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-ide-bg" data-purpose="editor-workspace">
      <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-ide-border bg-ide-shell" role="tablist" aria-label="Open files">
        {openFileIds.map((fileId) => {
          const file = files.find((candidate) => candidate.id === fileId);
          if (!file) return null;
          const isActive = file.id === activeFile.id;
          return (
            <div key={file.id} className={`group flex h-full shrink-0 items-center border-r border-ide-border ${isActive ? 'border-t-2 border-t-ide-focus bg-ide-bg text-ide-strong' : 'border-t-2 border-t-transparent text-ide-muted hover:bg-ide-hover'}`}>
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => openFile(file.id)}
                className="ide-focus-ring flex h-full items-center gap-2 px-3 text-left text-[11px]"
              >
                <span className={`font-mono text-[10px] font-semibold ${getLanguageClass(file.name)}`}>{getLanguageMark(file.name)}</span>
                <span className="font-mono">{file.name}</span>
                {file.isDirty && <span className="h-1.5 w-1.5 bg-ide-focus" title="Unsaved changes" aria-label="Unsaved changes" />}
              </button>
              <button
                type="button"
                onClick={() => closeFile(file.id)}
                className="ide-focus-ring mr-1 flex h-6 w-6 items-center justify-center text-ide-subtle opacity-0 hover:text-ide-text focus-visible:opacity-100 group-hover:opacity-100"
                title={`Close ${file.name}`}
                aria-label={`Close ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => {
            const parent = activeFile && activeFile.path.includes('/')
              ? activeFile.path.split('/').slice(0, -1).join('/')
              : '';
            createFile('module.ts', parent);
          }}
          className="ide-focus-ring flex h-full w-9 shrink-0 items-center justify-center text-ide-subtle hover:bg-ide-hover hover:text-ide-text"
          title="New file tab"
          aria-label="New file tab"
        >
          <FilePlus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-ide-border px-3 font-mono text-[10px] text-ide-muted">
        {pathParts.map((part, index) => {
          const isLast = index === pathParts.length - 1;
          return (
            <React.Fragment key={`${part}-${index}`}>
              {index > 0 && <ChevronRight className="h-3 w-3 text-ide-border-strong" aria-hidden="true" />}
              <span className={isLast ? 'text-ide-text' : 'text-ide-subtle'}>{part}</span>
            </React.Fragment>
          );
        })}
        <div className="ml-auto flex items-center gap-3">
          {/* Storage Mode indicator */}
          {activeFile.fileHandle ? (
            <span className="hidden items-center gap-1 text-[10px] text-ide-emerald md:flex" title="Direct disk write-back available via File System Access API">
              <span className="h-1.5 w-1.5 rounded-full bg-ide-emerald" aria-hidden="true" />
              Live Disk
            </span>
          ) : (
            <span className="hidden items-center gap-1 text-[10px] text-ide-amber md:flex" title="Direct disk write unavailable; Save will export via browser download">
              <span className="h-1.5 w-1.5 rounded-full bg-ide-amber" aria-hidden="true" />
              Export Mode
            </span>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={() => saveFile(activeFile.id)}
            disabled={!activeFile.isDirty}
            className={`ide-focus-ring flex items-center gap-1 rounded-ide-control px-2 py-0.5 text-[10px] font-medium transition-colors ${
              activeFile.isDirty
                ? 'bg-ide-focus text-white hover:bg-ide-focus/90'
                : 'text-ide-subtle opacity-70 cursor-default'
            }`}
            title={activeFile.isDirty ? 'Save changes (Ctrl+S)' : 'All changes saved'}
            aria-label={activeFile.isDirty ? 'Save changes' : 'All changes saved'}
          >
            <Save className="h-3 w-3" aria-hidden="true" />
            <span>{activeFile.isDirty ? (activeFile.fileHandle ? 'Save' : 'Export') : 'Saved'}</span>
          </button>

          <span className="hidden items-center gap-2 text-ide-subtle sm:flex">
            <Search className="h-3 w-3" aria-hidden="true" />
            {cursorPos.line}:{cursorPos.col}
          </span>
        </div>
      </div>

      {saveError && (
        <div className="flex min-h-[34px] shrink-0 items-center justify-between gap-3 border-b border-ide-rose/40 bg-ide-panel px-3 font-mono text-[10px] text-ide-rose" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-ide-rose" aria-hidden="true" />
            <span>{saveError}</span>
          </div>
          <button
            type="button"
            onClick={clearSaveError}
            className="ide-focus-ring flex h-6 w-6 items-center justify-center text-ide-muted hover:text-ide-text"
            aria-label="Dismiss save error"
            title="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {isPendingAnalysis && (
        <div className="flex min-h-[34px] shrink-0 items-center gap-3 border-b border-ide-amber/40 bg-ide-panel px-3 font-mono text-[10px] text-ide-muted" data-purpose="cia-warning-banner">
          <span className="h-1.5 w-1.5 bg-ide-amber" aria-hidden="true" />
          <span className="text-ide-amber">{activeFile.name}</span>
          <span>{hasImpactScore ? `Impact score ${ciaResult.blastRadiusScore}/100` : 'Change impact analysis pending'}</span>
          <span className="hidden text-ide-subtle md:inline">No score until analysis completes</span>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setActiveView('cia')} className="ide-focus-ring whitespace-nowrap px-2 py-1 text-ide-text hover:bg-ide-hover hover:text-ide-strong">Inspect impact</button>
            <button type="button" onClick={() => runTests()} disabled={isExecutingTests} className="ide-focus-ring inline-flex items-center gap-1 bg-ide-focus px-2 py-1 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              <Play className="h-3 w-3" aria-hidden="true" />
              {isExecutingTests ? 'Running tests' : 'Run tests'}
            </button>
          </div>
        </div>
      )}

      <div className="relative flex h-full min-h-0 flex-1 overflow-hidden font-mono leading-relaxed">
        {editorSettings.lineNumbers && (
          <div
            ref={lineNumbersRef}
            className="h-full min-h-0 shrink-0 overflow-hidden bg-ide-bg px-2 pt-2 pb-32 text-right text-ide-subtle select-none"
            style={{
              width: `${Math.max(48, String(lines.length).length * 8 + 20)}px`,
              fontSize: `${editorSettings.fontSize}px`,
              lineHeight: `${editorSettings.fontSize * 1.6}px`,
            }}
            aria-hidden="true"
          >
            {lines.map((_, index) => (
              <div
                key={index}
                style={{
                  height: `${editorSettings.fontSize * 1.6}px`,
                  lineHeight: `${editorSettings.fontSize * 1.6}px`,
                }}
                className={`${index + 1 === cursorPos.line ? 'text-ide-text font-bold' : ''}`}
              >
                {index + 1}
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={activeFile.content}
          onChange={(event) => {
            updateFileContent(activeFile.id, event.target.value);
            updateCursorInfo(event.target);
          }}
          onScroll={handleScroll}
          onSelect={(event) => updateCursorInfo(event.currentTarget)}
          onKeyUp={(event) => updateCursorInfo(event.currentTarget)}
          onClick={(event) => updateCursorInfo(event.currentTarget)}
          spellCheck={false}
          wrap={editorSettings.wordWrap ? 'on' : 'off'}
          aria-label={`Editing ${activeFile.path}`}
          className={`h-full min-h-0 min-w-0 flex-1 resize-none overflow-auto border-0 bg-transparent p-2 pb-32 font-mono text-ide-text outline-none selection:bg-ide-focus/30 ${
            editorSettings.wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
          }`}
          style={{
            tabSize: editorSettings.tabSize,
            fontSize: `${editorSettings.fontSize}px`,
            lineHeight: `${editorSettings.fontSize * 1.6}px`,
          }}
        />

        {editorSettings.showMinimap && lines.length > 8 && (
          <div className="hidden h-full min-h-0 w-16 shrink-0 overflow-hidden border-l border-ide-border bg-ide-shell/70 p-1.5 select-none lg:block" data-purpose="code-minimap" aria-hidden="true">
            {lines.slice(0, 80).map((line, index) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={index} className="minimap-line my-0.5 w-0" />;
              let typeClass = 'minimap-plain';
              if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) typeClass = 'minimap-comment';
              else if (/^(import|export|const|let|var|function|return|if|else|for|while|class|interface|type|include|int|char|void|bool|struct)\b/.test(trimmed)) typeClass = 'minimap-keyword';
              else if (trimmed.includes('(') && trimmed.includes(')')) typeClass = 'minimap-func';
              else if (trimmed.includes('"') || trimmed.includes("'") || trimmed.includes('`')) typeClass = 'minimap-str';
              const indent = line.length - line.trimStart().length;
              return <div key={index} className={`minimap-line ${typeClass}`} style={{ width: `${Math.min(Math.max(trimmed.length * 2, 8), 54)}px`, marginLeft: `${Math.min(indent * 2, 16)}px` }} />;
            })}
            <div className="mt-2 h-20 w-full border border-ide-focus/50" />
          </div>
        )}
      </div>
    </main>
  );
};
