import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  FilePlus,
  FolderOpen,
  Play,
  Replace,
  Save,
  Search,
  X,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import type { WorkspaceDiagnostic } from '../../types/ide';

const getLanguageMark = (fileName: string) => {
  if (fileName.endsWith('.c') || fileName.endsWith('.h')) return 'C';
  if (fileName.endsWith('.py')) return 'PY';
  if (fileName.endsWith('.html')) return 'HT';
  if (fileName.endsWith('.css')) return 'CS';
  if (fileName.endsWith('.json')) return '{}';
  if (fileName.endsWith('.md')) return 'MD';
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'JS';
  return 'TS';
};

const getLanguageClass = (fileName: string) => {
  if (fileName.endsWith('.c') || fileName.endsWith('.h')) return 'text-ide-purple';
  if (fileName.endsWith('.json') || fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'text-ide-amber';
  if (fileName.endsWith('.py')) return 'text-ide-emerald';
  if (fileName.endsWith('.html')) return 'text-ide-rose';
  return 'text-ide-cyan';
};

const AUTO_PAIRS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
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
    saveAllFiles,
    saveError,
    clearSaveError,
    createFile,
    loadExternalFiles,
    openProjectFolder,
    workspacePath,
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
    diagnostics,
    setIsGitHubModalOpen,
  } = useIDE();

  const activeFile = files.find((file) => file.id === activeFileId);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Inline New File creation inside Editor
  const [isPromptingNewFile, setIsPromptingNewFile] = useState(false);
  const [newFileInput, setNewFileInput] = useState('');

  // In-File Find & Replace state
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [findMatchCase, setFindMatchCase] = useState(false);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const diagOverlayRef = useRef<HTMLDivElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const [hoveredDiag, setHoveredDiag] = useState<{
    diags: WorkspaceDiagnostic[];
    x: number;
    y: number;
  } | null>(null);

  const diagnosticsByLine = useMemo(() => {
    const map = new Map<number, WorkspaceDiagnostic[]>();
    if (!activeFile) return map;
    diagnostics
      .filter((d) => d.fileId === activeFile.id)
      .forEach((d) => {
        const list = map.get(d.line) || [];
        list.push(d);
        map.set(d.line, list);
      });
    return map;
  }, [diagnostics, activeFile]);

  // Compute Find matches in activeFile
  const findMatches = useMemo(() => {
    if (!activeFile || !findQuery) return [];
    const content = activeFile.content;
    const haystack = findMatchCase ? content : content.toLowerCase();
    const needle = findMatchCase ? findQuery : findQuery.toLowerCase();
    const indices: number[] = [];
    let pos = 0;
    while (pos <= haystack.length - needle.length) {
      const idx = haystack.indexOf(needle, pos);
      if (idx === -1) break;
      indices.push(idx);
      pos = idx + Math.max(1, needle.length);
    }
    return indices;
  }, [activeFile, findQuery, findMatchCase]);

  const jumpToMatch = (matchIndex: number) => {
    if (!textareaRef.current || !activeFile || findMatches.length === 0) return;
    const safeIdx = ((matchIndex % findMatches.length) + findMatches.length) % findMatches.length;
    setCurrentMatchIdx(safeIdx);
    const startOffset = findMatches[safeIdx];
    const endOffset = startOffset + findQuery.length;
    const ta = textareaRef.current;
    ta.focus();
    ta.setSelectionRange(startOffset, endOffset);
    const linesBefore = activeFile.content.substring(0, startOffset).split('\n').length;
    const approxLineHeight = editorSettings.fontSize * 1.6;
    ta.scrollTop = Math.max(0, (linesBefore - 1) * approxLineHeight - 100);
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = ta.scrollTop;
    updateCursorInfo(ta);
  };

  const handleReplaceCurrent = () => {
    if (!activeFile || !findQuery || findMatches.length === 0) return;
    const safeIdx = Math.min(currentMatchIdx, findMatches.length - 1);
    const startOffset = findMatches[safeIdx];
    const nextContent =
      activeFile.content.slice(0, startOffset) +
      replaceQuery +
      activeFile.content.slice(startOffset + findQuery.length);
    updateFileContent(activeFile.id, nextContent);
  };

  const handleReplaceAll = () => {
    if (!activeFile || !findQuery) return;
    const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, findMatchCase ? 'g' : 'gi');
    const nextContent = activeFile.content.replace(regex, replaceQuery);
    updateFileContent(activeFile.id, nextContent);
  };

  const handleScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
    }
    if (diagOverlayRef.current) {
      diagOverlayRef.current.scrollTop = event.currentTarget.scrollTop;
      diagOverlayRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
    if (hoveredDiag) {
      setHoveredDiag(null);
    }
  };

  const handleEditorMouseMove = (event: React.MouseEvent<HTMLTextAreaElement>) => {
    if (diagnosticsByLine.size === 0) {
      if (hoveredDiag) setHoveredDiag(null);
      return;
    }
    const ta = event.currentTarget;
    const rect = ta.getBoundingClientRect();
    const lineHeight = editorSettings.fontSize * 1.6;
    const padding = 8; // p-2 = 8px
    const relY = event.clientY - rect.top + ta.scrollTop - padding;
    const hoverLine = Math.floor(relY / lineHeight) + 1;
    const lineDiags = diagnosticsByLine.get(hoverLine);

    if (!lineDiags || lineDiags.length === 0) {
      if (hoveredDiag) setHoveredDiag(null);
      return;
    }

    const approxCharWidth = editorSettings.fontSize * 0.602;
    const relX = event.clientX - rect.left + ta.scrollLeft - padding;
    const hoverCol = Math.max(1, Math.floor(relX / approxCharWidth) + 1);

    const matching = lineDiags.filter((d) => {
      const start = d.column;
      const end = d.endLine === hoverLine && d.endColumn ? d.endColumn : start + 12;
      return hoverCol >= start - 1 && hoverCol <= end + 1;
    });

    const targetDiags = matching.length > 0 ? matching : lineDiags;
    setHoveredDiag({
      diags: targetDiags,
      x: Math.min(event.clientX - rect.left + 12, Math.max(16, rect.width - 340)),
      y: Math.max(8, event.clientY - rect.top + 18),
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveAllFiles();
      } else if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (activeFile) saveFile(activeFile.id);
      } else if (mod && event.key.toLowerCase() === 'f') {
        if (activeFile) {
          event.preventDefault();
          setIsFindOpen(true);
          setTimeout(() => findInputRef.current?.focus(), 30);
        }
      } else if (mod && event.key.toLowerCase() === 'h') {
        if (activeFile) {
          event.preventDefault();
          setIsFindOpen(true);
          setShowReplace(true);
          setTimeout(() => findInputRef.current?.focus(), 30);
        }
      } else if (mod && event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setIsPromptingNewFile(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, saveFile, saveAllFiles]);

  // Jump to target line when navigated from Global Search, Outline, or Problems
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
      const relativePath = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
      const parts = relativePath.split('/');
      let cleanPath = relativePath;
      if (parts.length > 1) {
        folderName = parts[0];
        cleanPath = parts.slice(1).join('/');
      }
      if (relativePath.includes('.git/')) return;

      const reader = new FileReader();
      reader.onload = () => {
        const fileContent = String(reader.result || '');
        loadedFiles.push({
          id: `file-${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          path: cleanPath,
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

  // IDE Textarea Key Ergonomics: Tab, Shift+Tab, Enter auto-indent, Ctrl+/ comment, auto-pair brackets
  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeFile) return;
    const ta = event.currentTarget;
    const { selectionStart, selectionEnd, value } = ta;
    const indentUnit = ' '.repeat(editorSettings.tabSize || 2);

    // 1. Tab / Shift+Tab
    if (event.key === 'Tab') {
      event.preventDefault();
      if (selectionStart === selectionEnd && !event.shiftKey) {
        const nextVal = value.slice(0, selectionStart) + indentUnit + value.slice(selectionEnd);
        updateFileContent(activeFile.id, nextVal);
        requestAnimationFrame(() => {
          ta.setSelectionRange(selectionStart + indentUnit.length, selectionStart + indentUnit.length);
          updateCursorInfo(ta);
        });
      } else {
        // Multi-line indent/unindent
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const nextNewline = value.indexOf('\n', selectionEnd);
        const lineEnd = nextNewline === -1 ? value.length : nextNewline;
        const selectedBlock = value.slice(lineStart, lineEnd);
        const blockLines = selectedBlock.split('\n');

        let deltaStart = 0;
        let deltaTotal = 0;
        const updatedLines = blockLines.map((ln, idx) => {
          if (event.shiftKey) {
            const match = ln.match(new RegExp(`^ {1,${indentUnit.length}}`));
            const removed = match ? match[0].length : 0;
            if (idx === 0) deltaStart = -removed;
            deltaTotal -= removed;
            return ln.slice(removed);
          } else {
            if (idx === 0) deltaStart = indentUnit.length;
            deltaTotal += indentUnit.length;
            return indentUnit + ln;
          }
        });

        const nextVal = value.slice(0, lineStart) + updatedLines.join('\n') + value.slice(lineEnd);
        updateFileContent(activeFile.id, nextVal);
        requestAnimationFrame(() => {
          ta.setSelectionRange(
            Math.max(lineStart, selectionStart + deltaStart),
            Math.max(lineStart, selectionEnd + deltaTotal)
          );
          updateCursorInfo(ta);
        });
      }
      return;
    }

    // 2. Enter -> preserve indentation (+ extra indent after { or :)
    if (event.key === 'Enter' && selectionStart === selectionEnd) {
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLineBeforeCursor = value.slice(lineStart, selectionStart);
      const leadingSpaces = currentLineBeforeCursor.match(/^\s*/)?.[0] || '';
      const trimmedEnd = currentLineBeforeCursor.trimEnd();
      const extraIndent = trimmedEnd.endsWith('{') || trimmedEnd.endsWith(':') ? indentUnit : '';
      if (leadingSpaces || extraIndent) {
        event.preventDefault();
        const insertion = '\n' + leadingSpaces + extraIndent;
        const nextVal = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
        updateFileContent(activeFile.id, nextVal);
        requestAnimationFrame(() => {
          const newPos = selectionStart + insertion.length;
          ta.setSelectionRange(newPos, newPos);
          updateCursorInfo(ta);
        });
        return;
      }
    }

    // 3. Ctrl+/ -> Toggle Line Comment
    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
      event.preventDefault();
      const commentToken = activeFile.name.endsWith('.py') ? '# ' : '// ';
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const nextNewline = value.indexOf('\n', selectionStart);
      const lineEnd = nextNewline === -1 ? value.length : nextNewline;
      const lineText = value.slice(lineStart, lineEnd);

      const isCommented = lineText.trimStart().startsWith(commentToken.trim());
      let newLineText: string;
      let cursorDelta = 0;
      if (isCommented) {
        newLineText = lineText.replace(new RegExp(`^(\\s*)${commentToken.trim()}\\s?`), '$1');
        cursorDelta = newLineText.length - lineText.length;
      } else {
        const leading = lineText.match(/^\s*/)?.[0] || '';
        newLineText = leading + commentToken + lineText.slice(leading.length);
        cursorDelta = commentToken.length;
      }
      const nextVal = value.slice(0, lineStart) + newLineText + value.slice(lineEnd);
      updateFileContent(activeFile.id, nextVal);
      requestAnimationFrame(() => {
        const pos = Math.max(lineStart, selectionStart + cursorDelta);
        ta.setSelectionRange(pos, pos);
        updateCursorInfo(ta);
      });
      return;
    }

    // 4. Auto-pair brackets / quotes
    if (!event.ctrlKey && !event.metaKey && !event.altKey && AUTO_PAIRS[event.key]) {
      const closing = AUTO_PAIRS[event.key];
      if (selectionStart !== selectionEnd) {
        event.preventDefault();
        const selected = value.slice(selectionStart, selectionEnd);
        const nextVal = value.slice(0, selectionStart) + event.key + selected + closing + value.slice(selectionEnd);
        updateFileContent(activeFile.id, nextVal);
        requestAnimationFrame(() => {
          ta.setSelectionRange(selectionStart + 1, selectionEnd + 1);
        });
      } else {
        const nextChar = value[selectionStart];
        if (!nextChar || /[\s)\]}.,;:]/.test(nextChar)) {
          event.preventDefault();
          const nextVal = value.slice(0, selectionStart) + event.key + closing + value.slice(selectionEnd);
          updateFileContent(activeFile.id, nextVal);
          requestAnimationFrame(() => {
            ta.setSelectionRange(selectionStart + 1, selectionStart + 1);
            updateCursorInfo(ta);
          });
        }
      }
    }
  };

  const handleSubmitNewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFileInput.trim();
    if (!clean) {
      setIsPromptingNewFile(false);
      return;
    }
    const parent =
      activeFile && activeFile.path.includes('/') && !clean.includes('/')
        ? activeFile.path.split('/').slice(0, -1).join('/')
        : '';
    await createFile(clean, parent);
    setNewFileInput('');
    setIsPromptingNewFile(false);
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
                <p className="mt-1 text-xs text-ide-muted">Workspace is empty. Create a file, open a local folder, or open a GitHub repo.</p>
              </div>
            </div>

            {pendingReconnect && (
              <div className="mb-6 border border-ide-amber/40 bg-ide-amber/10 p-4 font-sans text-xs">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-ide-amber mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-ide-strong">Reconnect &ldquo;{pendingReconnect.folderName}&rdquo;</h2>
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

            {isPromptingNewFile ? (
              <form onSubmit={handleSubmitNewFile} className="border-y border-ide-border py-4">
                <label className="mb-1.5 block font-mono text-[10px] text-ide-focus" htmlFor="welcome-new-file">
                  Enter file path (e.g. index.html, src/App.tsx, main.py)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="welcome-new-file"
                    type="text"
                    autoFocus
                    value={newFileInput}
                    onChange={(e) => setNewFileInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setIsPromptingNewFile(false);
                    }}
                    placeholder="e.g. src/main.ts"
                    className="ide-focus-ring min-w-0 flex-1 rounded-ide-control border border-ide-border-strong bg-ide-surface px-3 py-1.5 font-mono text-xs text-ide-strong outline-none"
                  />
                  <button type="submit" className="ide-focus-ring rounded-ide-control bg-ide-focus px-3 py-1.5 text-xs font-semibold text-white">
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPromptingNewFile(false)}
                    className="ide-focus-ring rounded-ide-control border border-ide-border px-3 py-1.5 text-xs text-ide-muted hover:text-ide-text"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-2 border-y border-ide-border py-4">
                <button
                  type="button"
                  onClick={() => setIsPromptingNewFile(true)}
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
                <button
                  type="button"
                  onClick={() => setIsGitHubModalOpen(true)}
                  className="ide-focus-ring ide-control inline-flex min-h-[34px] items-center gap-2 border border-ide-border-strong px-3 text-xs font-medium text-ide-text hover:bg-ide-hover hover:text-ide-strong"
                >
                  <span className="font-mono text-ide-cyan">GH</span>
                  Open GitHub Repo
                </button>
              </div>
            )}

            <div className="mt-5 grid max-w-[460px] grid-cols-[1fr_auto] border-y border-ide-border font-mono text-[10px] text-ide-muted">
              <span className="border-b border-ide-border py-2">Show all commands</span>
              <kbd className="border-b border-l border-ide-border px-2 py-2 text-ide-text">Ctrl+Shift+P</kbd>
              <span className="border-b border-ide-border py-2">Quick file open</span>
              <kbd className="border-b border-l border-ide-border px-2 py-2 text-ide-text">Ctrl+P</kbd>
              <span className="border-b border-ide-border py-2">Toggle integrated terminal</span>
              <kbd className="border-b border-l border-ide-border px-2 py-2 text-ide-text">Ctrl+`</kbd>
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
  const hasLiveDisk = Boolean(activeFile.fileHandle || workspacePath);

  return (
    <main id="editor-workspace" className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-ide-bg" data-purpose="editor-workspace">
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

        {isPromptingNewFile ? (
          <form onSubmit={handleSubmitNewFile} className="flex h-full items-center gap-1 px-2 bg-ide-surface border-r border-ide-border">
            <input
              type="text"
              autoFocus
              value={newFileInput}
              onChange={(e) => setNewFileInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsPromptingNewFile(false);
              }}
              placeholder="filename.ts"
              className="w-32 bg-ide-bg px-1.5 py-0.5 font-mono text-[11px] text-ide-strong border border-ide-focus outline-none rounded-ide-control"
            />
            <button type="submit" className="text-ide-emerald hover:text-ide-strong p-0.5" title="Create file">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setIsPromptingNewFile(false)} className="text-ide-muted hover:text-ide-text p-0.5" title="Cancel">
              <X className="h-3.5 w-3.5" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsPromptingNewFile(true)}
            className="ide-focus-ring flex h-full w-9 shrink-0 items-center justify-center text-ide-subtle hover:bg-ide-hover hover:text-ide-text"
            title="New file tab"
            aria-label="New file tab"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Breadcrumbs & Actions */}
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
          {hasLiveDisk ? (
            <span className="hidden items-center gap-1 text-[10px] text-ide-emerald md:flex" title="Direct disk write-back available">
              <span className="h-1.5 w-1.5 rounded-full bg-ide-emerald" aria-hidden="true" />
              Live Disk
            </span>
          ) : (
            <span className="hidden items-center gap-1 text-[10px] text-ide-amber md:flex" title="In-memory file; Save will export via browser download">
              <span className="h-1.5 w-1.5 rounded-full bg-ide-amber" aria-hidden="true" />
              Memory Mode
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              setIsFindOpen((v) => !v);
              setTimeout(() => findInputRef.current?.focus(), 30);
            }}
            className={`ide-focus-ring flex items-center gap-1 rounded-ide-control px-1.5 py-0.5 text-[10px] transition-colors ${
              isFindOpen ? 'bg-ide-selected text-ide-focus' : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
            }`}
            title="Find & Replace in file (Ctrl+F / Ctrl+H)"
          >
            <Search className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">Find</span>
          </button>

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
            <span>{activeFile.isDirty ? (hasLiveDisk ? 'Save' : 'Export') : 'Saved'}</span>
          </button>

          <span className="hidden items-center gap-1 text-ide-subtle sm:flex">
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
        </div>
      </div>

      {/* In-File Find & Replace Bar */}
      {isFindOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-ide-border bg-ide-panel px-3 py-1.5 font-mono text-[11px]">
          <button
            type="button"
            onClick={() => setShowReplace((v) => !v)}
            className="ide-focus-ring p-1 text-ide-muted hover:text-ide-text"
            title="Toggle Replace"
          >
            <Replace className="h-3.5 w-3.5" />
          </button>
          <input
            ref={findInputRef}
            type="text"
            value={findQuery}
            onChange={(e) => {
              setFindQuery(e.target.value);
              setCurrentMatchIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                jumpToMatch(e.shiftKey ? currentMatchIdx - 1 : currentMatchIdx + 1);
              } else if (e.key === 'Escape') {
                setIsFindOpen(false);
              }
            }}
            placeholder="Find in file…"
            className="w-48 rounded-ide-control border border-ide-border-strong bg-ide-bg px-2 py-1 text-xs text-ide-strong outline-none focus:border-ide-focus"
          />
          <button
            type="button"
            onClick={() => setFindMatchCase((v) => !v)}
            className={`rounded-ide-control border px-1.5 py-0.5 text-[10px] ${
              findMatchCase ? 'border-ide-focus bg-ide-selected text-ide-focus' : 'border-ide-border text-ide-muted'
            }`}
            title="Match Case"
          >
            Aa
          </button>
          <span className="text-[10px] text-ide-subtle min-w-[54px]">
            {findQuery ? (findMatches.length > 0 ? `${(currentMatchIdx % findMatches.length) + 1} of ${findMatches.length}` : '0 results') : ''}
          </span>
          <button
            type="button"
            onClick={() => jumpToMatch(currentMatchIdx - 1)}
            disabled={findMatches.length === 0}
            className="p-1 text-ide-muted hover:text-ide-text disabled:opacity-40"
            title="Previous Match (Shift+Enter)"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => jumpToMatch(currentMatchIdx + 1)}
            disabled={findMatches.length === 0}
            className="p-1 text-ide-muted hover:text-ide-text disabled:opacity-40"
            title="Next Match (Enter)"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>

          {showReplace && (
            <div className="flex items-center gap-1.5 border-l border-ide-border pl-2">
              <input
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace with…"
                className="w-40 rounded-ide-control border border-ide-border-strong bg-ide-bg px-2 py-1 text-xs text-ide-strong outline-none focus:border-ide-focus"
              />
              <button
                type="button"
                onClick={handleReplaceCurrent}
                disabled={findMatches.length === 0}
                className="rounded-ide-control border border-ide-border bg-ide-surface px-2 py-1 text-[10px] text-ide-text hover:bg-ide-hover disabled:opacity-40"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleReplaceAll}
                disabled={findMatches.length === 0}
                className="rounded-ide-control border border-ide-border bg-ide-surface px-2 py-1 text-[10px] text-ide-text hover:bg-ide-hover disabled:opacity-40"
              >
                All
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsFindOpen(false)}
            className="ml-auto p-1 text-ide-muted hover:text-ide-text"
            title="Close Find (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
          <span>{hasImpactScore ? `Impact score ${ciaResult.blastRadiusScore}/100` : 'Modified in workspace'}</span>
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
            {lines.map((_, index) => {
              const lineNum = index + 1;
              const lineDiags = diagnosticsByLine.get(lineNum);
              const hasError = lineDiags?.some((d) => d.severity === 'error');
              const hasWarning = lineDiags?.some((d) => d.severity === 'warning');

              return (
                <div
                  key={index}
                  style={{
                    height: `${editorSettings.fontSize * 1.6}px`,
                    lineHeight: `${editorSettings.fontSize * 1.6}px`,
                  }}
                  title={
                    lineDiags
                      ? lineDiags.map((d) => `[${d.severity.toUpperCase()}] ${d.message}`).join('\n')
                      : undefined
                  }
                  className={`flex items-center justify-end ${
                    hasError
                      ? 'text-ide-rose font-bold'
                      : hasWarning
                        ? 'text-ide-amber font-bold'
                        : lineNum === cursorPos.line
                          ? 'text-ide-text font-bold'
                          : ''
                  }`}
                >
                  {hasError && (
                    <span className="mr-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ide-rose" aria-hidden="true" />
                  )}
                  {!hasError && hasWarning && (
                    <span className="mr-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ide-amber" aria-hidden="true" />
                  )}
                  <span>{lineNum}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="relative h-full min-h-0 min-w-0 flex-1 overflow-hidden">
          {/* Diagnostic squiggly underline overlay */}
          <div
            ref={diagOverlayRef}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 overflow-hidden p-2 pb-32 font-mono text-transparent select-none ${
              editorSettings.wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
            }`}
            style={{
              tabSize: editorSettings.tabSize,
              fontSize: `${editorSettings.fontSize}px`,
              lineHeight: `${editorSettings.fontSize * 1.6}px`,
            }}
          >
            {lines.map((lineText, idx) => {
              const lineNum = idx + 1;
              const lineDiags = diagnosticsByLine.get(lineNum);
              if (!lineDiags || lineDiags.length === 0) {
                return (
                  <div key={idx} style={{ minHeight: `${editorSettings.fontSize * 1.6}px` }}>
                    {lineText || ' '}
                  </div>
                );
              }

              // Use highest-severity diagnostic on this line for squiggly span
              const primary =
                lineDiags.find((d) => d.severity === 'error') ||
                lineDiags.find((d) => d.severity === 'warning') ||
                lineDiags[0];
              const startIdx = Math.min(lineText.length, Math.max(0, primary.column - 1));
              let endIdx =
                primary.endLine === lineNum && primary.endColumn
                  ? Math.min(lineText.length, Math.max(startIdx + 1, primary.endColumn - 1))
                  : startIdx;
              if (endIdx <= startIdx) {
                const rest = lineText.slice(startIdx);
                const tokMatch = rest.match(/^\S+/);
                endIdx = Math.min(lineText.length, startIdx + Math.max(1, tokMatch ? tokMatch[0].length : 1));
              }

              const decoClass =
                primary.severity === 'error'
                  ? 'decoration-ide-rose'
                  : primary.severity === 'warning'
                    ? 'decoration-ide-amber'
                    : 'decoration-ide-cyan';

              return (
                <div key={idx} style={{ minHeight: `${editorSettings.fontSize * 1.6}px` }}>
                  <span>{lineText.slice(0, startIdx)}</span>
                  <span className={`underline decoration-wavy decoration-2 underline-offset-2 ${decoClass}`}>
                    {lineText.slice(startIdx, endIdx) || ' '}
                  </span>
                  <span>{lineText.slice(endIdx)}</span>
                </div>
              );
            })}
          </div>

          <textarea
            ref={textareaRef}
            value={activeFile.content}
            onChange={(event) => {
              updateFileContent(activeFile.id, event.target.value);
              updateCursorInfo(event.target);
            }}
            onKeyDown={handleEditorKeyDown}
            onScroll={handleScroll}
            onMouseMove={handleEditorMouseMove}
            onMouseLeave={() => setHoveredDiag(null)}
            onSelect={(event) => updateCursorInfo(event.currentTarget)}
            onKeyUp={(event) => updateCursorInfo(event.currentTarget)}
            onClick={(event) => updateCursorInfo(event.currentTarget)}
            spellCheck={false}
            wrap={editorSettings.wordWrap ? 'on' : 'off'}
            aria-label={`Editing ${activeFile.path}`}
            className={`relative z-10 h-full w-full resize-none overflow-auto border-0 bg-transparent p-2 pb-32 font-mono text-ide-text outline-none selection:bg-ide-focus/30 ${
              editorSettings.wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
            }`}
            style={{
              tabSize: editorSettings.tabSize,
              fontSize: `${editorSettings.fontSize}px`,
              lineHeight: `${editorSettings.fontSize * 1.6}px`,
            }}
          />

          {hoveredDiag && hoveredDiag.diags.length > 0 && (
            <div
              role="tooltip"
              style={{ left: `${hoveredDiag.x}px`, top: `${hoveredDiag.y}px` }}
              className="pointer-events-none absolute z-30 max-w-sm rounded-ide-panel border border-ide-border-strong bg-ide-panel p-2.5 shadow-lg space-y-1.5"
            >
              {hoveredDiag.diags.map((d) => (
                <div key={d.id} className="text-[11px] leading-snug">
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span
                      className={`font-semibold uppercase ${
                        d.severity === 'error'
                          ? 'text-ide-rose'
                          : d.severity === 'warning'
                            ? 'text-ide-amber'
                            : 'text-ide-cyan'
                      }`}
                    >
                      {d.severity}
                    </span>
                    {d.code && <span className="text-ide-subtle">{d.code}</span>}
                    <span className="ml-auto text-ide-subtle">
                      Ln {d.line}, Col {d.column}
                    </span>
                  </div>
                  <div className="mt-0.5 font-sans text-ide-strong">{d.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {editorSettings.showMinimap && lines.length > 8 && (
          <div className="hidden h-full min-h-0 w-16 shrink-0 overflow-hidden border-l border-ide-border bg-ide-shell/70 p-1.5 select-none lg:block" data-purpose="code-minimap" aria-hidden="true">
            {lines.slice(0, 80).map((line, index) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={index} className="minimap-line my-0.5 w-0" />;
              let typeClass = 'minimap-plain';
              if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) typeClass = 'minimap-comment';
              else if (/^(import|export|const|let|var|function|return|if|else|for|while|class|interface|type|include|int|char|void|bool|struct|def|async|await)\b/.test(trimmed)) typeClass = 'minimap-keyword';
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
