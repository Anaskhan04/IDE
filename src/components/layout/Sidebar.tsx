import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  AlertCircle,
  CaseSensitive,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Code2,
  Diff,
  Edit2,
  FileCode,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  GitBranch,
  GitCommit as GitCommitIcon,
  Minus,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Regex,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  Sliders,
  Trash2,
  Undo2,
  WholeWord,
  X,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import type { ProjectFile } from '../../types/ide';
import { GitDiffModal } from '../git/GitDiffModal';

interface FileTreeNode {
  name: string;
  fullPath: string;
  isFolder: boolean;
  file?: ProjectFile;
  children: Record<string, FileTreeNode>;
}

const fileTypeLabel = (fileName: string) => {
  if (fileName.endsWith('.c') || fileName.endsWith('.h')) return 'C';
  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx') || fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'TS';
  if (fileName.endsWith('.json')) return '{}';
  return '#';
};

const fileTypeClass = (fileName: string) => {
  if (fileName.endsWith('.c') || fileName.endsWith('.h')) return 'text-ide-purple';
  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx') || fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'text-ide-cyan';
  if (fileName.endsWith('.json')) return 'text-ide-amber';
  return 'text-ide-muted';
};

export const Sidebar: React.FC = () => {
  const {
    sidebarView,
    isSidebarVisible,
    files,
    activeFileId,
    openFile,
    createFile,
    deleteFile,
    renameFile,
    loadExternalFiles,
    openProjectFolder,
    masterPrompt,
    isRestoringWorkspace,
    pendingReconnect,
    reconnectWorkspace,
    dismissReconnect,
    gitBranch,
    stagedFileIds,
    stageFile,
    unstageFile,
    stageAll,
    unstageAll,
    discardChanges,
    gitCommits,
    commitStaged,
    diffTargetFileId,
    setDiffTargetFileId,
    editorSettings,
    updateEditorSettings,
    setTargetEditorLine,
    setActiveView,
    revealedExplorerFileId,
  } = useIDE();

  // Explorer states
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [targetFolder, setTargetFolder] = useState('');
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Search view states
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  // Git view states
  const [commitMessage, setCommitMessage] = useState('');
  const [commitSuccessMessage, setCommitSuccessMessage] = useState<string | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If sidebar is collapsed, render nothing
  if (!isSidebarVisible) {
    return null;
  }

  // Reset collapsed folders when workspace files or project change so the new folder structure is cleanly visible
  useEffect(() => {
    setCollapsedFolders(new Set());
  }, [masterPrompt.projectName]);

  // Reveal file in Explorer: expand parent folders and scroll into view
  useEffect(() => {
    const targetId = revealedExplorerFileId || activeFileId;
    if (!targetId) return;
    const targetFile = files.find((f) => f.id === targetId);
    if (!targetFile) return;

    const parts = targetFile.path.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length > 1) {
      setCollapsedFolders((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (let i = 1; i < parts.length; i++) {
          const parentFolder = parts.slice(0, i).join('/');
          if (next.has(parentFolder)) {
            next.delete(parentFolder);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }

    const timer = setTimeout(() => {
      const el = document.getElementById(`explorer-file-${targetId}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [revealedExplorerFileId, activeFileId, files]);

  // Build tree for explorer
  const fileTree: FileTreeNode = { name: 'root', fullPath: '', isFolder: true, children: {} };

  files.forEach((file) => {
    const normalizedPath = file.path.replace(/\\/g, '/');
    const parts = normalizedPath.split('/').filter(Boolean);
    let current = fileTree;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const currentPath = parts.slice(0, index + 1).join('/');

      if (isLast) {
        current.children[part] = {
          name: part,
          fullPath: currentPath,
          isFolder: false,
          file,
          children: {},
        };
        return;
      }

      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          fullPath: currentPath,
          isFolder: true,
          children: {},
        };
      }
      current = current.children[part];
    });
  });

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((previous) => {
      const next = new Set(previous);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  };

  const collapseAllFolders = () => {
    const allFolders = new Set<string>();
    const collectFolders = (node: FileTreeNode) => {
      Object.values(node.children).forEach((child) => {
        if (child.isFolder) {
          allFolders.add(child.fullPath);
          collectFolders(child);
        }
      });
    };
    collectFolders(fileTree);
    setCollapsedFolders(allFolders);
  };

  const expandAllFolders = () => {
    setCollapsedFolders(new Set());
  };

  const submitCreateFile = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = newFileName.trim();
    if (!clean) {
      setIsCreatingFile(false);
      return;
    }
    await createFile(clean, targetFolder);
    setNewFileName('');
    setIsCreatingFile(false);
  };

  const submitRename = async (fileId: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      await renameFile(fileId, trimmed);
    }
    setRenamingFileId(null);
  };

  const handleSelectFolder = async () => {
    const opened = await openProjectFolder();
    if (!opened) {
      folderInputRef.current?.click();
    }
  };

  const handleFolderInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList?.length) return;

    const loadedFiles: ProjectFile[] = [];
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

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList?.length) return;

    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => createFile(file.name, 'src', String(reader.result || ''));
      reader.readAsText(file);
    });
  };

  const renderTree = (node: FileTreeNode, depth = 0): React.ReactNode[] => {
    const sortedKeys = Object.keys(node.children).sort((a, b) => {
      const aFolder = node.children[a].isFolder;
      const bFolder = node.children[b].isFolder;
      if (aFolder && !bFolder) return -1;
      if (!aFolder && bFolder) return 1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((key) => {
      const child = node.children[key];

      if (child.isFolder) {
        const isCollapsed = collapsedFolders.has(child.fullPath);
        const isFolderSelected = selectedFolder === child.fullPath;
        return (
          <div key={child.fullPath} role="treeitem" aria-expanded={!isCollapsed}>
            <div
              className={`group flex min-h-[26px] items-center border-l ${
                isFolderSelected
                  ? 'border-ide-focus bg-ide-selected/40 text-ide-strong'
                  : 'border-transparent text-ide-text hover:bg-ide-hover/60'
              }`}
              style={{ paddingLeft: `${8 + depth * 12}px` }}
            >
              <button
                type="button"
                onClick={() => {
                  toggleFolder(child.fullPath);
                  setSelectedFolder(child.fullPath);
                }}
                className="ide-focus-ring flex min-w-0 flex-1 items-center gap-1.5 py-1 pr-2 text-left text-[11px]"
              >
                {isCollapsed ? <ChevronRight className="h-3 w-3 shrink-0 text-ide-subtle" /> : <ChevronDown className="h-3 w-3 shrink-0 text-ide-subtle" />}
                <Folder className="h-3.5 w-3.5 shrink-0 text-ide-focus" aria-hidden="true" />
                <span className="truncate">{child.name}</span>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedFolder(child.fullPath);
                  setTargetFolder(child.fullPath);
                  setIsCreatingFile(true);
                }}
                className="ide-focus-ring mr-1 flex h-6 w-6 shrink-0 items-center justify-center text-ide-subtle opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 hover:text-ide-text"
                title={`New file in ${child.name}`}
                aria-label={`New file in ${child.name}`}
              >
                <FilePlus className="h-3.5 w-3.5" />
              </button>
            </div>
            {!isCollapsed && <div>{renderTree(child, depth + 1)}</div>}
          </div>
        );
      }

      const file = child.file!;
      const isActive = file.id === (revealedExplorerFileId || activeFileId);
      const isRenaming = renamingFileId === file.id;

      return (
        <div
          key={file.id}
          id={`explorer-file-${file.id}`}
          role="treeitem"
          className={`group flex min-h-[26px] items-center border-l-2 ${isActive ? 'border-ide-focus bg-ide-selected text-ide-strong' : 'border-transparent text-ide-muted hover:bg-ide-hover/60'}`}
          style={{ paddingLeft: `${18 + depth * 12}px` }}
        >
          {isRenaming ? (
            <div className="flex min-w-0 flex-1 items-center gap-1 py-1 pr-1">
              <input
                type="text"
                autoFocus
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitRename(file.id);
                  if (event.key === 'Escape') setRenamingFileId(null);
                }}
                className="ide-focus-ring min-w-0 flex-1 border border-ide-focus bg-ide-code px-1.5 py-0.5 font-mono text-[11px] text-ide-strong outline-none"
                aria-label={`Rename ${file.name}`}
              />
              <button type="button" onClick={() => submitRename(file.id)} className="ide-focus-ring flex h-6 w-6 items-center justify-center text-ide-emerald" aria-label="Save filename">
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  openFile(file.id);
                  const parentFolder = file.path.includes('/')
                    ? file.path.split('/').slice(0, -1).join('/')
                    : '';
                  setSelectedFolder(parentFolder);
                }}
                className="ide-focus-ring flex min-w-0 flex-1 items-center gap-2 py-1 pr-1 text-left text-[11px]"
              >
                <span className={`w-5 shrink-0 text-center font-mono text-[10px] font-semibold ${fileTypeClass(file.name)}`}>{fileTypeLabel(file.name)}</span>
                <span className="truncate font-mono">{file.name}</span>
                {file.isDirty && <span className="h-1.5 w-1.5 shrink-0 bg-ide-focus" title="Unsaved changes" aria-label="Unsaved changes" />}
              </button>
              <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    setRenamingFileId(file.id);
                    setRenameValue(file.name);
                  }}
                  className="ide-focus-ring flex h-6 w-6 items-center justify-center text-ide-subtle hover:text-ide-text"
                  title="Rename file"
                  aria-label={`Rename ${file.name}`}
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteFile(file.id)}
                  className="ide-focus-ring flex h-6 w-6 items-center justify-center text-ide-subtle hover:text-ide-rose"
                  title="Delete file"
                  aria-label={`Delete ${file.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </>
          )}
        </div>
      );
    });
  };

  const activeFile = files.find((file) => file.id === activeFileId);

  // Search Results computation
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    let pattern: RegExp;
    try {
      if (useRegex) {
        pattern = new RegExp(searchQuery, matchCase ? 'g' : 'gi');
      } else {
        const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const boundary = matchWholeWord ? `\\b${escaped}\\b` : escaped;
        pattern = new RegExp(boundary, matchCase ? 'g' : 'gi');
      }
    } catch {
      return [];
    }

    const matches: {
      file: ProjectFile;
      lineMatches: { lineNum: number; lineText: string }[];
    }[] = [];

    files.forEach((file) => {
      const lines = file.content.split('\n');
      const lineMatches: { lineNum: number; lineText: string }[] = [];

      lines.forEach((lineText, idx) => {
        pattern.lastIndex = 0;
        if (pattern.test(lineText)) {
          lineMatches.push({
            lineNum: idx + 1,
            lineText: lineText.trim(),
          });
        }
      });

      if (lineMatches.length > 0) {
        matches.push({ file, lineMatches });
      }
    });

    return matches;
  }, [searchQuery, matchCase, matchWholeWord, useRegex, files]);

  const totalSearchMatches = searchResults.reduce((acc, curr) => acc + curr.lineMatches.length, 0);

  // Git uncommitted changes
  const unstagedFiles = files.filter(
    (f) => (f.isDirty || f.isModified) && !stagedFileIds.includes(f.id)
  );
  const stagedFiles = files.filter((f) => stagedFileIds.includes(f.id));

  const handleCommit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim() || stagedFileIds.length === 0) return;
    const success = commitStaged(commitMessage.trim());
    if (success) {
      setCommitSuccessMessage(`Committed ${stagedFiles.length} file(s) locally`);
      setCommitMessage('');
      setTimeout(() => setCommitSuccessMessage(null), 3000);
    }
  };

  return (
    <>
      <aside
        className="flex w-64 shrink-0 flex-col border-r border-ide-border bg-ide-sidebar select-none"
        data-purpose="multi-view-sidebar"
      >
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
        <input ref={fileInputRef} type="file" onChange={handleFileInputChange} multiple className="hidden" />

        {/* 1. EXPLORER VIEW */}
        {sidebarView === 'explorer' && (
          <div className="flex h-full flex-col min-h-0">
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-ide-border px-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ide-muted">Explorer</span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    let target = '';
                    if (selectedFolder !== null) {
                      target = selectedFolder;
                    } else if (activeFile && activeFile.path.includes('/')) {
                      target = activeFile.path.split('/').slice(0, -1).join('/');
                    }
                    setTargetFolder(target);
                    setIsCreatingFile(true);
                  }}
                  className="ide-focus-ring flex h-7 w-7 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text"
                  title="New file"
                  aria-label="New file"
                >
                  <FilePlus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const folderName = window.prompt('Enter folder path (e.g. src/utils):');
                    if (folderName) createFile('.gitkeep', folderName, '// folder placeholder');
                  }}
                  className="ide-focus-ring flex h-7 w-7 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text"
                  title="New folder"
                  aria-label="New folder"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  className="ide-focus-ring flex h-7 w-7 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text"
                  title="Open folder"
                  aria-label="Open folder"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={collapseAllFolders}
                  className="ide-focus-ring flex h-7 w-7 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text"
                  title="Collapse all folders"
                  aria-label="Collapse all folders"
                >
                  <ChevronsDownUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={expandAllFolders}
                  className="ide-focus-ring flex h-7 w-7 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text"
                  title="Expand all folders"
                  aria-label="Expand all folders"
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div
              onClick={() => setSelectedFolder('')}
              className={`flex h-9 shrink-0 cursor-pointer items-center gap-1.5 border-b border-ide-border px-3 font-mono text-[11px] ${
                selectedFolder === '' ? 'bg-ide-selected/40 text-ide-strong' : 'text-ide-text hover:bg-ide-hover/50'
              }`}
              title="Project root (click to select root folder)"
            >
              <ChevronDown className="h-3 w-3 text-ide-subtle" aria-hidden="true" />
              <span className="truncate">{masterPrompt.projectName || 'workspace'}</span>
              {selectedFolder === '' && <span className="ml-auto text-[9px] text-ide-focus font-sans">(root)</span>}
            </div>

            {pendingReconnect && (
              <div className="border-b border-ide-amber/30 bg-ide-amber/10 p-2.5 font-sans text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-ide-amber mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ide-strong">Reconnect Folder</div>
                    <div className="mt-0.5 text-[11px] text-ide-muted leading-relaxed">
                      Browser permissions reset on refresh. Click to restore <span className="font-mono text-ide-strong">&ldquo;{pendingReconnect.folderName}&rdquo;</span>.
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => reconnectWorkspace()}
                        className="ide-focus-ring flex items-center gap-1 bg-ide-focus px-2 py-1 text-[11px] font-medium text-white hover:bg-ide-focus/90"
                      >
                        <FolderOpen className="h-3 w-3" />
                        Reconnect
                      </button>
                      <button
                        type="button"
                        onClick={dismissReconnect}
                        className="ide-focus-ring px-2 py-1 text-[11px] text-ide-muted hover:bg-ide-hover hover:text-ide-text"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isRestoringWorkspace && (
              <div className="flex items-center gap-2 border-b border-ide-border bg-ide-surface/50 px-3 py-2 font-mono text-[11px] text-ide-muted">
                <div className="h-2 w-2 rounded-full bg-ide-focus animate-pulse" />
                <span>Restoring workspace...</span>
              </div>
            )}

            {isCreatingFile && (
              <form onSubmit={submitCreateFile} className="border-b border-ide-border bg-ide-surface p-2">
                <label className="mb-1 block font-mono text-[10px] text-ide-focus" htmlFor="new-file-name">
                  New file in {targetFolder ? targetFolder : 'project root'}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="new-file-name"
                    type="text"
                    autoFocus
                    value={newFileName}
                    onChange={(event) => setNewFileName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setIsCreatingFile(false);
                    }}
                    placeholder="e.g. parser.ts or subfolder/file.ts"
                    className="ide-focus-ring min-w-0 flex-1 border border-ide-border-strong bg-ide-code px-2 py-1 font-mono text-[11px] text-ide-strong outline-none placeholder:text-ide-subtle"
                  />
                  <button type="submit" className="ide-focus-ring flex h-7 w-7 items-center justify-center bg-ide-focus text-white" aria-label="Create file">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => setIsCreatingFile(false)} className="ide-focus-ring flex h-7 w-7 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text" aria-label="Cancel create file">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto py-1" role="tree" aria-label="Workspace files">
              {files.length === 0 ? (
                <div className="px-4 py-5 text-center font-mono text-[10px] text-ide-subtle">
                  {isRestoringWorkspace ? 'Restoring files...' : 'No files in workspace'}
                </div>
              ) : (
                renderTree(fileTree)
              )}
            </div>

            {/* Outline & Timeline Bottom Accordions */}
            <div className="shrink-0 border-t border-ide-border">
              <button
                type="button"
                onClick={() => setOutlineOpen((open) => !open)}
                className="ide-focus-ring flex min-h-[30px] w-full items-center gap-1.5 border-b border-ide-border px-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-ide-muted hover:bg-ide-hover hover:text-ide-text"
                aria-expanded={outlineOpen}
              >
                {outlineOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Outline
              </button>
              {outlineOpen && (
                <div className="max-h-36 overflow-y-auto px-3 py-1 font-mono text-[10px] text-ide-muted">
                  {activeFile?.symbols?.length ? (
                    activeFile.symbols.map((symbol) => {
                      const kindBadge =
                        symbol.kind === 'class' ? 'text-ide-amber font-bold'
                        : symbol.kind === 'interface' ? 'text-ide-purple font-bold'
                        : symbol.kind === 'type' ? 'text-ide-purple'
                        : symbol.kind === 'function' ? 'text-ide-cyan font-bold'
                        : 'text-ide-muted';
                      const kindSymbol =
                        symbol.kind === 'class' ? 'C'
                        : symbol.kind === 'interface' ? 'I'
                        : symbol.kind === 'type' ? 'T'
                        : symbol.kind === 'function' ? 'ƒ'
                        : 'v';
                      return (
                        <div
                          key={symbol.id}
                          onClick={() => {
                            setTargetEditorLine(symbol.line);
                          }}
                          className="flex cursor-pointer items-center justify-between py-0.5 hover:text-ide-strong hover:bg-ide-hover/40 px-1 rounded-sm"
                          title={`${symbol.kind} ${symbol.name} (jump to line ${symbol.line})`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`w-3 text-center text-[10px] ${kindBadge}`}>{kindSymbol}</span>
                            <span className="truncate">{symbol.name}</span>
                          </div>
                          <span className="text-[9px] text-ide-subtle font-sans shrink-0 pl-1">:{symbol.line}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-ide-subtle px-1">No symbols found</span>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setTimelineOpen((open) => !open)}
                className="ide-focus-ring flex min-h-[30px] w-full items-center gap-1.5 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-ide-muted hover:bg-ide-hover hover:text-ide-text"
                aria-expanded={timelineOpen}
              >
                {timelineOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Timeline
              </button>
              {timelineOpen && (
                <div className="max-h-36 overflow-y-auto px-3 py-1 font-mono text-[10px] text-ide-subtle space-y-1">
                  {gitCommits.slice(0, 5).map((c) => (
                    <div key={c.hash} className="truncate">
                      <span className="text-ide-focus">{c.hash}</span> <span className="text-ide-text">{c.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. SEARCH VIEW */}
        {sidebarView === 'search' && (
          <div className="flex h-full flex-col min-h-0">
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-ide-border px-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ide-muted">Search</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-ide-subtle hover:text-ide-text"
                title="Clear search"
                aria-label="Clear search"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-2 border-b border-ide-border bg-ide-shell">
              <div className="flex items-center rounded-ide-control border border-ide-border-strong bg-ide-code px-2 py-1 focus-within:border-ide-focus">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search workspace text…"
                  className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-ide-strong outline-none placeholder:text-ide-subtle"
                />
                <div className="flex items-center gap-1 ml-1 text-ide-subtle">
                  <button
                    type="button"
                    onClick={() => setMatchCase(!matchCase)}
                    className={`p-0.5 rounded ${matchCase ? 'bg-ide-focus text-white' : 'hover:text-ide-text'}`}
                    title="Match Case"
                  >
                    <CaseSensitive className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchWholeWord(!matchWholeWord)}
                    className={`p-0.5 rounded ${matchWholeWord ? 'bg-ide-focus text-white' : 'hover:text-ide-text'}`}
                    title="Match Whole Word"
                  >
                    <WholeWord className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseRegex(!useRegex)}
                    className={`p-0.5 rounded ${useRegex ? 'bg-ide-focus text-white' : 'hover:text-ide-text'}`}
                    title="Use Regular Expression"
                  >
                    <Regex className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {searchQuery && (
                <div className="mt-2 text-[10px] text-ide-subtle font-mono">
                  {totalSearchMatches} result{totalSearchMatches === 1 ? '' : 's'} across {searchResults.length} file{searchResults.length === 1 ? '' : 's'}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-1 font-mono text-[11px]">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-ide-subtle font-sans">
                  {searchQuery ? 'No results found.' : 'Type a query to search across all files and symbols.'}
                </div>
              ) : (
                searchResults.map(({ file, lineMatches }) => (
                  <div key={file.id} className="mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        openFile(file.id);
                        setActiveView('editor');
                      }}
                      className="ide-focus-ring flex w-full items-center gap-1.5 px-2 py-1 text-left font-semibold text-ide-text hover:bg-ide-hover/50 rounded-sm"
                    >
                      <span className={`text-[10px] font-bold ${fileTypeClass(file.name)}`}>{fileTypeLabel(file.name)}</span>
                      <span className="truncate">{file.path}</span>
                      <span className="ml-auto text-[10px] text-ide-subtle font-normal">{lineMatches.length}</span>
                    </button>

                    <div className="ml-3 pl-2 border-l border-ide-border/60 space-y-0.5 mt-0.5">
                      {lineMatches.map(({ lineNum, lineText }) => (
                        <button
                          key={lineNum}
                          type="button"
                          onClick={() => {
                            openFile(file.id);
                            setTargetEditorLine(lineNum);
                            setActiveView('editor');
                          }}
                          className="ide-focus-ring flex w-full items-baseline gap-2 px-1.5 py-0.5 text-left text-[10px] text-ide-muted hover:bg-ide-hover hover:text-ide-strong rounded-sm"
                        >
                          <span className="text-ide-subtle font-sans w-6 shrink-0 text-right">{lineNum}:</span>
                          <span className="truncate">{lineText}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. SOURCE CONTROL (GIT) VIEW */}
        {sidebarView === 'git' && (
          <div className="flex h-full flex-col min-h-0">
            {/* Header */}
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-ide-border px-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ide-muted">Source Control</span>
              <div className="flex items-center gap-1 text-[11px] font-mono text-ide-focus">
                <GitBranch className="h-3 w-3" />
                <span className="truncate max-w-[110px]">{gitBranch}</span>
              </div>
            </div>

            {/* Commit Message Box */}
            <form onSubmit={handleCommit} className="p-2 border-b border-ide-border bg-ide-shell">
              <textarea
                rows={2}
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    handleCommit(e);
                  }
                }}
                placeholder="Commit message (Ctrl+Enter to commit)"
                className="ide-focus-ring w-full resize-none rounded-ide-control border border-ide-border-strong bg-ide-code p-1.5 font-mono text-[11px] text-ide-strong outline-none placeholder:text-ide-subtle"
              />
              <button
                type="submit"
                disabled={!commitMessage.trim() || stagedFileIds.length === 0}
                className="ide-focus-ring mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-ide-control bg-ide-focus py-1 text-xs font-semibold text-white hover:bg-ide-focus/90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <Check className="h-3.5 w-3.5" />
                Commit ({stagedFileIds.length} staged)
              </button>
              {commitSuccessMessage && (
                <div className="mt-1 text-[10px] text-ide-emerald font-mono text-center">
                  {commitSuccessMessage}
                </div>
              )}
            </form>

            {/* Staged Changes Accordion */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="border-b border-ide-border">
                <div className="flex items-center justify-between px-3 py-1.5 bg-ide-surface/40 text-[10px] font-semibold text-ide-muted uppercase tracking-wider">
                  <span>Staged Changes ({stagedFiles.length})</span>
                  {stagedFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={unstageAll}
                      className="text-ide-subtle hover:text-ide-text"
                      title="Unstage All Changes"
                      aria-label="Unstage All"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="py-1">
                  {stagedFiles.length === 0 ? (
                    <div className="px-3 py-2 text-[10px] text-ide-subtle font-mono">No staged changes</div>
                  ) : (
                    stagedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="group flex items-center justify-between px-3 py-1 text-[11px] text-ide-text hover:bg-ide-hover/60"
                      >
                        <button
                          type="button"
                          onClick={() => setDiffTargetFileId(file.id)}
                          className="flex min-w-0 items-center gap-1.5 truncate text-left"
                          title={`Click to view diff for ${file.name}`}
                        >
                          <span className="font-mono text-ide-emerald font-bold">M</span>
                          <span className="truncate font-mono">{file.name}</span>
                          <span className="truncate text-[10px] text-ide-subtle font-sans">{file.path}</span>
                        </button>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setDiffTargetFileId(file.id)}
                            className="p-1 text-ide-subtle hover:text-ide-text"
                            title="Open Diff"
                          >
                            <Diff className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => unstageFile(file.id)}
                            className="p-1 text-ide-subtle hover:text-ide-text"
                            title="Unstage changes"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Changes (Unstaged) Accordion */}
              <div className="border-b border-ide-border">
                <div className="flex items-center justify-between px-3 py-1.5 bg-ide-surface/40 text-[10px] font-semibold text-ide-muted uppercase tracking-wider">
                  <span>Changes ({unstagedFiles.length})</span>
                  {unstagedFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={stageAll}
                      className="text-ide-subtle hover:text-ide-text"
                      title="Stage All Changes"
                      aria-label="Stage All"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="py-1">
                  {unstagedFiles.length === 0 ? (
                    <div className="px-3 py-2 text-[10px] text-ide-subtle font-mono">Working tree clean</div>
                  ) : (
                    unstagedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="group flex items-center justify-between px-3 py-1 text-[11px] text-ide-text hover:bg-ide-hover/60"
                      >
                        <button
                          type="button"
                          onClick={() => setDiffTargetFileId(file.id)}
                          className="flex min-w-0 items-center gap-1.5 truncate text-left"
                          title={`Click to view diff for ${file.name}`}
                        >
                          <span className="font-mono text-ide-amber font-bold">M</span>
                          <span className="truncate font-mono">{file.name}</span>
                          <span className="truncate text-[10px] text-ide-subtle font-sans">{file.path}</span>
                        </button>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setDiffTargetFileId(file.id)}
                            className="p-1 text-ide-subtle hover:text-ide-text"
                            title="Open Diff"
                          >
                            <Diff className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => stageFile(file.id)}
                            className="p-1 text-ide-subtle hover:text-ide-text"
                            title="Stage changes"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Discard changes in ${file.name}?`)) {
                                discardChanges(file.id);
                              }
                            }}
                            className="p-1 text-ide-subtle hover:text-ide-rose"
                            title="Discard changes"
                          >
                            <Undo2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Commits List */}
              <div className="p-2">
                <div className="px-1 py-1 text-[10px] font-semibold text-ide-muted uppercase tracking-wider">
                  Recent Commits ({gitCommits.length})
                </div>
                <div className="mt-1 space-y-1">
                  {gitCommits.map((c) => (
                    <div
                      key={c.hash}
                      className="p-2 rounded-sm border border-ide-border bg-ide-panel/60 text-xs font-mono space-y-1 hover:border-ide-border-strong transition-colors"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-ide-focus font-bold">{c.hash}</span>
                        <span className="text-ide-subtle">{c.time}</span>
                      </div>
                      <div className="text-ide-text truncate font-sans text-[11px]">{c.message}</div>
                      <div className="text-[10px] text-ide-subtle">{c.author}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. SETTINGS VIEW */}
        {sidebarView === 'settings' && (
          <div className="flex h-full flex-col min-h-0">
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-ide-border px-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ide-muted">Settings</span>
              <button
                type="button"
                onClick={() =>
                  updateEditorSettings({
                    fontSize: 12,
                    tabSize: 2,
                    wordWrap: false,
                    showMinimap: true,
                    lineNumbers: true,
                  })
                }
                className="text-[10px] text-ide-subtle hover:text-ide-text font-mono"
                title="Reset to defaults"
              >
                Reset
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-5 text-xs font-sans">
              {/* Display Preferences */}
              <div>
                <h3 className="font-semibold text-ide-strong text-[11px] uppercase tracking-wider mb-2.5">
                  Editor Display
                </h3>

                <div className="space-y-3 font-mono text-[11px]">
                  {/* Font Size */}
                  <div>
                    <div className="flex justify-between text-ide-text mb-1">
                      <span>Font Size</span>
                      <span className="text-ide-focus">{editorSettings.fontSize}px</span>
                    </div>
                    <div className="flex gap-1">
                      {[11, 12, 13, 14, 16].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => updateEditorSettings({ fontSize: size })}
                          className={`flex-1 py-1 rounded-sm border text-[10px] ${
                            editorSettings.fontSize === size
                              ? 'border-ide-focus bg-ide-selected text-ide-strong font-bold'
                              : 'border-ide-border text-ide-muted hover:bg-ide-hover'
                          }`}
                        >
                          {size}px
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tab Size */}
                  <div>
                    <div className="flex justify-between text-ide-text mb-1">
                      <span>Tab Size</span>
                      <span className="text-ide-focus">{editorSettings.tabSize} spaces</span>
                    </div>
                    <div className="flex gap-1">
                      {[2, 4, 8].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => updateEditorSettings({ tabSize: size })}
                          className={`flex-1 py-1 rounded-sm border text-[10px] ${
                            editorSettings.tabSize === size
                              ? 'border-ide-focus bg-ide-selected text-ide-strong font-bold'
                              : 'border-ide-border text-ide-muted hover:bg-ide-hover'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Word Wrap Toggle */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-ide-text">Word Wrap</span>
                    <button
                      type="button"
                      onClick={() => updateEditorSettings({ wordWrap: !editorSettings.wordWrap })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        editorSettings.wordWrap
                          ? 'bg-ide-focus text-white'
                          : 'bg-ide-surface text-ide-subtle border border-ide-border'
                      }`}
                    >
                      {editorSettings.wordWrap ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Minimap Toggle */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-ide-text">Minimap</span>
                    <button
                      type="button"
                      onClick={() => updateEditorSettings({ showMinimap: !editorSettings.showMinimap })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        editorSettings.showMinimap
                          ? 'bg-ide-focus text-white'
                          : 'bg-ide-surface text-ide-subtle border border-ide-border'
                      }`}
                    >
                      {editorSettings.showMinimap ? 'SHOW' : 'HIDE'}
                    </button>
                  </div>

                  {/* Line Numbers Toggle */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-ide-text">Line Numbers</span>
                    <button
                      type="button"
                      onClick={() => updateEditorSettings({ lineNumbers: !editorSettings.lineNumbers })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        editorSettings.lineNumbers
                          ? 'bg-ide-focus text-white'
                          : 'bg-ide-surface text-ide-subtle border border-ide-border'
                      }`}
                    >
                      {editorSettings.lineNumbers ? 'SHOW' : 'HIDE'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Workspace & Storage Info */}
              <div className="border-t border-ide-border pt-3">
                <h3 className="font-semibold text-ide-strong text-[11px] uppercase tracking-wider mb-2">
                  Workspace Environment
                </h3>
                <div className="space-y-1.5 font-mono text-[10px] text-ide-muted bg-ide-shell p-2.5 rounded border border-ide-border">
                  <div className="flex justify-between">
                    <span>Project:</span>
                    <span className="text-ide-strong truncate max-w-[120px]">{masterPrompt.projectName || 'workspace'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Branch:</span>
                    <span className="text-ide-cyan">{gitBranch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Files:</span>
                    <span className="text-ide-text">{files.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AST Engine:</span>
                    <span className="text-ide-emerald">Synchronized</span>
                  </div>
                </div>
              </div>

              {/* External Services (Honest Status) */}
              <div className="border-t border-ide-border pt-3">
                <h3 className="font-semibold text-ide-strong text-[11px] uppercase tracking-wider mb-2">
                  External Integrations
                </h3>
                <p className="text-[11px] text-ide-subtle leading-relaxed mb-2">
                  Remote GitHub and database services are unconfigured. IntelliCode operates safely in self-contained local workspace mode.
                </p>
                <div className="space-y-1 font-mono text-[10px]">
                  <div className="flex justify-between text-ide-muted">
                    <span>GitHub Remote:</span>
                    <span className="text-ide-amber">Offline / Local</span>
                  </div>
                  <div className="flex justify-between text-ide-muted">
                    <span>Database Tunnel:</span>
                    <span className="text-ide-subtle">Disconnected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Git Diff Modal Viewer */}
      {diffTargetFileId && (
        <GitDiffModal
          fileId={diffTargetFileId}
          onClose={() => setDiffTargetFileId(null)}
        />
      )}
    </>
  );
};
