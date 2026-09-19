import React, { useState, useRef } from 'react';
import { useIDE } from '../../context/IDEContext';
import { ProjectFile } from '../../types/ide';
import { 
  FilePlus, 
  FolderPlus, 
  FolderOpen, 
  Upload, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Minimize2
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
    masterPrompt
  } = useIDE();

  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  
  // New File / Folder input states
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [targetFolder, setTargetFolder] = useState('');
  
  // Renaming state
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const loadedFiles: ProjectFile[] = [];
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    Array.from(fileList).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        createFile(file.name, 'src', String(reader.result || ''));
      };
      reader.readAsText(file);
    });
  };

  // Helper to determine file icon style
  const renderFileIcon = (fileName: string) => {
    if (fileName === 'main.c') {
      return <span className="text-purple-400 font-bold text-xs font-mono">C</span>;
    }
    if (fileName.endsWith('.c') || fileName.endsWith('.h')) {
      return <span className="text-blue-400 font-bold text-xs font-mono">C</span>;
    }
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx') || fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      return <span className="text-cyan-400 font-bold text-xs font-mono">TS</span>;
    }
    if (fileName.endsWith('.json')) {
      return <span className="text-amber-400 font-bold text-xs font-mono">{'{}'}</span>;
    }
    return <span className="text-slate-400 font-bold text-xs font-mono">#</span>;
  };

  // Recursive tree renderer matching Stitch layout
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
          <div key={child.fullPath} className={depth > 0 ? 'ml-3' : ''}>
            <div
              onClick={() => toggleFolder(child.fullPath)}
              className="flex items-center justify-between gap-1.5 px-4 py-1 hover:bg-[#121927] cursor-pointer text-slate-300 group"
            >
              <div className="flex items-center gap-1.5 truncate">
                <svg
                  className={`w-3 h-3 text-slate-400 transform transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
                <span className={depth === 0 ? 'font-medium' : ''}>{child.name}</span>
              </div>

              {/* Quick action: Add file inside folder */}
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
      const isRenaming = renamingFileId === file.id;

      return (
        <div
          key={file.id}
          onClick={() => openFile(file.id)}
          className={`flex items-center justify-between gap-2 pr-3 py-1 cursor-pointer transition-colors group ${
            depth === 0 ? 'pl-6' : 'pl-9'
          } ${
            isActive
              ? 'bg-[#192338] text-white border-l-2 border-blue-500 font-medium'
              : 'hover:bg-[#121927] text-slate-400 hover:text-slate-200'
          }`}
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
                className="bg-[#0b0f19] px-1.5 py-0.5 rounded border border-blue-500 text-xs text-white w-full font-mono focus:outline-none"
              />
              <button onClick={() => handleRenameSubmit(file.id)} className="text-emerald-400 p-0.5">
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 truncate">
                {renderFileIcon(file.name)}
                <span className="truncate">{file.name}</span>
                {file.isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="Unsaved changes" />
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
    <section className="w-60 bg-[#0a0e18] border-r border-[#161d2c] flex flex-col select-none shrink-0" data-purpose="explorer-sidebar">
      {/* Hidden file / folder inputs for user upload/disk access */}
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

      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-400 border-b border-[#141b29]">
        <span>EXPLORER</span>
        <div className="flex items-center gap-1">
          {/* New File */}
          <button
            onClick={() => {
              setTargetFolder('src');
              setIsCreatingFile(true);
            }}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-[#141b28] transition-colors"
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
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-[#141b28] transition-colors"
            title="New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>

          {/* Open Folder */}
          <button
            onClick={handleSelectFolder}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-[#141b28] transition-colors"
            title="Open Folder"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>

          {/* 3-dots button */}
          <button
            onClick={() => {}}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-[#141b28] transition-colors"
            title="More Actions"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="1.5"></circle>
              <circle cx="19" cy="12" r="1.5"></circle>
              <circle cx="5" cy="12" r="1.5"></circle>
            </svg>
          </button>
        </div>
      </div>

      {/* Root Folder Section */}
      <div 
        onClick={() => {
          // Toggle root collapse
          const allFolderPaths = files.map(f => f.path.substring(0, f.path.lastIndexOf('/'))).filter(Boolean);
          if (collapsedFolders.size > 0) setCollapsedFolders(new Set());
          else setCollapsedFolders(new Set(allFolderPaths));
        }}
        className="px-2 py-1.5 flex items-center gap-1.5 text-xs text-slate-300 font-medium cursor-pointer hover:bg-[#111726] transition-colors"
      >
        <svg className="w-3 h-3 text-slate-400 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
        <span className="truncate">{masterPrompt.projectName || 'DeusData / codebase-mem...'}</span>
      </div>

      {/* Inline Create File Box */}
      {isCreatingFile && (
        <form onSubmit={handleCreateFileSubmit} className="p-2 border-b border-[#161d2c] bg-[#111726]">
          <div className="text-[10px] text-blue-400 font-mono mb-1">
            New File in <span className="text-white">{targetFolder || 'root'}</span>:
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              placeholder="e.g. parser.c"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full bg-[#080c14] p-1.5 rounded border border-blue-500 text-xs font-mono text-white focus:outline-none"
            />
            <button type="submit" className="p-1 rounded bg-blue-600 text-white">
              <Check className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => setIsCreatingFile(false)} className="p-1 rounded hover:bg-slate-700 text-slate-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        </form>
      )}

      {/* File Tree Structure */}
      <div className="flex-1 overflow-y-auto py-1 text-xs">
        {files.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs flex flex-col items-center gap-3 select-none">
            <p className="text-slate-400">No files in workspace</p>
            <div className="flex flex-col gap-2 w-full pt-1">
              <button
                onClick={() => {
                  setTargetFolder('src');
                  setIsCreatingFile(true);
                }}
                className="w-full py-1.5 px-2 rounded bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>New File</span>
              </button>
              <button
                onClick={handleSelectFolder}
                className="w-full py-1.5 px-2 rounded bg-[#162035] hover:bg-[#1d2b47] text-slate-300 border border-[#233354] text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Open Folder</span>
              </button>
            </div>
          </div>
        ) : (
          renderTree(fileTree)
        )}
      </div>

      {/* Collapsible Sections at Bottom of Sidebar */}
      <div className="border-t border-[#161d2c] shrink-0">
        <div 
          onClick={() => setOutlineOpen(!outlineOpen)}
          className="px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 tracking-wider hover:text-slate-200 cursor-pointer"
        >
          <svg 
            className={`w-3 h-3 text-slate-500 transform transition-transform ${outlineOpen ? 'rotate-90' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
          <span>OUTLINE</span>
        </div>
        {outlineOpen && (
          <div className="px-5 py-2 text-[11px] font-mono text-slate-400 space-y-1 bg-[#090d16]">
            {files.find(f => f.id === activeFileId)?.symbols?.length ? (
              files.find(f => f.id === activeFileId)!.symbols!.map(sym => (
                <div key={sym.id} className="hover:text-blue-300 cursor-pointer">ƒ {sym.name}</div>
              ))
            ) : (
              <div className="text-slate-500">No symbols found</div>
            )}
          </div>
        )}

        <div 
          onClick={() => setTimelineOpen(!timelineOpen)}
          className="px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 tracking-wider hover:text-slate-200 cursor-pointer border-t border-[#141b28]"
        >
          <svg 
            className={`w-3 h-3 text-slate-500 transform transition-transform ${timelineOpen ? 'rotate-90' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
          <span>TIMELINE</span>
        </div>
        {timelineOpen && (
          <div className="px-5 py-2 text-[11px] font-mono text-slate-400 space-y-1 bg-[#090d16]">
            <div className="text-slate-500">No local git history recorded yet</div>
          </div>
        )}
      </div>
    </section>
  );
};
