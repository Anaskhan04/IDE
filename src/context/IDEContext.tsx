import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { 
  ActiveView, 
  SidebarView,
  EditorSettings,
  GitCommit,
  GitFileItem,
  GitRepoStatus,
  ProjectFile, 
  GraphNode, 
  GraphEdge, 
  AIModel, 
  ChatMessage, 
  CIAResult, 
  MCPServer, 
  TestSuite, 
  EvaluationExperiment,
  CypherQueryResult,
  TracePathResult,
  WorkspaceDiagnostic,
  DiagnosticsSummary
} from '../types/ide';
import { gitService } from '../utils/gitService';

import { INITIAL_FILES } from '../data/mockProject';
import { INITIAL_GRAPH_NODES, INITIAL_GRAPH_EDGES, DEFAULT_CIA_RESULT, SAMPLE_CYPHER_QUERIES } from '../data/mockGraph';
import { 
  CBM_REPO_FILES, 
  CBM_GRAPH_NODES, 
  CBM_GRAPH_EDGES, 
  CBM_CIA_RESULT, 
  CBM_SAMPLE_CYPHER_QUERIES 
} from '../data/cbmRepoData';
import { AVAILABLE_MODELS } from '../data/mockModels';
import { INITIAL_MCP_SERVERS } from '../data/mockMcpServers';
import { INITIAL_TEST_SUITES } from '../data/mockTests';
import { EVALUATION_EXPERIMENTS } from '../data/mockBenchmarks';
import { INITIAL_MASTER_PROMPT, MasterPromptData } from '../data/mockMasterPrompt';
import { buildGraphFromFiles } from '../utils/astParser';
import { 
  analyzeWorkspaceDiagnostics, 
  getDiagnosticsSummary, 
  getUnsupportedWorkspaceFiles 
} from '../utils/diagnosticsEngine';
import { 
  hasFsAccess, 
  writeFileHandle, 
  downloadFile, 
  readDirectoryRecursive, 
  createFileInDirectory,
  createFileOnDisk,
  renameFileOnDisk,
  deleteFileOnDisk,
  verifyDirectoryPermission
} from '../utils/fsAccess';
import {
  PendingReconnect,
  WorkspaceMeta,
  saveStoredDirectoryHandle,
  getStoredDirectoryHandle,
  clearStoredDirectoryHandle,
  saveWorkspaceMeta,
  getWorkspaceMeta,
  clearWorkspaceMeta
} from '../utils/workspacePersistence';

export type { PendingReconnect } from '../utils/workspacePersistence';

export type ProjectId = 'codebase-memory-mcp' | 'novastore' | 'custom';

interface IDEContextType {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  currentProjectId: ProjectId;
  setCurrentProjectId: (id: ProjectId) => void;
  files: ProjectFile[];
  activeFileId: string;
  openFileIds: string[];
  openFile: (fileId: string) => void;
  closeFile: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  activeModel: AIModel;
  setActiveModel: (model: AIModel) => void;
  masterPrompt: MasterPromptData;
  setMasterPrompt: React.Dispatch<React.SetStateAction<MasterPromptData>>;
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  selectedGraphNode: GraphNode | null;
  setSelectedGraphNode: (node: GraphNode | null) => void;
  ciaResult: CIAResult;
  runChangeImpactAnalysis: (targetId: string) => void;
  mcpServers: MCPServer[];
  toggleMcpTool: (serverId: string, toolName: string) => void;
  toggleMcpServer: (serverId: string) => void;
  testSuites: TestSuite[];
  isExecutingTests: boolean;
  runTests: (suiteIds?: string[]) => Promise<void>;
  experiments: EvaluationExperiment[];
  runExperiment: (expId: string) => Promise<void>;
  chatMessages: ChatMessage[];
  sendChatMessage: (content: string) => Promise<void>;
  isAnalyzingAST: boolean;
  rebuildAST: () => Promise<void>;
  tokensSaved: number;
  isModelSwitchingModalOpen: boolean;
  setIsModelSwitchingModalOpen: (open: boolean) => void;
  isCopilotOpen: boolean;
  setIsCopilotOpen: (open: boolean) => void;
  
  // codebase-memory-mcp features
  cypherResult: CypherQueryResult | null;
  isExecutingCypher: boolean;
  executeCypherQuery: (query: string) => Promise<CypherQueryResult>;
  traceResult: TracePathResult | null;
  isTracingPath: boolean;
  traceCallPath: (symbolName: string, direction: 'inbound' | 'outbound', depth: number) => Promise<TracePathResult>;

  // VS Code / Antigravity File System Operations
  createFile: (name: string, folderPath?: string, content?: string) => Promise<ProjectFile | null>;
  deleteFile: (fileId: string) => Promise<boolean>;
  renameFile: (fileId: string, newName: string) => Promise<boolean>;
  /** Save the file to disk (via File System Access API) if a handle is available,
   *  or trigger a browser download as a fallback. Clears isDirty on success. */
  saveFile: (fileId: string) => Promise<void>;
  /** The last save error message, if any. Cleared by clearSaveError(). */
  saveError: string | null;
  clearSaveError: () => void;
  /** True when the File System Access API with write support is available in this browser. */
  hasFsAccess: boolean;
  loadExternalFiles: (newFiles: ProjectFile[], folderName?: string, dirHandle?: FileSystemDirectoryHandle) => void;
  /** Open a local folder using the File System Access API with handle retention.
   *  Returns true if handled/opened, or false if unsupported / should trigger input fallback. */
  openProjectFolder: () => Promise<boolean>;

  // Workspace restoration & permission handling
  isRestoringWorkspace: boolean;
  pendingReconnect: PendingReconnect | null;
  reconnectWorkspace: () => Promise<boolean>;
  dismissReconnect: () => void;

  // Multi-view Sidebar & Navigation
  sidebarView: SidebarView;
  setSidebarView: (view: SidebarView) => void;
  isSidebarVisible: boolean;
  setIsSidebarVisible: (visible: boolean) => void;
  toggleSidebar: () => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;

  // Git / Local Source Control
  isGitRepo: boolean | null;
  repoRoot: string | null;
  workspacePath: string | null;
  gitBranch: string;
  setGitBranch: (branch: string) => void;
  stagedFileIds: string[];
  stagedFiles: GitFileItem[];
  unstagedFiles: GitFileItem[];
  gitCommits: GitCommit[];
  gitLoading: boolean;
  gitError: string | null;
  stageFile: (filePathOrId: string) => Promise<void>;
  unstageFile: (filePathOrId: string) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageAll: () => Promise<void>;
  discardChanges: (filePathOrId: string) => Promise<void>;
  commitStaged: (message: string) => Promise<boolean>;
  refreshGitStatus: (overrideRepoRoot?: string) => Promise<void>;
  initGitRepo: () => Promise<boolean>;
  diffTargetFileId: string | null;
  setDiffTargetFileId: (fileId: string | null) => void;
  diffTargetFilePath: string | null;
  setDiffTargetFilePath: (path: string | null) => void;
  openWorkspaceByPath: (path: string) => Promise<boolean>;

  // Editor Preferences & Quick Operations
  editorSettings: EditorSettings;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
  targetEditorLine: number | null;
  setTargetEditorLine: (line: number | null) => void;
  saveAllFiles: () => Promise<void>;

