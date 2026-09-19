import React, { useState, useEffect, useRef } from 'react';
import { useIDE } from '../../context/IDEContext';

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
    isExecutingTests
  } = useIDE();

  const activeFile = files.find(f => f.id === activeFileId);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+S
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

  // Open folder handler for welcome screen
  const handleSelectFolder = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();
        const loadedFiles: any[] = [];

        async function readDir(handle: any, currentPath: string) {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              if (/\.(ts|tsx|js|jsx|json|c|h|cpp|py|md|html|css|yaml|txt)$/i.test(entry.name)) {
                const file = await entry.getFile();
                const text = await file.text();
                loadedFiles.push({
                  id: 'file-' + Math.random().toString(36).substring(2, 9),
                  name: entry.name,
                  path: currentPath ? `${currentPath}/${entry.name}` : entry.name,
                  language: entry.name.split('.').pop() || 'typescript',
                  content: text,
                  isDirty: false
                });
              }
            } else if (entry.kind === 'directory' && !['node_modules', '.git', 'dist', '.vscode'].includes(entry.name)) {
              await readDir(entry, currentPath ? `${currentPath}/${entry.name}` : entry.name);
            }
          }
        }

        await readDir(dirHandle, '');
        if (loadedFiles.length > 0) {
          loadExternalFiles(loadedFiles, dirHandle.name);
        }
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    folderInputRef.current?.click();
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const loadedFiles: any[] = [];
    let folderName = 'Imported Project';

    Array.from(fileList).forEach(file => {
      const relPath = file.webkitRelativePath || file.name;
      const parts = relPath.split('/');
      if (parts.length > 1) folderName = parts[0];

      if (relPath.includes('node_modules/') || relPath.includes('.git/')) return;

      const reader = new FileReader();
      reader.onload = () => {
        loadedFiles.push({
          id: 'file-' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          path: relPath,
          language: file.name.split('.').pop() || 'typescript',
          content: String(reader.result || ''),
          isDirty: false
        });

        if (loadedFiles.length === Array.from(fileList).filter(f => !f.webkitRelativePath.includes('node_modules')).length) {
          loadExternalFiles(loadedFiles, folderName);
        }
      };
      reader.readAsText(file);
    });
  };

  if (!activeFile) {
    return (
      <main className="flex-1 bg-[#0b0f19] flex flex-col items-center justify-center text-slate-500 font-mono text-xs select-none">
        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFolderInputChange}
          // @ts-ignore
          webkitdirectory="true"
          directory="true"
          multiple
          className="hidden"
        />
        <div className="flex flex-col items-center max-w-md text-center p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-[0_0_24px_rgba(59,130,246,0.35)] text-white">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
          </div>
          <div>
            <h2 className="text-white text-base font-semibold tracking-wide flex items-center justify-center gap-2">
              IntelliCode IDE
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v0.24
              </span>
            </h2>
            <p className="text-slate-400 text-xs mt-1.5">
              Workspace is empty. Create a file or open a local folder to start.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => createFile('index.ts', 'src')}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
            >
              <span>+ New File</span>
            </button>
            <button
              onClick={handleSelectFolder}
              className="px-4 py-2 rounded-lg bg-[#162035] hover:bg-[#1d2b47] text-slate-200 border border-[#233354] text-xs font-medium flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <span>Open Folder</span>
            </button>
          </div>

          <div className="pt-6 border-t border-[#182133] w-full text-slate-500 text-[11px] space-y-1.5 text-left font-mono">
            <div className="flex justify-between items-center">
              <span>Show All Commands</span>
              <kbd className="text-slate-400 bg-[#162035] px-1.5 py-0.5 rounded border border-[#223150]">Ctrl+Shift+P</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span>Quick File Open</span>
              <kbd className="text-slate-400 bg-[#162035] px-1.5 py-0.5 rounded border border-[#223150]">Ctrl+P</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span>Save Changes</span>
              <kbd className="text-slate-400 bg-[#162035] px-1.5 py-0.5 rounded border border-[#223150]">Ctrl+S</kbd>
            </div>
          </div>
        </div>
      </main>
    );
  }

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
  const isCFile = activeFile.name.endsWith('.c') || activeFile.name.endsWith('.h');
  const isMain = activeFile.name === 'main.c';

  return (
    <main className="flex-1 flex flex-col bg-[#0b0f19] overflow-hidden" data-purpose="editor-workspace">
      {/* Editor Tabs Bar */}
      <div className="h-9 bg-[#080c14] flex items-center border-b border-[#161d2c] select-none overflow-x-auto">
        {openFileIds.map((fileId) => {
          const file = files.find(f => f.id === fileId);
          if (!file) return null;
          const isActive = file.id === activeFileId;
          const isFileMain = file.name === 'main.c';

          if (isActive) {
            return (
              <div
                key={file.id}
                onClick={() => openFile(file.id)}
                className="h-full bg-[#0b0f19] border-t-2 border-blue-500 border-r border-[#161d2c] flex items-center gap-2 px-3 text-xs text-white shrink-0 cursor-pointer"
              >
                <span className={`${isFileMain ? 'text-purple-400' : 'text-blue-400'} font-bold text-[11px] font-mono`}>
                  {file.name.endsWith('.c') || file.name.endsWith('.h') ? 'C' : 'TS'}
                </span>
                <span className="font-medium">{file.name}</span>
                {file.isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="Unsaved changes" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFile(file.id);
                  }}
                  className="ml-1 text-slate-400 hover:text-white rounded p-0.5"
                  title="Close tab"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </button>
              </div>
            );
          }

          return (
            <div
              key={file.id}
              onClick={() => openFile(file.id)}
              className="h-full bg-[#080c14] border-r border-[#161d2c] flex items-center gap-2 px-3 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#0d121f] transition-colors cursor-pointer group shrink-0"
            >
              <span className={`${isFileMain ? 'text-purple-400' : 'text-blue-400'} font-bold text-[11px] font-mono`}>
                {file.name.endsWith('.c') || file.name.endsWith('.h') ? 'C' : 'TS'}
              </span>
              <span>{file.name}</span>
              {file.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="Unsaved changes" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.id);
                }}
                className="ml-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white"
                title="Close tab"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
              </button>
            </div>
          );
        })}

        {/* New Tab Button */}
        <button
          onClick={() => createFile('module.ts', 'src')}
          className="h-full px-2.5 text-slate-500 hover:text-slate-300 hover:bg-[#0f1422] transition-colors shrink-0"
          title="New Tab"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
        </button>
      </div>

      {/* Editor Breadcrumbs */}
      <div className="h-6 px-3 bg-[#0b0f19] border-b border-[#141b29] flex items-center gap-1.5 text-[11.5px] text-slate-400 shrink-0">
        {pathParts.map((part, idx) => {
          const isLast = idx === pathParts.length - 1;
          return (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
              )}
              {isLast ? (
                <>
                  <span className={`${isMain ? 'text-purple-400' : 'text-blue-400'} font-bold text-[11px] font-mono`}>
                    {isCFile ? 'C' : 'TS'}
                  </span>
                  <span className="text-slate-200 font-medium">{part}</span>
                </>
              ) : (
                <span className="hover:text-slate-200 cursor-pointer">{part}</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Change Impact Analysis (CIA) Notification Banner - only when active file is modified */}
      {activeFile.isModified && (
        <div className="m-2 px-3 py-1.5 bg-[#171410] border border-amber-600/40 rounded-md flex items-center justify-between text-xs shadow-sm shrink-0" data-purpose="cia-warning-banner">
          <div className="flex items-center gap-2.5">
            <div className="text-amber-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v18m0-18C8 3 4 5 4 9c0 5 4 8 8 10 4-2 8-5 8-10 0-4-4-6-8-6z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </div>
            <div className="text-slate-300 flex items-center gap-1.5">
              <span className="font-semibold text-amber-300">{activeFile.name}</span>
              <span>is being analyzed by CIA (Change Impact Analysis)</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="w-44 h-1.5 bg-[#2a241b] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-300"
                  style={{ width: `${ciaResult.blastRadiusScore || 82}%` }}
                ></div>
              </div>
              <span className="text-[11px] font-mono text-amber-300 font-medium">
                {ciaResult.blastRadiusScore || 82}/100
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {}}
              className="px-2.5 py-1 text-slate-300 hover:text-white bg-[#221c15] hover:bg-[#2b241d] border border-amber-500/30 rounded text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer select-none active:scale-[0.98]"
              title="Inspect Blast Radius"
            >
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
              <span>Inspect Blast Radius</span>
            </button>
            <button
              onClick={() => runTests()}
              disabled={isExecutingTests}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11.5px] font-medium flex items-center gap-1.5 shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all cursor-pointer select-none active:scale-[0.98]"
            >
              <span>▷</span>
              <span>{isExecutingTests ? 'Running...' : 'Run Tests'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Code Surface & Minimap Area */}
      <div className="flex-1 flex overflow-hidden font-mono text-[12.5px] leading-relaxed relative">
        {/* Left Line Numbers Gutter */}
        <div className="w-12 bg-[#0b0f19] text-[#3e4d68] text-right pr-3 select-none shrink-0 pt-2 text-[12px] font-mono space-y-[2px]">
          {lines.map((_, i) => (
            <div key={i} className="leading-5">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Content Area: Live Editable Monospace Textarea */}
        <textarea
          ref={textareaRef}
          value={activeFile.content}
          onChange={handleTextareaChange}
          onSelect={(e) => updateCursorInfo(e.currentTarget)}
          onKeyUp={(e) => updateCursorInfo(e.currentTarget)}
          onClick={(e) => updateCursorInfo(e.currentTarget)}
          spellCheck={false}
          className="flex-1 bg-transparent text-slate-200 p-2 font-mono text-[12.5px] leading-5 resize-none focus:outline-none overflow-auto whitespace-pre selection:bg-blue-500/30 selection:text-blue-200 tab-size-2 border-none"
          style={{ tabSize: 2 }}
        />

        {/* Minimap (Right Column) */}
        <div className="w-16 h-full bg-[#080c14]/70 border-l border-[#141b29] shrink-0 p-1 select-none pointer-events-none opacity-80 overflow-hidden" data-purpose="code-minimap">
          {lines.slice(0, 45).map((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed) {
              return <div key={idx} className="minimap-line w-0 my-0.5" />;
            }
            let typeClass = 'minimap-plain';
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
              typeClass = 'minimap-comment';
            } else if (/^(import|export|const|let|var|function|return|if|else|for|while|class|interface|type|include|int|char|void|bool|struct)\b/.test(trimmed)) {
              typeClass = 'minimap-keyword';
            } else if (trimmed.includes('(') && trimmed.includes(')')) {
              typeClass = 'minimap-func';
            } else if (trimmed.includes('"') || trimmed.includes("'") || trimmed.includes('`')) {
              typeClass = 'minimap-str';
            }
            const indent = line.length - line.trimStart().length;
            const widthPx = Math.min(Math.max(trimmed.length * 2, 8), 54);
            const marginPx = Math.min(indent * 2, 16);
            return (
              <div
                key={idx}
                className={`minimap-line ${typeClass}`}
                style={{ width: `${widthPx}px`, marginLeft: `${marginPx}px` }}
              />
            );
          })}
          {/* Semi-transparent overlay visible rect */}
          <div className="w-full h-24 bg-blue-500/10 border border-blue-400/20 rounded mt-2"></div>
        </div>
      </div>
    </main>
  );
};
