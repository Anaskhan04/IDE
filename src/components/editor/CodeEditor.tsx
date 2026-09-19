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
    ciaResult,
    runTests,
    isExecutingTests
  } = useIDE();

  const activeFile = files.find(f => f.id === activeFileId);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  if (!activeFile) {
    return (
      <div className="flex-1 bg-[#0b0f19] flex flex-col items-center justify-center text-slate-500 font-mono text-xs space-y-4">
        <div className="text-center">
          <p className="text-slate-300 font-bold text-sm">No editor tab open</p>
          <p className="text-slate-500 mt-1">Select a file from the explorer or create a new file.</p>
        </div>
        <button
          onClick={() => createFile('newFile.c', 'src')}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <span>Create New File</span>
        </button>
      </div>
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
                  C
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
                C
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
          onClick={() => createFile('module.c', 'src')}
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
                    C
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

      {/* Change Impact Analysis (CIA) Notification Banner */}
      <div className="m-2 px-3 py-1.5 bg-[#171410] border border-amber-600/40 rounded-md flex items-center justify-between text-xs shadow-sm shrink-0" data-purpose="cia-warning-banner">
        <div className="flex items-center gap-2.5">
          {/* Amber Shield Icon */}
          <div className="text-amber-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v18m0-18C8 3 4 5 4 9c0 5 4 8 8 10 4-2 8-5 8-10 0-4-4-6-8-6z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <div className="text-slate-300 flex items-center gap-1.5">
            <span className="font-semibold text-amber-300">{activeFile.name}</span>
            <span>is being analyzed by CIA (Change Impact Analysis)</span>
          </div>
          {/* Progress Bar */}
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

        {/* Banner Action Buttons - Clickable, clean no-op on Inspect Blast Radius */}
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
          <div className="minimap-line minimap-comment w-10"></div>
          <div className="minimap-line minimap-comment w-12"></div>
          <div className="minimap-line minimap-comment w-8"></div>
          <div className="minimap-line minimap-comment w-11"></div>
          <div className="minimap-line minimap-comment w-10"></div>
          <div className="minimap-line minimap-comment w-9"></div>
          <div className="minimap-line minimap-comment w-3"></div>
          <div className="minimap-line w-0 my-1"></div>
          <div className="minimap-line minimap-keyword w-7"></div>
          <div className="minimap-line minimap-keyword w-6"></div>
          <div className="minimap-line w-0 my-1"></div>
          <div className="minimap-line minimap-func w-11"></div>
          <div className="minimap-line minimap-plain w-8 ml-3"></div>
          <div className="minimap-line minimap-keyword w-9 ml-2"></div>
          <div className="minimap-line w-0 my-1"></div>
          <div className="minimap-line minimap-plain w-7 ml-2"></div>
          <div className="minimap-line minimap-plain w-6 ml-2"></div>
          <div className="minimap-line w-0 my-1"></div>
          <div className="minimap-line minimap-comment w-8 ml-2"></div>
          <div className="minimap-line minimap-func w-11 ml-2"></div>
          <div className="minimap-line minimap-keyword w-6 ml-2"></div>
          <div className="minimap-line minimap-str w-10 ml-4"></div>
          <div className="minimap-line minimap-keyword w-4 ml-4"></div>
          <div className="minimap-line minimap-plain w-2 ml-2"></div>
          <div className="minimap-line w-0 my-1"></div>
          <div className="minimap-line minimap-comment w-12 ml-2"></div>
          <div className="minimap-line minimap-func w-12 ml-2"></div>
          <div className="minimap-line minimap-func w-6 ml-2"></div>
          <div className="minimap-line minimap-keyword w-5 ml-2"></div>
          <div className="minimap-line minimap-plain w-2"></div>
          <div className="minimap-line minimap-func w-11"></div>
          {/* Semi-transparent overlay visible rect */}
          <div className="w-full h-24 bg-blue-500/10 border border-blue-400/20 rounded mt-2"></div>
        </div>
      </div>
    </main>
  );
};
