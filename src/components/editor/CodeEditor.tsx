import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, FilePlus, FolderOpen, Play, Search, X } from 'lucide-react';
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
    createFile,
    loadExternalFiles,
    ciaResult,
    runTests,
    isExecutingTests,
    setActiveView,
  } = useIDE();

  const activeFile = files.find((file) => file.id === activeFileId);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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

  const handleSelectFolder = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        // @ts-ignore File System Access API is not available in all lib.dom versions.
        const directoryHandle = await window.showDirectoryPicker();
        const loadedFiles: any[] = [];

        async function readDirectory(handle: any, currentPath: string) {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              if (!/\.(ts|tsx|js|jsx|json|c|h|cpp|py|md|html|css|yaml|txt)$/i.test(entry.name)) continue;
              const file = await entry.getFile();
              loadedFiles.push({
                id: `file-${Math.random().toString(36).substring(2, 9)}`,
                name: entry.name,
                path: currentPath ? `${currentPath}/${entry.name}` : entry.name,
                language: entry.name.split('.').pop() || 'typescript',
                content: await file.text(),
                isDirty: false,
              });
            } else if (entry.kind === 'directory' && !['node_modules', '.git', 'dist', '.vscode'].includes(entry.name)) {
              await readDirectory(entry, currentPath ? `${currentPath}/${entry.name}` : entry.name);
            }
          }
        }

        await readDirectory(directoryHandle, '');
        if (loadedFiles.length > 0) loadExternalFiles(loadedFiles, directoryHandle.name);
        return;
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
      }
    }
    folderInputRef.current?.click();
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
        loadedFiles.push({
          id: `file-${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          path: relativePath,
          language: file.name.split('.').pop() || 'typescript',
          content: String(reader.result || ''),
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
      <main id="editor-workspace" className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-ide-bg" data-purpose="editor-workspace">
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

            <div className="flex flex-wrap items-center gap-2 border-y border-ide-border py-4">
              <button
                type="button"
                onClick={() => createFile('index.ts', 'src')}
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
    <main id="editor-workspace" className="flex min-h-0 flex-1 flex-col overflow-hidden bg-ide-bg" data-purpose="editor-workspace">
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
        <button type="button" onClick={() => createFile('module.ts', 'src')} className="ide-focus-ring flex h-full w-9 shrink-0 items-center justify-center text-ide-subtle hover:bg-ide-hover hover:text-ide-text" title="New file tab" aria-label="New file tab">
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
        <span className="ml-auto hidden items-center gap-2 text-ide-subtle sm:flex">
          <Search className="h-3 w-3" aria-hidden="true" />
          {cursorPos.line}:{cursorPos.col}
        </span>
      </div>

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

      <div className="relative flex min-h-0 flex-1 overflow-hidden font-mono text-[12px] leading-5">
        <div className="w-12 shrink-0 overflow-hidden bg-ide-bg px-2 pt-2 text-right text-[11px] text-ide-subtle select-none">
          {lines.map((_, index) => <div key={index} className={`h-5 ${index + 1 === cursorPos.line ? 'text-ide-text' : ''}`}>{index + 1}</div>)}
        </div>

        <textarea
          ref={textareaRef}
          value={activeFile.content}
          onChange={(event) => {
            updateFileContent(activeFile.id, event.target.value);
            updateCursorInfo(event.target);
          }}
          onSelect={(event) => updateCursorInfo(event.currentTarget)}
          onKeyUp={(event) => updateCursorInfo(event.currentTarget)}
          onClick={(event) => updateCursorInfo(event.currentTarget)}
          spellCheck={false}
          aria-label={`Editing ${activeFile.path}`}
          className="min-w-0 flex-1 resize-none overflow-auto border-0 bg-transparent p-2 text-[12px] leading-5 text-ide-text outline-none selection:bg-ide-focus/30"
          style={{ tabSize: 2 }}
        />

        {lines.length > 8 && (
          <div className="hidden w-16 shrink-0 overflow-hidden border-l border-ide-border bg-ide-shell/70 p-1.5 select-none lg:block" data-purpose="code-minimap" aria-hidden="true">
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