  // Explorer Sync from Knowledge Graph / Symbol Navigation
  revealedExplorerFileId: string | null;
  revealFileInExplorer: (fileId: string) => void;

  // Diagnostics & Problems Panel
  diagnostics: WorkspaceDiagnostic[];
  diagnosticsSummary: DiagnosticsSummary;
  unsupportedFiles: { fileId: string; filePath: string; fileName: string; reason: string }[];
  isProblemsPanelOpen: boolean;
  setIsProblemsPanelOpen: (open: boolean) => void;
  toggleProblemsPanel: () => void;
}

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 12,
  tabSize: 2,
  wordWrap: false,
  showMinimap: true,
  lineNumbers: true,
};

const IDEContext = createContext<IDEContextType | undefined>(undefined);

export const IDEProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ActiveView>('editor'); // Default to Code Editor (Knowledge Graph disabled)
  const [currentProjectId, setCurrentProjectIdState] = useState<ProjectId>('codebase-memory-mcp');
  
  // Multi-view sidebar & visibility
  const [sidebarView, setSidebarView] = useState<SidebarView>('explorer');
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const toggleSidebar = () => setIsSidebarVisible(prev => !prev);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Real Git state (Requirement 2 & 3: Never hardcode repository commits or branch)
  const [isGitRepo, setIsGitRepo] = useState<boolean | null>(null);
  const [repoRoot, setRepoRoot] = useState<string | null>(null);
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [gitBranch, setGitBranch] = useState<string>('');
  const [stagedFiles, setStagedFiles] = useState<GitFileItem[]>([]);
  const [unstagedFiles, setUnstagedFiles] = useState<GitFileItem[]>([]);
  const [stagedFileIds, setStagedFileIds] = useState<string[]>([]);
  const [gitCommits, setGitCommits] = useState<GitCommit[]>([]);
  const [gitLoading, setGitLoading] = useState<boolean>(false);
  const [gitError, setGitError] = useState<string | null>(null);
  const [diffTargetFileId, setDiffTargetFileId] = useState<string | null>(null);
  const [diffTargetFilePath, setDiffTargetFilePath] = useState<string | null>(null);


  // Editor settings & navigation
  const [targetEditorLine, setTargetEditorLine] = useState<number | null>(null);
  const [revealedExplorerFileId, setRevealedExplorerFileId] = useState<string | null>(null);

  const revealFileInExplorer = (fileId: string) => {
    setRevealedExplorerFileId(fileId);
    setActiveFileId(fileId);
    setSidebarView('explorer');
    setIsSidebarVisible(true);
  };

  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => {
    try {
      const stored = localStorage.getItem('intellicode_editor_settings');
      if (stored) {
        return { ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_EDITOR_SETTINGS;
  });

  const updateEditorSettings = (partial: Partial<EditorSettings>) => {
    setEditorSettings(prev => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem('intellicode_editor_settings', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  // Workspace starts clean and empty!
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);
  const [activeModel, setActiveModel] = useState<AIModel>(AVAILABLE_MODELS[0]);
  const [masterPrompt, setMasterPrompt] = useState<MasterPromptData>({
    ...INITIAL_MASTER_PROMPT,
    projectName: 'workspace',
    version: 'v0.24',
    astVersion: 'AST-IDLE',
    requirements: 'Clean workspace.'
  });
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(null);
  const [ciaResult, setCiaResult] = useState<CIAResult>(CBM_CIA_RESULT);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>(INITIAL_MCP_SERVERS);
  const [testSuites, setTestSuites] = useState<TestSuite[]>(INITIAL_TEST_SUITES);
  const [isExecutingTests, setIsExecutingTests] = useState<boolean>(false);
  const [experiments, setExperiments] = useState<EvaluationExperiment[]>(EVALUATION_EXPERIMENTS);
  const [isAnalyzingAST, setIsAnalyzingAST] = useState<boolean>(false);
  const [tokensSaved, setTokensSaved] = useState<number>(0);
  const [isModelSwitchingModalOpen, setIsModelSwitchingModalOpen] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);

  const [cypherResult, setCypherResult] = useState<CypherQueryResult | null>(null);
  const [isExecutingCypher, setIsExecutingCypher] = useState(false);
  const [traceResult, setTraceResult] = useState<TracePathResult | null>(null);
  const [isTracingPath, setIsTracingPath] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [isRestoringWorkspace, setIsRestoringWorkspace] = useState<boolean>(false);
  const [pendingReconnect, setPendingReconnect] = useState<PendingReconnect | null>(null);
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const clearSaveError = () => setSaveError(null);

  // Diagnostics & Problems Panel
  const [diagnostics, setDiagnostics] = useState<WorkspaceDiagnostic[]>([]);
  const [isProblemsPanelOpen, setIsProblemsPanelOpen] = useState<boolean>(false);
  const toggleProblemsPanel = () => setIsProblemsPanelOpen((prev) => !prev);

  const diagnosticsSummary = React.useMemo(() => {
    return getDiagnosticsSummary(diagnostics, files);
  }, [diagnostics, files]);

  const unsupportedFiles = React.useMemo(() => {
    return getUnsupportedWorkspaceFiles(files);
  }, [files]);

  // Debounced diagnostic computation when workspace files change (Requirement 5)
  useEffect(() => {
    if (files.length === 0) {
      setDiagnostics([]);
      return;
    }

    const timer = setTimeout(() => {
      try {
        const diags = analyzeWorkspaceDiagnostics(files);
        setDiagnostics(diags);
      } catch (err) {
        console.warn('Diagnostics analysis failed:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [files]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      model: 'Claude 3.5 Sonnet',
      content: 'Workspace ready. Create a file or open a local folder to begin.',
      timestamp: 'Just now',
      tokensUsed: 0,
      tokensSaved: 0,
      contextContinuity: true
    }
  ]);

  const setCurrentProjectId = (id: ProjectId) => {
    setCurrentProjectIdState(id);
    directoryHandleRef.current = null;
    setPendingReconnect(null);
    setSaveError(null);
    clearStoredDirectoryHandle();
    saveWorkspaceMeta({
      projectId: id,
      folderName: '',
      openFilePaths: [],
      lastSavedAt: Date.now()
    });
    if (id === 'codebase-memory-mcp') {
      setFiles(CBM_REPO_FILES.map(f => ({
        ...f,
        savedContent: f.content,
        isDirty: false,
      })));
      setGraphNodes(CBM_GRAPH_NODES);
      setGraphEdges(CBM_GRAPH_EDGES);
      setCiaResult(CBM_CIA_RESULT);
      setActiveFileId('cbm-cypher');
      setOpenFileIds(['cbm-cypher', 'cbm-mcp', 'cbm-main']);
      setSelectedGraphNode(CBM_GRAPH_NODES[1]);
      setMasterPrompt({
        ...INITIAL_MASTER_PROMPT,
        projectName: 'DeusData / codebase-memory-mcp',
        version: 'v0.24.1 (Pure C)',
        astVersion: 'CBM-AST-TREE-SITTER',
        requirements: 'Native, extreme-performance code intelligence engine with persistent tree-sitter AST knowledge graph, Cypher query engine, BFS path tracer, and 99% token reduction for AI coding agents.'
      });
      setCypherResult({
        query: 'MATCH (caller)-[:CALLS]->(f:Function) WHERE f.name = "cbm_cypher_execute" RETURN caller.label, caller.type, caller.file',
        executionTimeMs: 0.72,
        columns: ['caller', 'type', 'file'],
        rows: [
          { caller: 'mcp.c', type: 'File / MCP Handler', file: 'src/mcp/mcp.c' },
          { caller: 'cli.c', type: 'File / CLI Runner', file: 'src/cli/cli.c' },
          { caller: 'test_cypher.c', type: 'Test Suite', file: 'tests/test_cypher.c' }
        ]
      });
      setTraceResult({
        symbol: 'cbm_cypher_execute',
        direction: 'inbound',
        depth: 3,
        executionTimeMs: 0.58,
        paths: [
          { source: 'mcp.c (cbm_mcp_dispatch)', target: 'cbm_cypher_execute()', edge: 'CALLS', file: 'src/mcp/mcp.c', line: 38 },
          { source: 'cli.c (cbm_cli_execute_tool)', target: 'cbm_cypher_execute()', edge: 'CALLS', file: 'src/cli/cli.c', line: 52 },
          { source: 'test_cypher.c (test_match_pattern)', target: 'cbm_cypher_execute()', edge: 'TESTS', file: 'tests/test_cypher.c', line: 120 }
        ]
      });
    } else {
      setFiles(INITIAL_FILES.map(f => ({
        ...f,
        savedContent: f.content,
        isDirty: false,
      })));
      setGraphNodes(INITIAL_GRAPH_NODES);
      setGraphEdges(INITIAL_GRAPH_EDGES);
      setCiaResult(DEFAULT_CIA_RESULT);
      setActiveFileId('payment-service');
      setOpenFileIds(['payment-service', 'checkout-page', 'cart-controller']);
      setSelectedGraphNode(INITIAL_GRAPH_NODES[1]);
      setMasterPrompt(INITIAL_MASTER_PROMPT);
    }
  };

  const openFile = (fileId: string) => {
    if (!openFileIds.includes(fileId)) {
      setOpenFileIds(prev => [...prev, fileId]);
    }
    setActiveFileId(fileId);
  };

  const closeFile = (fileId: string) => {
    const nextOpen = openFileIds.filter(id => id !== fileId);
    setOpenFileIds(nextOpen);
    if (activeFileId === fileId) {
      setActiveFileId(nextOpen.length > 0 ? nextOpen[nextOpen.length - 1] : '');
    }
  };

  const updateFileContent = (fileId: string, content: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      const baseline = f.savedContent !== undefined ? f.savedContent : f.content;
      const isDirty = content !== baseline;
      return {
        ...f,
        content,
        savedContent: baseline,
        isDirty,
        isModified: f.isModified || isDirty
      };
    }));
    if (fileId === 'payment-service' || fileId === 'auth-service' || fileId === 'cbm-cypher') {
      runChangeImpactAnalysis(fileId);
    }
  };

  const applyUpdatedAst = (updatedList: ProjectFile[]) => {
    try {
      const { nodes, edges, enrichedFiles } = buildGraphFromFiles(updatedList);
      if (nodes.length > 0) {
        setGraphNodes(nodes);
        setGraphEdges(edges);
      }
      return enrichedFiles.length > 0 ? enrichedFiles : updatedList;
    } catch (e) {
      console.warn('AST update failed:', e);
      return updatedList;
    }
  };

  const saveFile = async (fileId: string): Promise<void> => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    setSaveError(null);

    // 1. Direct write-back via existing FileSystemFileHandle
    if (file.fileHandle) {
      try {
        await writeFileHandle(file.fileHandle, file.content);
        setFiles(prev => applyUpdatedAst(prev.map(f => f.id === fileId ? { ...f, isDirty: false, savedContent: f.content } : f)));
        if (isGitRepo && repoRoot) {
          refreshGitStatus();
        }
        return;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setSaveError(`Failed to save "${file.name}" to disk: ${errorMsg}`);
        console.error('Error writing fileHandle:', err);
        return;
      }
    }

    // 2. Direct write-back via active project directory handle (for newly created files)
    if (directoryHandleRef.current) {
      try {
        const handle = await createFileInDirectory(directoryHandleRef.current, file.path, file.content);
        if (handle) {
          setFiles(prev => applyUpdatedAst(prev.map(f => f.id === fileId ? { ...f, isDirty: false, savedContent: f.content, fileHandle: handle } : f)));
          if (isGitRepo && repoRoot) {
            refreshGitStatus();
          }
          return;
        } else {

          setSaveError(`Failed to write "${file.name}" to directory.`);
          return;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setSaveError(`Failed to write "${file.name}" to directory: ${errorMsg}`);
        console.error('Error writing to directory handle:', err);
        return;
      }
    }

    // 3. Honest fallback for unsupported browsers, uploaded folder input, or mock project mode:
    // Exports/downloads the file to disk via browser download without pretending direct write succeeded
    try {
      downloadFile(file.name, file.content);
      setFiles(prev => applyUpdatedAst(prev.map(f => f.id === fileId ? { ...f, isDirty: false, savedContent: f.content } : f)));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setSaveError(`Failed to export "${file.name}": ${errorMsg}`);
    }
  };

  const createFile = async (
    name: string, 
    folderPath?: string, 
    content: string = ''
  ): Promise<ProjectFile | null> => {
    const cleanFolder = (folderPath || '').trim().replace(/^\/+|\/+$/g, '');
    const cleanName = name.trim().replace(/^\/+/g, '');
    if (!cleanName) return null;
    const path = cleanFolder ? `${cleanFolder}/${cleanName}` : cleanName;
    const fileName = cleanName.split('/').pop() || cleanName;
    const ext = fileName.split('.').pop() || 'ts';
    const initialContent = content || `// ${fileName}\n// Created in IntelliCode\n\n`;

    setSaveError(null);
    let fileHandle: FileSystemFileHandle | undefined;

    // If an active project directory handle is present, create the file on disk first
    if (directoryHandleRef.current) {
      try {
        const result = await createFileOnDisk(directoryHandleRef.current, path, initialContent);
        fileHandle = result.fileHandle;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setSaveError(`Failed to create "${fileName}" on disk: ${errorMsg}`);
        console.error('Could not create file on disk:', err);
        return null;
      }
    }

    const newFile: ProjectFile = {
      id: 'file-' + Date.now(),
      name: fileName,
      path,
      language: ext === 'c' || ext === 'h' ? 'c' : ext === 'py' ? 'python' : ext === 'json' ? 'json' : 'typescript',
      content: initialContent,
      savedContent: initialContent,
      isDirty: false,
      fileHandle
    };

    setFiles(prev => {
      const updated = [...prev, newFile];
      return applyUpdatedAst(updated);
    });

    setOpenFileIds(prev => prev.includes(newFile.id) ? prev : [...prev, newFile.id]);
    setActiveFileId(newFile.id);
    return newFile;
  };

  const deleteFile = async (fileId: string): Promise<boolean> => {
    const file = files.find(f => f.id === fileId);
    if (!file) return false;

    // Prevent accidental loss of unsaved changes with explicit warning
    const confirmMessage = file.isDirty
      ? `"${file.name}" has unsaved changes.\nAre you sure you want to delete this file from disk?`
      : `Are you sure you want to delete "${file.name}"?`;

    if (!window.confirm(confirmMessage)) {
      return false;
    }

    setSaveError(null);

    // If an active project directory handle is present, perform actual disk deletion
    if (directoryHandleRef.current) {
      try {
        await deleteFileOnDisk(directoryHandleRef.current, file.path);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setSaveError(`Failed to delete "${file.name}" from disk: ${errorMsg}`);
        console.error('Error deleting file on disk:', err);
        return false;
      }
    } else if (file.fileHandle) {
      setSaveError(`Cannot delete "${file.name}" on disk: root directory handle is not available.`);
      return false;
    }

    // Disk deletion succeeded (or mock mode): update state
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      return applyUpdatedAst(updated);
    });
    closeFile(fileId);
    return true;
  };

  const renameFile = async (fileId: string, newName: string): Promise<boolean> => {
    const file = files.find(f => f.id === fileId);
    if (!file) return false;
    const cleanName = newName.trim();
    if (!cleanName || cleanName === file.name) return false;

    setSaveError(null);

    let updatedHandle = file.fileHandle;
    const parts = file.path.split('/');
    parts[parts.length - 1] = cleanName;
    let newPath = parts.join('/');

    // If an active project directory handle is present, perform actual disk rename
    if (directoryHandleRef.current) {
      try {
        const result = await renameFileOnDisk(
          directoryHandleRef.current,
          file.path,
          cleanName,
          file.fileHandle
        );
        updatedHandle = result.newHandle;
        newPath = result.newPath;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setSaveError(`Failed to rename "${file.name}" on disk: ${errorMsg}`);
        console.error('Error renaming file on disk:', err);
        return false;
      }
    } else if (file.fileHandle) {
      if (typeof (file.fileHandle as any).move === 'function') {
        try {
          await (file.fileHandle as any).move(cleanName);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          setSaveError(`Failed to rename "${file.name}" on disk: ${errorMsg}`);
          return false;
        }
      } else {
        setSaveError(`Cannot rename "${file.name}" on disk: move is not supported in this browser without a directory handle.`);
        return false;
      }
    }

    // Disk rename succeeded (or mock mode): update state
    const ext = cleanName.split('.').pop() || 'ts';
    setFiles(prev => {
      const updated = prev.map(f => {
        if (f.id !== fileId) return f;
        return {
          ...f,
          name: cleanName,
          path: newPath,
          language: ext === 'c' || ext === 'h' ? 'c' : ext === 'py' ? 'python' : ext === 'json' ? 'json' : 'typescript',
          fileHandle: updatedHandle
        };
      });
      return applyUpdatedAst(updated);
    });
    return true;
  };

  const refreshGitStatus = async (overrideRepoRoot?: string) => {
    const root = overrideRepoRoot || repoRoot;
    if (!root) return;

    setGitLoading(true);
    setGitError(null);
    try {
      const statusRes = await gitService.getStatus(root, workspacePath || undefined);
      if (statusRes.success) {
        setIsGitRepo(statusRes.isGit);
        if (statusRes.isGit) {
          if (statusRes.branch) setGitBranch(statusRes.branch);
          setStagedFiles(statusRes.stagedFiles || []);
          setUnstagedFiles(statusRes.unstagedFiles || []);

          // Sync stagedFileIds for in-memory files matching staged paths
          const stagedPaths = (statusRes.stagedFiles || []).map(f => f.path);
          setStagedFileIds(files.filter(f => stagedPaths.includes(f.path)).map(f => f.id));

          // Fetch genuine repository commits
          const logRes = await gitService.getLog(root, 25);
          if (logRes.success) {
            setGitCommits(logRes.commits || []);
          } else if (logRes.error) {
            setGitCommits([]);
          }
        } else {
          setStagedFiles([]);
          setUnstagedFiles([]);
          setGitCommits([]);
          setGitBranch('');
        }
      } else if (statusRes.error) {
        setGitError(statusRes.error);
      }
    } catch (err: any) {
      setGitError(err?.message || 'Failed to refresh Git status');
    } finally {
      setGitLoading(false);
    }
  };

  const loadExternalFiles = (
    newFiles: ProjectFile[], 
    folderName?: string, 
    dirHandle?: FileSystemDirectoryHandle,
    explicitPath?: string
  ) => {
    if (newFiles.length === 0) return;
    directoryHandleRef.current = dirHandle || null;
    setPendingReconnect(null);
    setSaveError(null);

    // CRITICAL (Requirement 2 & 3): Never reuse stale Git data from a previously opened workspace!
    setIsGitRepo(null);
    setRepoRoot(null);
    setWorkspacePath(explicitPath || null);
    setGitBranch('');
    setGitCommits([]);
    setStagedFiles([]);
    setUnstagedFiles([]);
    setStagedFileIds([]);
    setGitError(null);
    setDiffTargetFileId(null);
    setDiffTargetFilePath(null);

    // Normalize paths: ensure forward slashes and strip redundant shared root folder prefixes
    // (e.g. when loaded via folder input where webkitRelativePath starts with FolderName/)
    let normalizedInput = newFiles.map(f => ({
      ...f,
      path: f.path.replace(/\\/g, '/')
    }));

    if (normalizedInput.length > 0) {
      const firstParts = normalizedInput[0].path.split('/');
      if (firstParts.length > 1) {
        const potentialPrefix = firstParts[0] + '/';
        const allSharePrefix = normalizedInput.every(f => f.path.startsWith(potentialPrefix));
        if (allSharePrefix) {
          normalizedInput = normalizedInput.map(f => ({
            ...f,
            path: f.path.substring(potentialPrefix.length)
          }));
        }
      }
    }

    const initializedFiles = normalizedInput.map(f => ({
      ...f,
      savedContent: f.savedContent !== undefined ? f.savedContent : f.content,
      isDirty: f.isDirty !== undefined ? f.isDirty : false,
    }));
    setFiles(initializedFiles);
    setOpenFileIds([initializedFiles[0].id]);
    setActiveFileId(initializedFiles[0].id);
    setCurrentProjectIdState('custom');
    const resolvedFolderName = folderName || (dirHandle ? dirHandle.name : 'Opened Workspace');
    setMasterPrompt(prev => ({
      ...prev,
      projectName: resolvedFolderName,
      lastSynced: 'Just now (Loaded from folder)',
      astVersion: 'AST-' + Math.random().toString(36).substring(2, 7).toUpperCase()
    }));

    if (dirHandle) {
      saveStoredDirectoryHandle(dirHandle, resolvedFolderName);
    }

    // Persist initial workspace metadata
    saveWorkspaceMeta({
      projectId: 'custom',
      folderName: resolvedFolderName,
      workspacePath: explicitPath,
      activeFilePath: initializedFiles[0].path,
      openFilePaths: [initializedFiles[0].path],
      lastSavedAt: Date.now()
    });

    // Detect Git repository for the newly opened workspace directory
    const sampleFiles = initializedFiles.slice(0, 10).map(f => f.path);
    setGitLoading(true);
    gitService.resolveWorkspace({
      path: explicitPath,
      folderName: resolvedFolderName,
      sampleFiles,
    }).then(async (resolved) => {
      if (resolved.success && resolved.workspacePath) {
        setWorkspacePath(resolved.workspacePath);
        setIsGitRepo(resolved.isGit);

        // Update workspace metadata with exact resolved path and repo root
        saveWorkspaceMeta({
          projectId: 'custom',
          folderName: resolvedFolderName,
          workspacePath: resolved.workspacePath,
          repoRoot: resolved.repoRoot,
          activeFilePath: initializedFiles[0].path,
          openFilePaths: [initializedFiles[0].path],
          lastSavedAt: Date.now()
        });

        if (resolved.isGit && resolved.repoRoot) {
          setRepoRoot(resolved.repoRoot);
          setGitBranch(resolved.branch || 'main');
          await refreshGitStatus(resolved.repoRoot);
        } else {
          // Explicitly not a git repository
          setIsGitRepo(false);
          setRepoRoot(null);
          setGitBranch('');
          setGitCommits([]);
          setStagedFiles([]);
          setUnstagedFiles([]);
        }
      } else {
        // Directory could not be located on host or is not a git repo
        setIsGitRepo(false);
        setRepoRoot(null);
        setGitBranch('');
        setGitCommits([]);
        setStagedFiles([]);
        setUnstagedFiles([]);
      }
    }).catch(err => {
      console.warn('Git resolution error:', err);
      setIsGitRepo(false);
      setRepoRoot(null);
      setGitBranch('');
      setGitCommits([]);
    }).finally(() => {
      setGitLoading(false);
    });

    // Generate dynamic Knowledge Graph and real symbols from actual loaded files!
    try {
      const { nodes, edges, enrichedFiles } = buildGraphFromFiles(initializedFiles);
      if (enrichedFiles && enrichedFiles.length > 0) {
        setFiles(enrichedFiles);
      }
      if (nodes.length > 0) {
        setGraphNodes(nodes);
        setGraphEdges(edges);
        setSelectedGraphNode(nodes[0]);
      }
    } catch (e) {
      console.error('Failed to parse graph from loaded files', e);
    }
  };

  const openProjectFolder = async (): Promise<boolean> => {
    if (!hasFsAccess) return false;
    try {
      // @ts-ignore File System Access API is not available in all lib.dom versions.
      const dirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker();
      const loadedFiles = await readDirectoryRecursive(dirHandle);
      if (loadedFiles.length > 0) {
        loadExternalFiles(loadedFiles, dirHandle.name, dirHandle);
        return true;
      }
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return true;
      }
      console.warn('showDirectoryPicker failed:', err);
      return false;
    }
  };

  const openWorkspaceByPath = async (dirPath: string): Promise<boolean> => {
    const cleanPath = dirPath.trim();
    if (!cleanPath) return false;
    setGitLoading(true);
    setGitError(null);
    try {
      const folderRes = await gitService.readWorkspaceFolder(cleanPath);
      if (!folderRes.success || !folderRes.files || folderRes.files.length === 0) {
        setSaveError(folderRes.error || `Could not open folder "${cleanPath}"`);
        setGitLoading(false);
        return false;
      }
      loadExternalFiles(folderRes.files, folderRes.folderName, undefined, folderRes.workspacePath);
      return true;
    } catch (err: any) {
      setSaveError(err?.message || `Failed to open "${cleanPath}"`);
      setGitLoading(false);
      return false;
    }
  };

  const saveAllFiles = async (): Promise<void> => {
    const dirtyFiles = files.filter(f => f.isDirty);
    for (const f of dirtyFiles) {
      await saveFile(f.id);
    }
    if (isGitRepo && repoRoot) {
      await refreshGitStatus();
    }
  };

  const stageFile = async (filePathOrId: string): Promise<void> => {
    const file = files.find(f => f.id === filePathOrId);
    const targetPath = file ? file.path : filePathOrId;

    if (isGitRepo && repoRoot) {
      setGitLoading(true);
      const res = await gitService.stage(repoRoot, [targetPath]);
      if (!res.success && res.error) {
        setGitError(res.error);
      }
      await refreshGitStatus();
    } else {
      setStagedFileIds(prev => prev.includes(filePathOrId) ? prev : [...prev, filePathOrId]);
    }
  };

  const unstageFile = async (filePathOrId: string): Promise<void> => {
    const file = files.find(f => f.id === filePathOrId);
    const targetPath = file ? file.path : filePathOrId;

    if (isGitRepo && repoRoot) {
      setGitLoading(true);
      const res = await gitService.unstage(repoRoot, [targetPath]);
      if (!res.success && res.error) {
        setGitError(res.error);
      }
      await refreshGitStatus();
    } else {
      setStagedFileIds(prev => prev.filter(id => id !== filePathOrId));
    }
  };

  const stageAll = async (): Promise<void> => {
    if (isGitRepo && repoRoot) {
      setGitLoading(true);
      const res = await gitService.stage(repoRoot, undefined, true);
      if (!res.success && res.error) {
        setGitError(res.error);
      }
      await refreshGitStatus();
    } else {
      const changed = files.filter(f => f.isDirty || f.isModified).map(f => f.id);
      setStagedFileIds(changed);
    }
  };

  const unstageAll = async (): Promise<void> => {
    if (isGitRepo && repoRoot) {
      setGitLoading(true);
      const res = await gitService.unstage(repoRoot, undefined, true);
      if (!res.success && res.error) {
        setGitError(res.error);
      }
      await refreshGitStatus();
    } else {
      setStagedFileIds([]);
    }
  };

  const discardChanges = async (filePathOrId: string): Promise<void> => {
    const file = files.find(f => f.id === filePathOrId);
    const targetPath = file ? file.path : filePathOrId;

    if (isGitRepo && repoRoot) {
      setGitLoading(true);
      const res = await gitService.discard(repoRoot, targetPath);
      if (!res.success && res.error) {
        setGitError(res.error);
      }
      // Re-read file content from disk to update editor
      if (file) {
        const diffRes = await gitService.getDiff(repoRoot, targetPath);
        if (diffRes.success && diffRes.currentContent !== undefined) {
          setFiles(prev => prev.map(f => f.id === file.id ? {
            ...f,
            content: diffRes.currentContent!,
            savedContent: diffRes.currentContent!,
            isDirty: false,
            isModified: false
          } : f));
        }
      }
      await refreshGitStatus();
    } else if (file) {
      setFiles(prev => prev.map(f => {
        if (f.id !== file.id) return f;
        const original = f.savedContent !== undefined ? f.savedContent : f.content;
        return {
          ...f,
          content: original,
          isDirty: false,
          isModified: false
        };
      }));
      setStagedFileIds(prev => prev.filter(id => id !== file.id));
    }
    if (diffTargetFileId === filePathOrId || diffTargetFilePath === targetPath) {
      setDiffTargetFileId(null);
      setDiffTargetFilePath(null);
    }
  };

  const commitStaged = async (message: string): Promise<boolean> => {
    const trimmed = message.trim();
    if (!trimmed) return false;

    if (isGitRepo && repoRoot) {
      setGitLoading(true);
      setGitError(null);
      const res = await gitService.commit(repoRoot, trimmed);
      if (!res.success) {
        setGitError(res.error || 'Failed to commit');
        setGitLoading(false);
        return false;
      }
      // Mark committed files in memory as saved
      setFiles(prev => prev.map(f => {
        const wasStaged = stagedFiles.some(sf => sf.path === f.path);
        if (wasStaged) {
          return {
            ...f,
            savedContent: f.content,
            isDirty: false,
            isModified: false
          };
        }
        return f;
      }));
      await refreshGitStatus();
      return true;
    } else {
      // In-memory fallback
      if (stagedFileIds.length === 0) return false;
      setFiles(prev => prev.map(f => {
        if (stagedFileIds.includes(f.id)) {
          return {
            ...f,
            savedContent: f.content,
            isDirty: false,
            isModified: false
          };
        }
        return f;
      }));
      const newCommit: GitCommit = {
        hash: Math.random().toString(16).substring(2, 9),
        message: trimmed,
        author: 'Local User',
        time: 'Just now',
        filesCount: stagedFileIds.length
      };
      setGitCommits(prev => [newCommit, ...prev]);
      setStagedFileIds([]);
      return true;
    }
  };

  const initGitRepo = async (): Promise<boolean> => {
    const targetDir = workspacePath || (directoryHandleRef.current ? directoryHandleRef.current.name : null);
    if (!targetDir) return false;

    setGitLoading(true);
    setGitError(null);
    const res = await gitService.initRepo(targetDir);
    if (res.success && res.repoRoot) {
      setRepoRoot(res.repoRoot);
      setIsGitRepo(true);
      setGitBranch(res.branch || 'main');
      await refreshGitStatus(res.repoRoot);
      return true;
    } else {
      setGitError(res.error || 'Failed to initialize Git repository');
      setGitLoading(false);
      return false;
    }
  };


  // Protect unsaved changes before page reload or navigation
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const hasDirtyFiles = files.some(file => file.isDirty);
      if (hasDirtyFiles) {
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [files]);

  // Keep workspace navigation metadata synchronized in custom folder mode
  useEffect(() => {
    if (currentProjectId === 'custom' && directoryHandleRef.current && files.length > 0) {
      const activeFile = files.find(f => f.id === activeFileId);
      const openFiles = files.filter(f => openFileIds.includes(f.id));
      saveWorkspaceMeta({
        projectId: 'custom',
        folderName: directoryHandleRef.current.name,
        activeFilePath: activeFile ? activeFile.path : undefined,
        openFilePaths: openFiles.map(f => f.path),
        lastSavedAt: Date.now()
      });
    }
  }, [currentProjectId, activeFileId, openFileIds, files]);

  // Restore workspace from IndexedDB on initial load
  useEffect(() => {
    let isCancelled = false;

    const restoreWorkspace = async () => {
      const meta = getWorkspaceMeta();

      // If user had selected a mock project, preserve that mock project
      if (meta && (meta.projectId === 'codebase-memory-mcp' || meta.projectId === 'novastore')) {
        setCurrentProjectId(meta.projectId);
        return;
      }

      try {
        const stored = await getStoredDirectoryHandle();
        if (isCancelled || !stored) return;

        setIsRestoringWorkspace(true);
        const perm = await verifyDirectoryPermission(stored.handle, false);

        if (perm === 'granted') {
          try {
            const loadedFiles = await readDirectoryRecursive(stored.handle);
            if (isCancelled) return;

            if (loadedFiles.length > 0) {
              directoryHandleRef.current = stored.handle;
              setCurrentProjectIdState('custom');
              setSaveError(null);
              setFiles(loadedFiles);

              // Restore open tabs and active file, validating against actual disk files
              const validOpenIds: string[] = [];
              if (meta?.openFilePaths && meta.openFilePaths.length > 0) {
                for (const p of meta.openFilePaths) {
                  const match = loadedFiles.find(f => f.path === p);
                  if (match && !validOpenIds.includes(match.id)) {
                    validOpenIds.push(match.id);
                  }
                }
              }
              if (validOpenIds.length === 0 && loadedFiles.length > 0) {
                validOpenIds.push(loadedFiles[0].id);
              }
              setOpenFileIds(validOpenIds);

              let validActiveId = '';
              if (meta?.activeFilePath) {
                const match = loadedFiles.find(f => f.path === meta.activeFilePath);
                if (match) {
                  validActiveId = match.id;
                }
              }
              if (!validActiveId) {
                validActiveId = validOpenIds[0] || '';
              }
              setActiveFileId(validActiveId);

              setMasterPrompt(prev => ({
                ...prev,
                projectName: stored.folderName,
                lastSynced: 'Just now (Restored from folder)',
                astVersion: 'AST-' + Math.random().toString(36).substring(2, 7).toUpperCase()
              }));

              try {
                const { nodes, edges } = buildGraphFromFiles(loadedFiles);
                if (nodes.length > 0) {
                  setGraphNodes(nodes);
                  setGraphEdges(edges);
                  setSelectedGraphNode(nodes[0]);
                }
              } catch (e) {
                console.error('Failed to parse graph from restored files', e);
              }

              // Resolve Git repository for restored workspace
              gitService.resolveWorkspace({
                path: meta?.workspacePath,
                folderName: stored.folderName,
                sampleFiles: loadedFiles.slice(0, 10).map(f => f.path),
              }).then(async (resolved) => {
                if (isCancelled) return;
                if (resolved.success && resolved.workspacePath) {
                  setWorkspacePath(resolved.workspacePath);
                  setIsGitRepo(resolved.isGit);
                  if (resolved.isGit && resolved.repoRoot) {
                    setRepoRoot(resolved.repoRoot);
                    setGitBranch(resolved.branch || 'main');
                    await refreshGitStatus(resolved.repoRoot);
                  } else {
                    setIsGitRepo(false);
                    setRepoRoot(null);
                    setGitBranch('');
                    setGitCommits([]);
                  }
                } else {
                  setIsGitRepo(false);
                  setRepoRoot(null);
                  setGitBranch('');
                  setGitCommits([]);
                }
              }).catch(() => {
                if (!isCancelled) {
                  setIsGitRepo(false);
                  setRepoRoot(null);
                  setGitBranch('');
                  setGitCommits([]);
                }
              });
            }
          } catch (readErr) {
            console.warn('Could not read directory from stored handle:', readErr);
            setSaveError(`Could not access folder "${stored.folderName}". It may have been moved, deleted, or access was revoked.`);
            clearStoredDirectoryHandle();
            clearWorkspaceMeta();
          }
        } else if (perm === 'prompt') {
          // Browser requires user gesture to request readwrite permission after reload
          setPendingReconnect({
            handle: stored.handle,
            folderName: stored.folderName,
            meta
          });
        } else {
          // perm === 'denied'
          setSaveError(`Permission to access folder "${stored.folderName}" was revoked.`);
          clearStoredDirectoryHandle();
          clearWorkspaceMeta();
        }
      } catch (err) {
        console.warn('Failed to restore workspace:', err);
      } finally {
        if (!isCancelled) {
          setIsRestoringWorkspace(false);
        }
      }
    };

    restoreWorkspace();

    return () => {
      isCancelled = true;
    };
  }, []);

  const reconnectWorkspace = async (): Promise<boolean> => {
    if (!pendingReconnect) return false;
    setSaveError(null);
    try {
      const perm = await verifyDirectoryPermission(pendingReconnect.handle, true);
      if (perm === 'granted') {
        const dirHandle = pendingReconnect.handle;
        const folderName = pendingReconnect.folderName;
        const meta = pendingReconnect.meta;

        const loadedFiles = await readDirectoryRecursive(dirHandle);
        if (loadedFiles.length > 0) {
          directoryHandleRef.current = dirHandle;
          setCurrentProjectIdState('custom');
          setFiles(loadedFiles);

          // Restore open tabs and active file, validating against disk files
          const validOpenIds: string[] = [];
          if (meta?.openFilePaths && meta.openFilePaths.length > 0) {
            for (const p of meta.openFilePaths) {
              const match = loadedFiles.find(f => f.path === p);
              if (match && !validOpenIds.includes(match.id)) {
                validOpenIds.push(match.id);
              }
            }
          }
          if (validOpenIds.length === 0 && loadedFiles.length > 0) {
            validOpenIds.push(loadedFiles[0].id);
          }
          setOpenFileIds(validOpenIds);

          let validActiveId = '';
          if (meta?.activeFilePath) {
            const match = loadedFiles.find(f => f.path === meta.activeFilePath);
            if (match) {
              validActiveId = match.id;
            }
          }
          if (!validActiveId) {
            validActiveId = validOpenIds[0] || '';
          }
          setActiveFileId(validActiveId);

          setMasterPrompt(prev => ({
            ...prev,
            projectName: folderName,
            lastSynced: 'Just now (Restored from folder)',
            astVersion: 'AST-' + Math.random().toString(36).substring(2, 7).toUpperCase()
          }));

          try {
            const { nodes, edges, enrichedFiles } = buildGraphFromFiles(loadedFiles);
            if (enrichedFiles && enrichedFiles.length > 0) {
              setFiles(enrichedFiles);
            }
            if (nodes.length > 0) {
              setGraphNodes(nodes);
              setGraphEdges(edges);
              setSelectedGraphNode(nodes[0]);
            }
          } catch (e) {
            console.error('Failed to parse graph from reconnected files', e);
          }

          setPendingReconnect(null);
          return true;
        } else {
          setSaveError(`The folder "${folderName}" contains no supported files.`);
          setPendingReconnect(null);
          return false;
        }
      } else {
        setSaveError(`Permission to access folder "${pendingReconnect.folderName}" was denied.`);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setSaveError(`Failed to reconnect folder: ${errorMsg}`);
      return false;
    }
  };

  const dismissReconnect = () => {
    setPendingReconnect(null);
    clearStoredDirectoryHandle();
    clearWorkspaceMeta();
  };

  const runChangeImpactAnalysis = (targetId: string) => {
    if (targetId === 'cbm-cypher') {
      setCiaResult(CBM_CIA_RESULT);
      setGraphNodes(prev => prev.map(node => {
        if (node.id === 'cbm-node-cypher-c' || node.id === 'cbm-node-sym-cypher_exec') {
          return { ...node, impactStatus: 'modified' };
        }
        if (['cbm-node-mcp-c', 'cbm-node-cli-c', 'cbm-node-store-c'].includes(node.id)) {
          return { ...node, impactStatus: 'direct' };
        }
        if (['cbm-node-test-cypher', 'cbm-node-test-mcp'].includes(node.id)) {
          return { ...node, impactStatus: 'indirect' };
        }
        return { ...node, impactStatus: 'none' };
      }));
    } else if (targetId === 'payment-service') {
      setCiaResult(DEFAULT_CIA_RESULT);
      setGraphNodes(prev => prev.map(node => {
        if (node.id === 'node-payment-service' || node.id === 'node-sym-processPayment') {
          return { ...node, impactStatus: 'modified' };
        }
        if (['node-checkout-page', 'node-cart-store', 'node-order-service'].includes(node.id)) {
          return { ...node, impactStatus: 'direct' };
        }
        if (['node-payment-test', 'node-checkout-e2e'].includes(node.id)) {
          return { ...node, impactStatus: 'indirect' };
        }
        return { ...node, impactStatus: 'none' };
      }));
    }
  };

  const toggleMcpTool = (serverId: string, toolName: string) => {
    setMcpServers(prev => prev.map(server => {
      if (server.id !== serverId) return server;
      return {
        ...server,
        tools: server.tools.map(tool => tool.name === toolName ? { ...tool, enabled: !tool.enabled } : tool)
      };
    }));
  };

  const toggleMcpServer = (serverId: string) => {
    setMcpServers(prev => prev.map(s => {
      if (s.id !== serverId) return s;
      const nextStatus = s.status === 'connected' ? 'disconnected' : 'connected';
      return { ...s, status: nextStatus };
    }));
  };

  const runTests = async (suiteIds?: string[]) => {
    setIsExecutingTests(true);
    setTestSuites(prev => prev.map(s => {
      if (!suiteIds || suiteIds.includes(s.id)) {
        return { ...s, status: 'running' };
      }
      return s;
    }));

    await new Promise(r => setTimeout(r, 1200));

    setTestSuites(prev => prev.map(s => {
      if (!suiteIds || suiteIds.includes(s.id)) {
        return { ...s, status: 'passed' };
      }
      return s;
    }));
    setIsExecutingTests(false);
  };

  const runExperiment = async (expId: string) => {
    setExperiments(prev => prev.map(e => e.id === expId ? { ...e, status: 'running' } : e));
    await new Promise(r => setTimeout(r, 1600));
    setExperiments(prev => prev.map(e => e.id === expId ? { ...e, status: 'completed' } : e));
  };

  const rebuildAST = async () => {
    setIsAnalyzingAST(true);
    try {
      const { nodes, edges, enrichedFiles } = buildGraphFromFiles(files);
      if (enrichedFiles && enrichedFiles.length > 0) {
        setFiles(enrichedFiles);
      }
      if (nodes.length > 0) {
        setGraphNodes(nodes);
        setGraphEdges(edges);
      }
      setMasterPrompt(prev => ({
        ...prev,
        lastSynced: 'Just now (AST parsed & synchronized)',
        astVersion: 'AST-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      }));
    } catch (err) {
      console.error('rebuildAST error:', err);
    } finally {
      setIsAnalyzingAST(false);
    }
  };

  const executeCypherQuery = async (query: string): Promise<CypherQueryResult> => {
    setIsExecutingCypher(true);
    await new Promise(r => setTimeout(r, 260));

    let result: CypherQueryResult;
    if (query.includes('cbm_cypher_execute')) {
      result = {
        query,
        executionTimeMs: 0.68,
        columns: ['caller', 'type', 'file', 'call_site'],
        rows: [
          { caller: 'mcp.c', type: 'File / MCP Handler', file: 'src/mcp/mcp.c', call_site: 'cbm_mcp_dispatch() line 38' },
          { caller: 'cli.c', type: 'File / CLI Runner', file: 'src/cli/cli.c', call_site: 'cbm_cli_execute_tool() line 52' },
          { caller: 'test_cypher.c', type: 'Test Suite', file: 'tests/test_cypher.c', call_site: 'test_match_pattern() line 120' }
        ]
      };
    } else if (query.includes('MCP Protocol Server') || query.includes('mcp')) {
      result = {
        query,
        executionTimeMs: 0.52,
        columns: ['function', 'returnType', 'loc', 'file'],
        rows: [
          { function: 'cbm_mcp_dispatch()', returnType: 'int', loc: 68, file: 'src/mcp/mcp.c' },
          { function: 'cbm_handle_query_cypher()', returnType: 'void', loc: 42, file: 'src/mcp/mcp.c' },
          { function: 'cbm_handle_trace_path()', returnType: 'void', loc: 56, file: 'src/mcp/mcp.c' }
        ]
      };
    } else if (query.includes('main.c')) {
      result = {
        query,
        executionTimeMs: 0.49,
        columns: ['entry_point', 'dispatches_to', 'module'],
        rows: [
          { entry_point: 'main() in main.c', dispatches_to: 'cbm_mcp_dispatch()', module: 'src/mcp/mcp.c' },
          { entry_point: 'main() in main.c', dispatches_to: 'cbm_daemon_start()', module: 'src/daemon/daemon.c' },
          { entry_point: 'main() in main.c', dispatches_to: 'cbm_cli_execute_tool()', module: 'src/cli/cli.c' }
        ]
      };
    } else {
      result = {
        query,
        executionTimeMs: 0.88,
        columns: ['symbol', 'cluster', 'kind', 'degree'],
        rows: [
          { symbol: 'cbm_cypher_execute()', cluster: 'Cypher Query Engine', kind: 'Function', degree: 6 },
          { symbol: 'mcp.c', cluster: 'MCP Protocol Server', kind: 'File', degree: 7 },
          { symbol: 'main.c', cluster: 'Entry & CLI', kind: 'File', degree: 5 },
          { symbol: 'store.c', cluster: 'In-Memory SQLite Store', kind: 'File', degree: 6 }
        ]
      };
    }

    setCypherResult(result);
    setIsExecutingCypher(false);
    return result;
  };

  const traceCallPath = async (symbolName: string, direction: 'inbound' | 'outbound', depth: number): Promise<TracePathResult> => {
    setIsTracingPath(true);
    await new Promise(r => setTimeout(r, 220));

    const isCbm = currentProjectId === 'codebase-memory-mcp';

    const result: TracePathResult = {
      symbol: symbolName,
      direction,
      depth,
      executionTimeMs: 0.52,
      paths: isCbm ? (
        direction === 'inbound' ? [
          { source: 'mcp.c (cbm_mcp_dispatch)', target: symbolName, edge: 'CALLS', file: 'src/mcp/mcp.c', line: 38 },
          { source: 'cli.c (cbm_cli_execute_tool)', target: symbolName, edge: 'CALLS', file: 'src/cli/cli.c', line: 52 },
          { source: 'test_cypher.c (test_match_pattern)', target: symbolName, edge: 'TESTS', file: 'tests/test_cypher.c', line: 120 }
        ] : [
          { source: symbolName, target: 'cbm_cypher_parse()', edge: 'CALLS', file: 'src/cypher/cypher.c', line: 95 },
          { source: symbolName, target: 'cbm_store_execute_pattern()', edge: 'CALLS', file: 'src/store/store.c', line: 42 },
          { source: symbolName, target: 'cbm_query_free()', edge: 'CALLS', file: 'src/cypher/cypher.c', line: 140 }
        ]
      ) : (
        direction === 'inbound' ? [
          { source: 'CheckoutPage.tsx', target: symbolName, edge: 'CALLS', file: 'src/components/CheckoutPage.tsx', line: 16 },
          { source: 'orderService.ts', target: symbolName, edge: 'CALLS', file: 'src/services/orderService.ts', line: 8 }
        ] : [
          { source: symbolName, target: 'validateCard()', edge: 'CALLS', file: 'src/services/paymentService.ts', line: 20 }
        ]
      )
    };

    setTraceResult(result);
    setIsTracingPath(false);
    return result;
  };

  const sendChatMessage = async (content: string) => {
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);

    await new Promise(r => setTimeout(r, 750));

    const savedInThisCall = 16400;
    setTokensSaved(prev => prev + savedInThisCall);

    let assistantResponse: ChatMessage;

    if (content.toLowerCase().includes('cypher') || content.toLowerCase().includes('mcp') || content.toLowerCase().includes('cbm')) {
      assistantResponse = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'assistant',
        model: activeModel.name,
        content: `I analyzed the **codebase-memory-mcp** Knowledge Graph:

- **Target Analyzed**: \`cbm_cypher_execute()\` in \`src/cypher/cypher.c\`
- **Inbound Callers**:
  - \`src/mcp/mcp.c\` (Tool dispatch for \`query_cypher\`)
  - \`src/cli/cli.c\` (One-shot command runner)
  - \`tests/test_cypher.c\` (Unit test suite)
- **Token Economy**: Avoided re-reading 28 C source files; retrieved graph nodes in 0.68ms!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tokensUsed: 290,
        tokensSaved: savedInThisCall,
        contextContinuity: true,
        affectedComponents: ['mcp.c', 'cli.c', 'store.c'],
        suggestedAction: {
          type: 'view_graph',
          label: 'Inspect in Knowledge Graph'
        }
      };
    } else {
      assistantResponse = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'assistant',
        model: activeModel.name,
        content: `Task acknowledged in **${activeModel.name}**.

Using persistent Knowledge Graph for **${masterPrompt.projectName}**:
- Tree-Sitter AST & SQLite cache active.
- Context handover: 0 tokens spent on re-reading files.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tokensUsed: 240,
        tokensSaved: savedInThisCall,
        contextContinuity: true
      };
    }

    setChatMessages(prev => [...prev, assistantResponse]);
  };

  return (
    <IDEContext.Provider
      value={{
        activeView,
        setActiveView,
        currentProjectId,
        setCurrentProjectId,
        files,
        activeFileId,
        openFileIds,
        openFile,
        closeFile,
        updateFileContent,
        activeModel,
        setActiveModel,
        masterPrompt,
        setMasterPrompt,
        graphNodes,
        graphEdges,
        selectedGraphNode,
        setSelectedGraphNode,
        ciaResult,
        runChangeImpactAnalysis,
        mcpServers,
        toggleMcpTool,
        toggleMcpServer,
        testSuites,
        isExecutingTests,
        runTests,
        experiments,
        runExperiment,
        chatMessages,
        sendChatMessage,
        isAnalyzingAST,
        rebuildAST,
        tokensSaved,
        isModelSwitchingModalOpen,
        setIsModelSwitchingModalOpen,
        isCopilotOpen,
        setIsCopilotOpen,
        cypherResult,
        isExecutingCypher,
        executeCypherQuery,
        traceResult,
        isTracingPath,
        traceCallPath,
        createFile,
        deleteFile,
        renameFile,
        saveFile,
        saveError,
        clearSaveError,
        hasFsAccess,
        openProjectFolder,
        loadExternalFiles,
        isRestoringWorkspace,
        pendingReconnect,
        reconnectWorkspace,
        dismissReconnect,
        sidebarView,
        setSidebarView,
        isSidebarVisible,
        setIsSidebarVisible,
        toggleSidebar,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        isGitRepo,
        repoRoot,
        workspacePath,
        gitBranch,
        setGitBranch,
        stagedFileIds,
        stagedFiles,
        unstagedFiles,
        gitCommits,
        gitLoading,
        gitError,
        stageFile,
        unstageFile,
        stageAll,
        unstageAll,
        discardChanges,
        commitStaged,
        refreshGitStatus,
        initGitRepo,
        diffTargetFileId,
        setDiffTargetFileId,
        diffTargetFilePath,
        setDiffTargetFilePath,
        openWorkspaceByPath,
        editorSettings,
        updateEditorSettings,
        targetEditorLine,
        setTargetEditorLine,
        saveAllFiles,
        revealedExplorerFileId,
        revealFileInExplorer,
        diagnostics,
        diagnosticsSummary,
        unsupportedFiles,
        isProblemsPanelOpen,
        setIsProblemsPanelOpen,
        toggleProblemsPanel
      }}
    >
      {children}
    </IDEContext.Provider>
  );
};

export const useIDE = () => {
  const context = useContext(IDEContext);
  if (!context) {
    throw new Error('useIDE must be used within an IDEProvider');
  }
  return context;
};
