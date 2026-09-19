import React, { useState, useRef } from 'react';
import { useIDE } from '../../context/IDEContext';
import { ProjectFile } from '../../types/ide';
import { 
  FolderTree, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Hash, 
  Flame, 
  FilePlus, 
  FolderPlus, 
  FolderOpen, 
  Upload, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Folder,
  Code2,
  Minimize2,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface FileTreeNode {
  name: string;
  fullPath: string;
  isFolder: boolean;
  file?: ProjectFile;
  children: Record<string, FileTreeNode>;
}

export const Sidebar: React.FC = () => {
  const { 
    files, 
    activeFileId, 
    openFile, 
    createFile, 
    deleteFile, 
    renameFile, 
    loadExternalFiles,
    ciaResult, 
    setActiveView,
    rebuildAST
  } = useIDE();

  const [sidebarTab, setSidebarTab] = useState<'files' | 'symbols' | 'impact'>('files');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  
  // New File / Folder input states
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [targetFolder, setTargetFolder] = useState('');
  
  // Renaming state
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFile = files.find(f => f.id === activeFileId);

  // Build hierarchical folder tree from flat file list
  const fileTree: FileTreeNode = { name: 'root', fullPath: '', isFolder: true, children: {} };

  files.forEach(file => {
    const parts = file.path.split('/');
    let current = fileTree;

    parts.forEach((part, idx) => {
      const isLast = idx === parts.length - 1;
      const currentPath = parts.slice(0, idx + 1).join('/');

      if (isLast) {
        current.children[part] = {
          name: part,
          fullPath: currentPath,
          isFolder: false,
          file,
          children: {}
        };
      } else {
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            fullPath: currentPath,
            isFolder: true,
            children: {}
          };
        }
        current = current.children[part];
      }
    });
  });

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) {
      setIsCreatingFile(false);
      return;
    }
    createFile(newFileName, targetFolder);
    setNewFileName('');
    setIsCreatingFile(false);
    setActiveView('editor');
  };

  const handleRenameSubmit = (fileId: string) => {
    if (renameValue.trim()) {
      renameFile(fileId, renameValue);
    }
    setRenamingFileId(null);
  };

  // Open Folder from Disk (using HTML webkitdirectory or File System Access API)
  const handleSelectFolder = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();
        const loadedFiles: ProjectFile[] = [];

        // Recursive reader for FileSystemDirectoryHandle
        async function readDir(handle: any, currentPath: string) {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              // Read text content for code files
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
          setActiveView('editor');
        }
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User cancelled
      }
    }

    // Fallback: trigger hidden input
    folderInputRef.current?.click();
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const loadedFiles: ProjectFile[] = [];
    let folderName = 'Imported Project';

    Array.from(fileList).forEach(file => {
      const relPath = file.webkitRelativePath || file.name;
      const parts = relPath.split('/');
      if (parts.length > 1) folderName = parts[0];

      // Exclude heavy node_modules / git
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
          setActiveView('editor');
        }
      };
      reader.readAsText(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    Array.from(fileList).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        createFile(file.name, 'src', String(reader.result || ''));
        setActiveView('editor');
      };
      reader.readAsText(file);
    });
  };

  // Recursive tree renderer
  const renderTree = (node: FileTreeNode, depth = 0) => {
    const sortedKeys = Object.keys(node.children).sort((a, b) => {
      const aIsFolder = node.children[a].isFolder;
      const bIsFolder = node.children[b].isFolder;
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      return a.localeCompare(b);
    });

    return sortedKeys.map(key => {
      const child = node.children[key];

      if (child.isFolder) {
        const isCollapsed = collapsedFolders.has(child.fullPath);
        return (
          <div key={child.fullPath} className="select-none">
            <div
              onClick={() => toggleFolder(child.fullPath)}
              className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-ide-hover/60 cursor-pointer text-xs font-mono text-slate-300 group"
              style={{ paddingLeft: `${depth * 12 + 6}px` }}
            >
              <div className="flex items-center gap-1.5 truncate">
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                <Folder className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate text-slate-200">{child.name}</span>
              </div>

              {/* Quick action: Add file inside this folder */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTargetFolder(child.fullPath);
                  setIsCreatingFile(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-opacity"
                title={`New file in ${child.name}`}
              >
                <FilePlus className="w-3 h-3" />
              </button>
            </div>

            {!isCollapsed && renderTree(child, depth + 1)}
          </div>
        );
      }

      // File item
      const file = child.file!;
      const isActive = file.id === activeFileId;
      const isTargetModified = file.impactLevel === 'modified';
      const isDirectImpact = file.impactLevel === 'direct';
      const isTest = file.name.includes('test') || file.path.includes('test');
      const isRenaming = renamingFileId === file.id;

      return (
        <div
          key={file.id}
          onClick={() => openFile(file.id)}
          className={`flex items-center justify-between py-1 px-1.5 rounded text-xs font-mono cursor-pointer transition-colors group ${
            isActive
              ? 'bg-cyan-500/15 text-cyan-300 border-l-2 border-cyan-400'
              : 'text-slate-300 hover:bg-ide-hover/60 hover:text-white'
          }`}
          style={{ paddingLeft: `${depth * 12 + 18}px` }}
        >
          {isRenaming ? (
            <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit(file.id);
                  if (e.key === 'Escape') setRenamingFileId(null);
                }}
                className="bg-code px-1.5 py-0.5 rounded border border-cyan-500 text-xs text-white w-full font-mono focus:outline-none"
              />
              <button onClick={() => handleRenameSubmit(file.id)} className="text-emerald-400 p-0.5">
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 truncate">
                <FileCode
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isTest ? 'text-emerald-400' :
                    file.name.endsWith('.c') || file.name.endsWith('.h') ? 'text-blue-400' :
                    file.name.endsWith('.tsx') || file.name.endsWith('.jsx') ? 'text-cyan-400' :
                    isTargetModified ? 'text-rose-400' :
                    isDirectImpact ? 'text-amber-400' :
                    'text-slate-400'
                  }`}
                />
                <span className="truncate">{file.name}</span>
                {file.isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Unsaved changes" />
                )}
              </div>

              {/* Action buttons on hover */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingFileId(file.id);
                    setRenameValue(file.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-opacity"
                  title="Rename"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${file.name}?`)) deleteFile(file.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-opacity"
                  title="Delete File"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </>
          )}
        </div>
      );
    });
  };

  return (
    <aside className="w-64 bg-ide-sidebar border-r border-ide-border flex flex-col h-[calc(100vh-3.5rem-1.75rem)] select-none">
      {/* Hidden file / folder inputs */}
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
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        className="hidden"
      />

      {/* Sidebar Header Tabs */}
      <div className="flex border-b border-ide-border bg-ide-panel/50 p-1 gap-1 text-xs">
        <button
          onClick={() => setSidebarTab('files')}
          className={`flex-1 py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
            sidebarTab === 'files'
              ? 'bg-ide-card text-cyan-400 shadow-sm border border-ide-border'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Explorer</span>
        </button>
        <button
          onClick={() => setSidebarTab('symbols')}
          className={`flex-1 py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
            sidebarTab === 'symbols'
              ? 'bg-ide-card text-cyan-400 shadow-sm border border-ide-border'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          <span>AST</span>
        </button>
        <button
          onClick={() => setSidebarTab('impact')}
          className={`py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
            sidebarTab === 'impact'
              ? 'bg-ide-card text-amber-400 shadow-sm border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Change Impact Quick Radar"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>

      {/* VS Code / Antigravity Explorer Action Toolbar */}
      {sidebarTab === 'files' && (
        <div className="p-2 border-b border-ide-border bg-ide-panel/30 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
            Files ({files.length})
          </span>

          <div className="flex items-center gap-1">
            {/* New File */}
            <button
              onClick={() => {
                setTargetFolder('src');
                setIsCreatingFile(true);
              }}
              className="p-1 rounded hover:bg-ide-hover text-slate-400 hover:text-cyan-400 transition-colors"
              title="New File"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>

            {/* New Folder */}
            <button
              onClick={() => {
                const folderName = prompt('Enter folder path (e.g. src/utils):');
                if (folderName) {
                  createFile('.gitkeep', folderName, '// folder placeholder');
                }
              }}
              className="p-1 rounded hover:bg-ide-hover text-slate-400 hover:text-cyan-400 transition-colors"
              title="New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>

            {/* Open Local Folder */}
            <button
              onClick={handleSelectFolder}
              className="p-1 rounded hover:bg-ide-hover text-slate-400 hover:text-cyan-400 transition-colors"
              title="Open Folder from Computer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>

            {/* Open Single File */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded hover:bg-ide-hover text-slate-400 hover:text-cyan-400 transition-colors"
              title="Open File from Computer"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>

            {/* Collapse All */}
            <button
              onClick={() => {
                if (collapsedFolders.size > 0) setCollapsedFolders(new Set());
                else {
                  const allFolderPaths = files.map(f => f.path.substring(0, f.path.lastIndexOf('/'))).filter(Boolean);
                  setCollapsedFolders(new Set(allFolderPaths));
                }
              }}
              className="p-1 rounded hover:bg-ide-hover text-slate-400 hover:text-white transition-colors"
              title="Collapse / Expand All"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Inline Create File Box */}
      {isCreatingFile && (
        <form onSubmit={handleCreateFileSubmit} className="p-2 border-b border-ide-border bg-ide-panel">
          <div className="text-[10px] text-cyan-400 font-mono mb-1">
            New File in <span className="text-white">{targetFolder || 'root'}</span>:
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              placeholder="e.g. authMiddleware.ts"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full bg-code p-1.5 rounded border border-cyan-500/80 text-xs font-mono text-white focus:outline-none"
            />
            <button type="submit" className="p-1 rounded bg-cyan-600 text-white">
              <Check className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => setIsCreatingFile(false)} className="p-1 rounded hover:bg-slate-700 text-slate-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        </form>
      )}

      {/* Main Sidebar Contents */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {sidebarTab === 'files' && (
          <div>
            {renderTree(fileTree)}
          </div>
        )}

        {sidebarTab === 'symbols' && (
          <div className="space-y-2 p-1">
            <div className="px-1 py-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                AST Outline: {activeFile?.name}
              </span>
            </div>

            {activeFile?.symbols && activeFile.symbols.length > 0 ? (
              <div className="space-y-1">
                {activeFile.symbols.map((sym) => (
                  <div
                    key={sym.id}
                    className="p-2 rounded bg-ide-card/50 border border-ide-border hover:border-slate-700 transition-colors text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
                        <Code2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{sym.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">L:{sym.line}</span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-[10px]">
                      <span className="px-1.5 py-0.2 bg-slate-800 rounded uppercase text-slate-300">
                        {sym.kind}
                      </span>
                      {sym.exported && (
                        <span className="text-emerald-400">exported</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 font-mono">
                No AST symbols found for this file.
              </div>
            )}
          </div>
        )}

        {sidebarTab === 'impact' && (
          <div className="space-y-3 p-1">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <div className="flex items-center gap-2 font-semibold text-xs mb-1 font-mono">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Active Blast Radius</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Target: <code className="text-amber-200">{ciaResult.targetName}</code>
              </p>
              <div className="mt-2 flex items-center justify-between font-mono text-xs pt-2 border-t border-amber-500/20">
                <span className="text-slate-400">Risk Score:</span>
                <span className="font-bold text-amber-400">{ciaResult.blastRadiusScore} / 100</span>
              </div>
            </div>

            <button
              onClick={() => setActiveView('cia')}
              className="w-full py-1.5 px-3 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium text-center transition-colors"
            >
              Open Full CIA Studio →
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Footer: Quick Open Folder Button */}
      <div className="p-2 border-t border-ide-border bg-ide-panel/60">
        <button
          onClick={handleSelectFolder}
          className="w-full py-1.5 px-2.5 rounded-lg bg-ide-card hover:bg-ide-hover border border-ide-border text-slate-300 hover:text-white text-xs font-mono flex items-center justify-center gap-2 transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Open Local Folder</span>
        </button>
      </div>
    </aside>
  );
};
