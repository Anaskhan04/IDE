import React, { useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Edit2,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import type { ProjectFile } from '../../types/ide';

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
    files,
    activeFileId,
    openFile,
    createFile,
    deleteFile,
    renameFile,
    loadExternalFiles,
    masterPrompt,
  } = useIDE();

  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [targetFolder, setTargetFolder] = useState('');
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileTree: FileTreeNode = { name: 'root', fullPath: '', isFolder: true, children: {} };

  files.forEach((file) => {
    const parts = file.path.split('/');
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

  const submitCreateFile = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newFileName.trim()) {
      setIsCreatingFile(false);
      return;
    }
    createFile(newFileName, targetFolder);
    setNewFileName('');
    setIsCreatingFile(false);
  };

  const submitRename = (fileId: string) => {
    if (renameValue.trim()) renameFile(fileId, renameValue);
    setRenamingFileId(null);
  };

  const handleSelectFolder = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        // @ts-ignore File System Access API is not available in all lib.dom versions.
        const directoryHandle = await window.showDirectoryPicker();
        const loadedFiles: ProjectFile[] = [];

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

    const loadedFiles: ProjectFile[] = [];
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
        return (
          <div key={child.fullPath} role="treeitem" aria-expanded={!isCollapsed}>
            <div className="group flex min-h-[26px] items-center border-l border-transparent hover:bg-ide-hover/60" style={{ paddingLeft: `${8 + depth * 12}px` }}>
              <button
                type="button"
                onClick={() => toggleFolder(child.fullPath)}
                className="ide-focus-ring flex min-w-0 flex-1 items-center gap-1.5 py-1 pr-2 text-left text-[11px] text-ide-text"
              >
                {isCollapsed ? <ChevronRight className="h-3 w-3 shrink-0 text-ide-subtle" /> : <ChevronDown className="h-3 w-3 shrink-0 text-ide-subtle" />}
                <Folder className="h-3.5 w-3.5 shrink-0 text-ide-focus" aria-hidden="true" />
                <span className="truncate">{child.name}</span>
              </button>
              <button
                type="button"
                onClick={() => {
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
      const isActive = file.id === activeFileId;
      const isRenaming = renamingFileId === file.id;

      return (
        <div
          key={file.id}
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
                onClick={() => openFile(file.id)}
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
                  onClick={() => {
                    if (window.confirm(`Delete ${file.name}?`)) deleteFile(file.id);
                  }}
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

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-ide-border bg-ide-sidebar" data-purpose="explorer-sidebar">
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

      <div className="flex h-10 shrink-0 items-center justify-between border-b border-ide-border px-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ide-muted">Explorer</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setTargetFolder('src');
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
          <button type="button" disabled className="flex h-7 w-7 cursor-not-allowed items-center justify-center text-ide-subtle/50" title="More actions are not available" aria-label="More actions are not available">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-ide-border px-3 font-mono text-[11px] text-ide-text">
        <ChevronDown className="h-3 w-3 text-ide-subtle" aria-hidden="true" />
        <span className="truncate">{masterPrompt.projectName || 'workspace'}</span>
      </div>

      {isCreatingFile && (
        <form onSubmit={submitCreateFile} className="border-b border-ide-border bg-ide-surface p-2">
          <label className="mb-1 block font-mono text-[10px] text-ide-focus" htmlFor="new-file-name">
            New file in {targetFolder || 'workspace'}
          </label>
          <div className="flex items-center gap-1">
            <input
              id="new-file-name"
              type="text"
              autoFocus
              value={newFileName}
              onChange={(event) => setNewFileName(event.target.value)}
              placeholder="e.g. parser.ts"
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
            No files in workspace
          </div>
        ) : (
          renderTree(fileTree)
        )}
      </div>

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
          <div className="max-h-28 overflow-y-auto px-4 py-2 font-mono text-[10px] text-ide-muted">
            {activeFile?.symbols?.length ? activeFile.symbols.map((symbol) => <div key={symbol.id} className="py-0.5">ƒ {symbol.name}</div>) : <span className="text-ide-subtle">No symbols found</span>}
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
        {timelineOpen && <div className="px-4 py-2 font-mono text-[10px] text-ide-subtle">No local git history recorded yet</div>}
      </div>
    </aside>
  );
};
