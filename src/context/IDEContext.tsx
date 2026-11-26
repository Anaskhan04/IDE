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
  AIGeneratedFile,
  ChatMessage, 
  CIAResult, 
  MCPServer, 
  TestSuite, 
  EvaluationExperiment,
  CypherQueryResult,
  TracePathResult,
  WorkspaceDiagnostic,
  DiagnosticsSummary,
  GitHubUser,
  GitHubRepo,
  TerminalEntry
} from '../types/ide';
import { gitService } from '../utils/gitService';
import { githubService } from '../utils/githubService';
import {
  closeAllTabsState,
  closeOtherTabsState,
  closeSavedTabsState,
  closeTabsToRightState,
  closeTabState,
  openTabState,
  reconcileEditorTabs,
} from '../utils/editorTabState';
import {
  GraphSessionState,
  NavigationEntry,
  createDefaultGraphSession,
  pushNavigationHistory,
} from '../utils/workspaceNavigation';
import {
  ContextBundle,
  getBackendAiKeyStatuses,
  parseGeneratedFilesFromResponse,
  saveBackendAiKey,
  selectRelevantContext,
  sendModelRequest,
} from '../utils/aiService';

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
  analyzeChangeImpact,
  executeGraphQuery,
  traceSymbolCallPath,
} from '../utils/graphIntelligence';
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
  allModels: AIModel[];
  customModels: AIModel[];
  addCustomModel: (model: Omit<AIModel, 'id' | 'color' | 'isCustom'> & { apiKey?: string }, selectAfter?: boolean) => AIModel;
  removeCustomModel: (modelId: string) => void;
  configuredProviders: Record<string, boolean>;
  providerStatuses: Record<string, string>;
  refreshAiKeyStatuses: () => Promise<void>;
  setApiKey: (providerKey: string, key: string) => Promise<void>;
  isGeneratingAI: boolean;
  stopAIGeneration: () => void;
  retryLastChatMessage: () => Promise<void>;
  attachedContextPaths: string[];
  setAttachedContextPaths: React.Dispatch<React.SetStateAction<string[]>>;
  selectedEditorCode: string;
  setSelectedEditorCode: (code: string) => void;
  lastContextBundle: ContextBundle | null;
  applyGeneratedFiles: (genFiles: AIGeneratedFile[]) => Promise<number>;
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
  createFolder: (folderPath: string) => Promise<boolean>;
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
  loadExternalFiles: (newFiles: ProjectFile[], folderName?: string, dirHandle?: FileSystemDirectoryHandle, explicitPath?: string) => void;
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
  appTheme: 'obsidian' | 'light';
  setAppTheme: (theme: 'obsidian' | 'light') => void;
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

  // Integrated Terminal
  isTerminalOpen: boolean;
  setIsTerminalOpen: (open: boolean) => void;
  toggleTerminal: () => void;
  terminalHistory: TerminalEntry[];
  terminalCwd: string;
  isRunningCommand: boolean;
  runTerminalCommand: (command: string) => Promise<void>;
  clearTerminal: () => void;

  // GitHub Authentication & Remote Sync
  githubUser: GitHubUser | null;
  githubToken: string;
  githubAuthMethod: 'oauth' | 'gh-cli' | 'pat' | null;
  githubOAuthConfigured: boolean;
  githubCliAvailable: boolean;
  githubRepos: GitHubRepo[];
  isGitHubModalOpen: boolean;
  setIsGitHubModalOpen: (open: boolean) => void;
  isGitHubLoading: boolean;
  githubError: string | null;
  gitSyncMessage: string | null;
  remoteUrl: string;
  githubLinkedRepo: { owner: string; repo: string } | null;
  gitBranches: string[];
  gitAhead: number;
  gitBehind: number;
  fetchFromRemote: () => Promise<boolean>;
  refreshGitHubAuthStatus: () => Promise<void>;
  loginWithGitHubCli: () => Promise<boolean>;
  setAuthenticatedGitHubUser: (user: GitHubUser, method: 'oauth' | 'gh-cli' | 'pat') => Promise<void>;
  loginWithGitHubToken: (token: string) => Promise<boolean>;
  logoutGitHub: () => void;
  fetchGitHubRepos: () => Promise<void>;
  cloneGitHubRepo: (repo: GitHubRepo) => Promise<boolean>;
  createGitHubRepo: (name: string, description: string, isPrivate: boolean) => Promise<GitHubRepo | null>;
  publishToGitHub: (repoName: string, description: string, isPrivate: boolean) => Promise<boolean>;
  pushToGitHub: () => Promise<boolean>;
  pullFromGitHub: () => Promise<boolean>;
  switchBranch: (branch: string, create?: boolean) => Promise<boolean>;

  // Knowledge Graph Session & Guide
  graphSession: GraphSessionState;
  setGraphSession: React.Dispatch<React.SetStateAction<GraphSessionState>>;
  updateGraphSession: (partial: Partial<GraphSessionState> | ((prev: GraphSessionState) => GraphSessionState)) => void;
  resetGraphSession: () => void;
  isGraphGuideOpen: boolean;
  setIsGraphGuideOpen: (open: boolean) => void;

  // Workspace Navigation History (Back / Forward)
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  recordNavigation: (entry: NavigationEntry) => void;

  // Editor Tab Management
  pinnedFileIds: string[];
  closedTabHistory: string[];
  togglePinTab: (fileId: string) => void;
  closeOtherTabs: (keepFileId: string) => void;
  closeTabsToRight: (anchorFileId: string) => void;
  closeSavedTabs: () => void;
  closeAllTabs: (includePinned?: boolean) => void;
  reopenClosedTab: () => void;
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
  const [activeView, setActiveViewState] = useState<ActiveView>('editor'); // Default to Code Editor (Knowledge Graph disabled)
  const [currentProjectId, setCurrentProjectIdState] = useState<ProjectId>('codebase-memory-mcp');

  // Knowledge Graph persistent session state & guide dialog
  const [graphSession, setGraphSession] = useState<GraphSessionState>(() => createDefaultGraphSession());
  const [isGraphGuideOpen, setIsGraphGuideOpen] = useState<boolean>(false);
  const updateGraphSession = (
    partial: Partial<GraphSessionState> | ((prev: GraphSessionState) => GraphSessionState)
  ) => {
    setGraphSession((prev) =>
      typeof partial === 'function' ? partial(prev) : { ...prev, ...partial }
    );
  };
  const resetGraphSession = () => {
    setGraphSession(createDefaultGraphSession());
  };

  // Workspace Navigation History (Back / Forward)
  const [navHistory, setNavHistory] = useState<NavigationEntry[]>([{ view: 'editor' }]);
  const [navIndex, setNavIndex] = useState<number>(0);
  const isRestoringNavRef = useRef(false);

  const recordNavigation = (entry: NavigationEntry) => {
    if (isRestoringNavRef.current) return;
    setNavHistory((prevHistory) => {
      const next = pushNavigationHistory(prevHistory, navIndex, entry);
      setNavIndex(next.index);
      return next.history;
    });
  };

  const setActiveView = (view: ActiveView) => {
    setActiveViewState(view);
    if (!isRestoringNavRef.current) {
      recordNavigation({
        view,
        fileId: view === 'editor' ? activeFileId || undefined : undefined,
        graphNodeId: view === 'graph' ? graphSession.selectedNodeId ?? undefined : undefined,
        scopedGroupKey: view === 'graph' ? graphSession.scopedGroupKey ?? undefined : undefined,
      });
    }
  };
  
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
  const [pinnedFileIds, setPinnedFileIds] = useState<string[]>([]);
  const [closedTabHistory, setClosedTabHistory] = useState<string[]>([]);

  // AI Models, Custom Providers, and API Keys (persisted locally)
  const [customModels, setCustomModels] = useState<AIModel[]>(() => {
    try {
      const saved = localStorage.getItem('intellicode_custom_models');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const allModels = React.useMemo(() => [...AVAILABLE_MODELS, ...customModels], [customModels]);

  const [activeModel, setActiveModelState] = useState<AIModel>(() => {
    try {
      const savedId = localStorage.getItem('intellicode_active_model_id');
      const savedCustom = localStorage.getItem('intellicode_custom_models');
      const customList: AIModel[] = savedCustom ? JSON.parse(savedCustom) : [];
      const merged = [...AVAILABLE_MODELS, ...customList];
      if (savedId) {
        const remappedId =
          savedId === 'gemini-2-0-pro' || savedId === 'gemini-2.5-pro'
            ? 'gemini-3.1-pro-preview'
            : savedId === 'gemini-2-0-flash' || savedId === 'gemini-2.0-flash'
              ? 'gemini-3-flash-preview'
              : savedId;
        const found = merged.find((m) => m.id === remappedId);
        if (found) return found;
      }
    } catch {
      // ignore
    }
    return AVAILABLE_MODELS[0];
  });

  const setActiveModel = (model: AIModel) => {
    setActiveModelState(model);
    try {
      localStorage.setItem('intellicode_active_model_id', model.id);
    } catch {
      // ignore
    }
  };

  const [configuredProviders, setConfiguredProviders] = useState<Record<string, boolean>>({});
  const [providerStatuses, setProviderStatuses] = useState<Record<string, string>>({});
  const [attachedContextPaths, setAttachedContextPaths] = useState<string[]>([]);
  const [selectedEditorCode, setSelectedEditorCode] = useState<string>('');
  const [lastContextBundle, setLastContextBundle] = useState<ContextBundle | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  const refreshAiKeyStatuses = async () => {
    try {
      localStorage.removeItem('intellicode_api_keys');
    } catch {
      // ignore
    }
    const res = await getBackendAiKeyStatuses();
    setConfiguredProviders(res.configuredProviders || {});
    setProviderStatuses(res.statuses || {});
  };

  useEffect(() => {
    refreshAiKeyStatuses();
  }, []);

  const setApiKey = async (providerKey: string, key: string) => {
    const res = await saveBackendAiKey(providerKey, key.trim());
    setConfiguredProviders(res.configuredProviders || {});
    setProviderStatuses(res.statuses || {});
  };

  const addCustomModel = (
    input: Omit<AIModel, 'id' | 'color' | 'isCustom'> & { apiKey?: string },
    selectAfter = true
  ): AIModel => {
    const providerKey =
      input.providerKey.trim() ||
      `custom-${input.provider.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    const newModel: AIModel = {
      ...input,
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      providerKey,
      isCustom: true,
      color: 'from-purple-500 to-indigo-600',
    };
    setCustomModels((prev) => {
      const next = [...prev, newModel];
      try {
        localStorage.setItem('intellicode_custom_models', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    if (input.apiKey !== undefined && input.apiKey.trim()) {
      setApiKey(providerKey, input.apiKey.trim());
    }
    if (selectAfter) {
      setActiveModel(newModel);
    }
    return newModel;
  };

  const removeCustomModel = (modelId: string) => {
    setCustomModels((prev) => {
      const next = prev.filter((m) => m.id !== modelId);
      try {
        localStorage.setItem('intellicode_custom_models', JSON.stringify(next));
      } catch {
        // ignore
      }
      if (activeModel.id === modelId) {
        setActiveModel(AVAILABLE_MODELS[0]);
      }
      return next;
    });
  };

  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);

  // Integrated Terminal State
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const toggleTerminal = () => setIsTerminalOpen((prev) => !prev);
  const [terminalHistory, setTerminalHistory] = useState<TerminalEntry[]>([
    {
      id: 'term-welcome',
      cwd: '',
      stdout: 'IntelliCode Integrated Terminal ready. Run commands (npm, node, python, git, dir/ls).',
      stderr: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [terminalCwd, setTerminalCwd] = useState<string>('');
  const [isRunningCommand, setIsRunningCommand] = useState<boolean>(false);

  // GitHub Authentication & Remote Sync State (tokens are managed strictly on backend)
  const [githubToken] = useState<string>('');
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [githubAuthMethod, setGithubAuthMethod] = useState<'oauth' | 'gh-cli' | 'pat' | null>(null);
  const [githubOAuthConfigured, setGithubOAuthConfigured] = useState<boolean>(false);
  const [githubCliAvailable, setGithubCliAvailable] = useState<boolean>(false);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false);
  const [isGitHubLoading, setIsGitHubLoading] = useState<boolean>(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [gitSyncMessage, setGitSyncMessage] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState<string>('');
  const [githubLinkedRepo, setGithubLinkedRepo] = useState<{ owner: string; repo: string } | null>(null);
  const [gitBranches, setGitBranches] = useState<string[]>([]);
  const [gitAhead, setGitAhead] = useState<number>(0);
  const [gitBehind, setGitBehind] = useState<number>(0);
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

  const [appTheme, setAppThemeState] = useState<'obsidian' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('intellicode-theme');
      if (saved === 'light' || saved === 'obsidian') return saved;
    } catch {
      // ignore storage failure
    }
    return 'obsidian';
  });

  const setAppTheme = (next: 'obsidian' | 'light') => {
    setAppThemeState(next);
    try {
      localStorage.setItem('intellicode-theme', next);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('light', appTheme === 'light');
    document.documentElement.classList.toggle('dark', appTheme !== 'light');
  }, [appTheme]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const setCurrentProjectId = (id: ProjectId) => {
    setCurrentProjectIdState(id);
    directoryHandleRef.current = null;
    setPendingReconnect(null);
    setSaveError(null);
    setWorkspacePath(null);
    setRepoRoot(null);
    setTerminalCwd('');
    setAttachedContextPaths([]);
    setSelectedEditorCode('');
    setLastContextBundle(null);
    setGitError(null);
    setGitSyncMessage(null);
    setGitAhead(0);
    setGitBehind(0);
    setRemoteUrl('');
    setGithubLinkedRepo(null);
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
        astVersion: 'AST-INDEXER',
        requirements: 'Code intelligence demo workspace with TypeScript/regex AST knowledge graph, pattern query engine, and BFS call-path tracer.'
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
    const next = openTabState(files, openFileIds, fileId, pinnedFileIds);
    setOpenFileIds(next.openFileIds);
    setActiveFileId(next.activeFileId);
    setActiveViewState('editor');
    if (next.activeFileId) {
      recordNavigation({ view: 'editor', fileId: next.activeFileId });
    }
  };

  const closeFile = (fileId: string) => {
    if (openFileIds.includes(fileId)) {
      setClosedTabHistory((prev) => [fileId, ...prev.filter((id) => id !== fileId)].slice(0, 20));
    }
    setPinnedFileIds((prev) => prev.filter((id) => id !== fileId));
    const next = closeTabState(files, openFileIds, activeFileId, fileId, pinnedFileIds);
    setOpenFileIds(next.openFileIds);
    setActiveFileId(next.activeFileId);
  };

  const togglePinTab = (fileId: string) => {
    setPinnedFileIds((prev) => {
      const exists = prev.includes(fileId);
      const nextPinned = exists ? prev.filter((id) => id !== fileId) : [...prev, fileId];
      const reconciled = reconcileEditorTabs(files, openFileIds, activeFileId, nextPinned);
      setOpenFileIds(reconciled.openFileIds);
      return nextPinned;
    });
  };

  const closeOtherTabs = (keepFileId: string) => {
    const closingIds = openFileIds.filter((id) => id !== keepFileId && !pinnedFileIds.includes(id));
    if (closingIds.length > 0) {
      setClosedTabHistory((prev) => [...closingIds.reverse(), ...prev.filter((id) => !closingIds.includes(id))].slice(0, 20));
    }
    const next = closeOtherTabsState(files, openFileIds, keepFileId, pinnedFileIds);
    setOpenFileIds(next.openFileIds);
    setActiveFileId(next.activeFileId);
  };

  const closeTabsToRight = (anchorFileId: string) => {
    const next = closeTabsToRightState(files, openFileIds, activeFileId, anchorFileId, pinnedFileIds);
    const closingIds = openFileIds.filter((id) => !next.openFileIds.includes(id));
    if (closingIds.length > 0) {
      setClosedTabHistory((prev) => [...closingIds.reverse(), ...prev.filter((id) => !closingIds.includes(id))].slice(0, 20));
    }
    setOpenFileIds(next.openFileIds);
    setActiveFileId(next.activeFileId);
  };

  const closeSavedTabs = () => {
    const next = closeSavedTabsState(files, openFileIds, activeFileId, pinnedFileIds);
    const closingIds = openFileIds.filter((id) => !next.openFileIds.includes(id));
    if (closingIds.length > 0) {
      setClosedTabHistory((prev) => [...closingIds.reverse(), ...prev.filter((id) => !closingIds.includes(id))].slice(0, 20));
    }
    setOpenFileIds(next.openFileIds);
    setActiveFileId(next.activeFileId);
  };

  const closeAllTabs = (includePinned = false) => {
    const next = closeAllTabsState(files, openFileIds, pinnedFileIds, includePinned);
    const closingIds = openFileIds.filter((id) => !next.openFileIds.includes(id));
    if (closingIds.length > 0) {
      setClosedTabHistory((prev) => [...closingIds.reverse(), ...prev.filter((id) => !closingIds.includes(id))].slice(0, 20));
    }
    if (includePinned) {
      setPinnedFileIds([]);
    }
    setOpenFileIds(next.openFileIds);
    setActiveFileId(next.activeFileId);
  };

  const reopenClosedTab = () => {
    const validIds = new Set(files.map((f) => f.id));
    const targetId = closedTabHistory.find((id) => validIds.has(id) && !openFileIds.includes(id));
    if (!targetId) return;
    setClosedTabHistory((prev) => prev.filter((id) => id !== targetId));
    openFile(targetId);
  };

  const applyNavigationEntry = (entry: NavigationEntry) => {
    isRestoringNavRef.current = true;
    try {
      setActiveViewState(entry.view);
      if (entry.view === 'editor' && entry.fileId) {
        const next = openTabState(files, openFileIds, entry.fileId, pinnedFileIds);
        setOpenFileIds(next.openFileIds);
        setActiveFileId(next.activeFileId);
        if (entry.line !== undefined) {
          setTargetEditorLine(entry.line);
        }
      } else if (entry.view === 'graph') {
        setGraphSession((prev) => ({
          ...prev,
          selectedNodeId: entry.graphNodeId !== undefined ? entry.graphNodeId : prev.selectedNodeId,
          scopedGroupKey: entry.scopedGroupKey !== undefined ? entry.scopedGroupKey : prev.scopedGroupKey,
        }));
      }
    } finally {
      window.setTimeout(() => {
        isRestoringNavRef.current = false;
      }, 0);
    }
  };

  const canGoBack = navIndex > 0;
  const canGoForward = navIndex < navHistory.length - 1;

  const goBack = () => {
    if (!canGoBack) return;
    const nextIndex = navIndex - 1;
    const entry = navHistory[nextIndex];
    if (!entry) return;
    setNavIndex(nextIndex);
    applyNavigationEntry(entry);
  };

  const goForward = () => {
    if (!canGoForward) return;
    const nextIndex = navIndex + 1;
    const entry = navHistory[nextIndex];
    if (!entry) return;
    setNavIndex(nextIndex);
    applyNavigationEntry(entry);
  };

  // Reset graph session & navigation history when switching workspaces
  const prevWorkspacePathRef = useRef<string | null>(workspacePath);
  useEffect(() => {
    if (prevWorkspacePathRef.current !== workspacePath) {
      prevWorkspacePathRef.current = workspacePath;
      setGraphSession(createDefaultGraphSession());
      setPinnedFileIds([]);
      setClosedTabHistory([]);
      setNavHistory([{ view: activeView }]);
      setNavIndex(0);
    }
  }, [workspacePath, activeView]);

  // Invariant: keep activeFileId and openFileIds synchronized with files
  useEffect(() => {
    const validFileIds = new Set(files.map((f) => f.id));
    const nextPinned = pinnedFileIds.filter((id) => validFileIds.has(id));
    if (nextPinned.length !== pinnedFileIds.length) {
      setPinnedFileIds(nextPinned);
    }
    const reconciled = reconcileEditorTabs(files, openFileIds, activeFileId, nextPinned);
    const openChanged =
      reconciled.openFileIds.length !== openFileIds.length ||
      reconciled.openFileIds.some((id, idx) => id !== openFileIds[idx]);
    if (openChanged) {
      setOpenFileIds(reconciled.openFileIds);
    }
    if (reconciled.activeFileId !== activeFileId) {
      setActiveFileId(reconciled.activeFileId);
    }
  }, [files, openFileIds, activeFileId, pinnedFileIds]);

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
  };

  // Debounced live AST Knowledge Graph refresh when workspace files change
  useEffect(() => {
    if (files.length === 0) return;
    const timer = setTimeout(() => {
      try {
        const { nodes, edges } = buildGraphFromFiles(files);
        if (nodes.length > 0) {
          setGraphNodes(nodes);
          setGraphEdges(edges);
        }
      } catch (err) {
        console.warn('Debounced AST graph update failed:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [files]);

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

    // 2.5. Direct write-back via host workspacePath (for path-opened or GitHub-cloned workspaces)
    if (workspacePath) {
      const res = await gitService.writeWorkspaceFile(workspacePath, file.path, file.content);
      if (res.success) {
        setFiles(prev => applyUpdatedAst(prev.map(f => f.id === fileId ? { ...f, isDirty: false, savedContent: f.content } : f)));
        if (isGitRepo && repoRoot) {
          refreshGitStatus();
        }
        return;
      } else if (res.error) {
        setSaveError(`Failed to save "${file.name}" to disk: ${res.error}`);
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
    } else if (workspacePath) {
      const res = await gitService.writeWorkspaceFile(workspacePath, path, initialContent);
      if (!res.success) {
        setSaveError(`Failed to create "${fileName}" on disk: ${res.error || 'Write error'}`);
        return null;
      }
    }

    const newFile: ProjectFile = {
      id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: fileName,
      path,
      language: ext === 'c' || ext === 'h' ? 'c' : ext === 'py' ? 'python' : ext === 'json' ? 'json' : ext === 'html' ? 'html' : ext === 'css' ? 'css' : ext === 'md' ? 'markdown' : 'typescript',
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
    if (isGitRepo && repoRoot) refreshGitStatus();
    return newFile;
  };

  const createFolder = async (folderPath: string): Promise<boolean> => {
    const clean = folderPath.trim().replace(/^\/+|\/+$/g, '');
    if (!clean) return false;

    if (directoryHandleRef.current) {
      try {
        await createFileOnDisk(directoryHandleRef.current, `${clean}/.gitkeep`, '');
      } catch (err: any) {
        setSaveError(`Failed to create folder "${clean}": ${err?.message || err}`);
        return false;
      }
    } else if (workspacePath) {
      const res = await gitService.mkdirWorkspace(workspacePath, clean);
      if (!res.success) {
        setSaveError(`Failed to create folder "${clean}": ${res.error}`);
        return false;
      }
    }

    await createFile('.gitkeep', clean, '// folder placeholder\n');
    return true;
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
    } else if (workspacePath) {
      const res = await gitService.deleteWorkspaceFile(workspacePath, file.path);
      if (!res.success) {
        setSaveError(`Failed to delete "${file.name}" from disk: ${res.error}`);
        return false;
      }
    }

    // Disk deletion succeeded (or mock mode): update state
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      return applyUpdatedAst(updated);
    });
    closeFile(fileId);
    if (isGitRepo && repoRoot) refreshGitStatus();
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
    } else if (workspacePath) {
      const res = await gitService.renameWorkspaceFile(workspacePath, file.path, newPath);
      if (!res.success) {
        setSaveError(`Failed to rename "${file.name}" on disk: ${res.error}`);
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
          setRemoteUrl(statusRes.remoteUrl || '');
          setGithubLinkedRepo(statusRes.githubRepo || null);
          setStagedFiles(statusRes.stagedFiles || []);
          setUnstagedFiles(statusRes.unstagedFiles || []);
          setGitAhead(statusRes.ahead || 0);
          setGitBehind(statusRes.behind || 0);

          // Sync stagedFileIds for in-memory files matching staged paths
          const stagedPaths = (statusRes.stagedFiles || []).map(f => f.path);
          setStagedFileIds(files.filter(f => stagedPaths.includes(f.path)).map(f => f.id));

          // Fetch branches and genuine repository commits
          const [logRes, branchesRes] = await Promise.all([
            gitService.getLog(root, 25),
            gitService.getBranches(root),
          ]);
          if (logRes.success) {
            setGitCommits(logRes.commits || []);
          } else if (logRes.error) {
            setGitCommits([]);
          }
          if (branchesRes.success) {
            setGitBranches(branchesRes.branches || []);
          }
        } else {
          setStagedFiles([]);
          setUnstagedFiles([]);
          setGitCommits([]);
          setGitBranch('');
          setRemoteUrl('');
          setGithubLinkedRepo(null);
          setGitBranches([]);
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
        setTerminalCwd(resolved.workspacePath);
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
        setWorkspacePath(null);
        setTerminalCwd('');
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
      // Re-read file content from disk or remove if untracked file was deleted
      if (file) {
        if (res.deleted) {
          setFiles(prev => prev.filter(f => f.id !== file.id));
          closeFile(file.id);
        } else {
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
      const res = await gitService.commit(
        repoRoot,
        trimmed,
        githubUser?.name || githubUser?.login,
        githubUser?.email
      );
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
                  setTerminalCwd(resolved.workspacePath);
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
                  setWorkspacePath(null);
                  setTerminalCwd('');
                  setIsGitRepo(false);
                  setRepoRoot(null);
                  setGitBranch('');
                  setGitCommits([]);
                  if (meta?.workspacePath) {
                    saveWorkspaceMeta({ ...meta, workspacePath: undefined, repoRoot: undefined });
                  }
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
    const { result, impactedStatusByNodeId } = analyzeChangeImpact(
      targetId,
      files,
      graphNodes,
      graphEdges
    );
    setCiaResult(result);
    setGraphNodes(prev =>
      prev.map(node => ({
        ...node,
        impactStatus: impactedStatusByNodeId.get(node.id) || 'none',
      }))
    );
    setGraphEdges(prev =>
      prev.map(edge => ({
        ...edge,
        isImpactPath:
          impactedStatusByNodeId.has(edge.source) || impactedStatusByNodeId.has(edge.target),
      }))
    );
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
    const result = executeGraphQuery(query, graphNodes, graphEdges);
    setCypherResult(result);
    setIsExecutingCypher(false);
    return result;
  };

  const traceCallPath = async (symbolName: string, direction: 'inbound' | 'outbound', depth: number): Promise<TracePathResult> => {
    setIsTracingPath(true);
    const result = traceSymbolCallPath(symbolName, direction, depth, files, graphNodes, graphEdges);
    setTraceResult(result);
    setIsTracingPath(false);
    return result;
  };

  const runTerminalCommand = async (command: string): Promise<void> => {
    const activeRoot = workspacePath || repoRoot || '';
    const activeCwd = terminalCwd || activeRoot;
    setIsRunningCommand(true);
    const res = await gitService.execTerminal(command, activeCwd || undefined, activeRoot || undefined);
    const nextCwd = res.cwd || activeCwd;
    if (nextCwd) {
      setTerminalCwd(nextCwd);
    }
    const errOutput = res.stderr || res.error || '';
    setTerminalHistory(prev => [
      ...prev,
      {
        id: 'term-' + Date.now(),
        command,
        cwd: nextCwd,
        stdout: res.stdout || '',
        stderr: errOutput,
        exitCode: res.exitCode ?? (res.success ? 0 : 1),
        shell: res.shell,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setIsRunningCommand(false);
    // Refresh workspace or git status if a command might have modified files
    if (isGitRepo && repoRoot) {
      refreshGitStatus();
    }
  };

  const clearTerminal = () => {
    setTerminalHistory([]);
  };

  const refreshGitHubAuthStatus = async (): Promise<void> => {
    // Purge any legacy plaintext token from browser localStorage
    try {
      localStorage.removeItem('intellicode_github_token');
      localStorage.removeItem('intellicode_github_user');
    } catch {
      // ignore
    }

    const res = await githubService.getAuthStatus();
    setGithubOAuthConfigured(Boolean(res.oauthConfigured));
    setGithubCliAvailable(Boolean(res.ghCliAvailable));

    if (res.authenticated && res.user) {
      setGithubUser(res.user);
      setGithubAuthMethod(res.authMethod || null);
      setGithubError(null);
    } else {
      setGithubUser(null);
      setGithubAuthMethod(null);
      if (res.expired && res.error) {
        setGithubError(res.error);
      }
    }
  };

  useEffect(() => {
    refreshGitHubAuthStatus();
  }, []);

  const fetchGitHubRepos = async (): Promise<void> => {
    setIsGitHubLoading(true);
    setGithubError(null);
    const res = await githubService.listRepos();
    if (res.success && res.repos) {
      setGithubRepos(res.repos);
    } else if (res.unauthorized) {
      setGithubUser(null);
      setGithubAuthMethod(null);
      setGithubRepos([]);
      setGithubError(res.error || 'GitHub session expired. Please sign in again.');
    } else if (res.error) {
      setGithubError(res.error);
    }
    setIsGitHubLoading(false);
  };

  const setAuthenticatedGitHubUser = async (
    user: GitHubUser,
    method: 'oauth' | 'gh-cli' | 'pat'
  ): Promise<void> => {
    setGithubUser(user);
    setGithubAuthMethod(method);
    setGithubError(null);
    await fetchGitHubRepos();
  };

  const loginWithGitHubCli = async (): Promise<boolean> => {
    setIsGitHubLoading(true);
    setGithubError(null);
    const res = await githubService.loginWithCli();
    if (!res.success || !res.user) {
      setGithubError(res.error || 'Failed to authenticate with GitHub CLI');
      setIsGitHubLoading(false);
      return false;
    }
    setGithubUser(res.user);
    setGithubAuthMethod('gh-cli');
    await fetchGitHubRepos();
    setIsGitHubLoading(false);
    return true;
  };

  const loginWithGitHubToken = async (token: string): Promise<boolean> => {
    const cleanToken = token.trim();
    if (!cleanToken) return false;
    setIsGitHubLoading(true);
    setGithubError(null);
    const res = await githubService.loginWithPat(cleanToken);
    if (!res.success || !res.user) {
      setGithubError(res.error || 'Failed to authenticate with GitHub');
      setIsGitHubLoading(false);
      return false;
    }
    setGithubUser(res.user);
    setGithubAuthMethod('pat');
    await fetchGitHubRepos();
    setIsGitHubLoading(false);
    return true;
  };

  const logoutGitHub = async () => {
    await githubService.logout();
    setGithubUser(null);
    setGithubAuthMethod(null);
    setGithubRepos([]);
    setGithubError(null);
    try {
      localStorage.removeItem('intellicode_github_token');
      localStorage.removeItem('intellicode_github_user');
    } catch {
      // ignore
    }
  };

  const cloneGitHubRepo = async (repo: GitHubRepo): Promise<boolean> => {
    setIsGitHubLoading(true);
    setGithubError(null);
    const res = await githubService.cloneRepo({
      cloneUrl: repo.cloneUrl,
      repoName: repo.name,
      owner: repo.owner,
    });
    if (!res.success || !res.workspacePath) {
      setGithubError(res.error || 'Failed to clone repository');
      setIsGitHubLoading(false);
      return false;
    }

    const repoFiles: ProjectFile[] =
      res.files && res.files.length > 0
        ? res.files
        : [
            {
              id: 'file-readme-' + Date.now(),
              name: 'README.md',
              path: 'README.md',
              language: 'markdown',
              content: `# ${repo.name}\n\n${repo.description || 'Repository cloned via IntelliCode IDE.'}\n`,
              savedContent: `# ${repo.name}\n\n${repo.description || 'Repository cloned via IntelliCode IDE.'}\n`,
              isDirty: false,
            },
          ];

    loadExternalFiles(repoFiles, repo.name, undefined, res.workspacePath);
    setTerminalCwd(res.workspacePath);
    setRemoteUrl(repo.cloneUrl);
    setGithubLinkedRepo({ owner: repo.owner, repo: repo.name });
    setActiveView('editor');
    setIsGitHubModalOpen(false);
    setIsGitHubLoading(false);
    return true;
  };

  const createGitHubRepo = async (
    name: string,
    description: string,
    isPrivate: boolean
  ): Promise<GitHubRepo | null> => {
    if (!githubUser) {
      setGithubError('Please sign in with GitHub first.');
      return null;
    }
    setIsGitHubLoading(true);
    setGithubError(null);
    const res = await githubService.createRepo(name, description, isPrivate);
    if (res.unauthorized) {
      setGithubUser(null);
      setGithubAuthMethod(null);
    }
    if (!res.success || !res.repo) {
      setGithubError(res.error || 'Failed to create repository');
      setIsGitHubLoading(false);
      return null;
    }
    setGithubRepos(prev => [res.repo!, ...prev]);
    setIsGitHubLoading(false);
    return res.repo;
  };

  const publishToGitHub = async (
    repoName: string,
    description: string,
    isPrivate: boolean
  ): Promise<boolean> => {
    if (!githubUser) {
      setGithubError('Please sign in with GitHub first.');
      return false;
    }
    setGitLoading(true);
    setGitError(null);
    setGitSyncMessage(null);
    const res = await githubService.publishWorkspace({
      workspacePath,
      repoName,
      description,
      isPrivate,
      authorName: githubUser.name || githubUser.login,
      authorEmail: githubUser.email,
      files: files.map(f => ({ path: f.path, content: f.content })),
    });
    if (res.unauthorized) {
      setGithubUser(null);
      setGithubAuthMethod(null);
    }

    if (!res.success || !res.repoRoot) {
      setGitError(res.error || 'Failed to publish repository to GitHub');
      setGitLoading(false);
      return false;
    }

    setWorkspacePath(res.workspacePath || res.repoRoot);
    setRepoRoot(res.repoRoot);
    setIsGitRepo(true);
    setGitBranch(res.branch || 'main');
    setRemoteUrl(res.remoteUrl || '');
    if (res.repo) {
      setGithubLinkedRepo({ owner: res.repo.owner, repo: res.repo.name });
      setGithubRepos(prev => [res.repo!, ...prev]);
    }
    setMasterPrompt(prev => ({
      ...prev,
      projectName: repoName,
      lastSynced: 'Published to GitHub',
    }));
    setGitSyncMessage(`Published to GitHub (${isPrivate ? 'Private' : 'Public'})`);
    await refreshGitStatus(res.repoRoot);
    setGitLoading(false);
    return true;
  };

  const fetchFromRemote = async (): Promise<boolean> => {
    if (!repoRoot) {
      setGitError('No active Git repository on disk.');
      return false;
    }
    setGitLoading(true);
    setGitError(null);
    setGitSyncMessage(null);
    const res = await gitService.fetch(repoRoot, githubToken || undefined);
    if (!res.success) {
      setGitError(res.error || 'Failed to fetch from remote');
      setGitLoading(false);
      return false;
    }
    if (typeof res.ahead === 'number') setGitAhead(res.ahead);
    if (typeof res.behind === 'number') setGitBehind(res.behind);
    setGitSyncMessage(res.output || 'Fetched remote updates.');
    await refreshGitStatus(repoRoot);
    setGitLoading(false);
    return true;
  };

  const pushToGitHub = async (): Promise<boolean> => {
    if (!repoRoot) {
      setGitError('No active Git repository on disk.');
      return false;
    }
    setGitLoading(true);
    setGitError(null);
    setGitSyncMessage(null);
    const res = await gitService.push(repoRoot, gitBranch || undefined, githubToken || undefined);
    if (!res.success) {
      setGitError(res.error || 'Failed to push to GitHub');
      setGitLoading(false);
      return false;
    }
    setGitSyncMessage(res.output || `Pushed to origin/${gitBranch || 'main'}`);
    await refreshGitStatus(repoRoot);
    setGitLoading(false);
    return true;
  };

  const pullFromGitHub = async (): Promise<boolean> => {
    if (!repoRoot) {
      setGitError('No active Git repository on disk.');
      return false;
    }
    setGitLoading(true);
    setGitError(null);
    setGitSyncMessage(null);
    const res = await gitService.pull(repoRoot, gitBranch || undefined, githubToken || undefined);
    if (!res.success) {
      setGitError(res.error || 'Failed to pull from GitHub');
      setGitLoading(false);
      return false;
    }
    setGitSyncMessage(res.output || `Pulled from origin/${gitBranch || 'main'}`);
    // Reload updated workspace files from disk
    if (workspacePath) {
      const folderRes = await gitService.readWorkspaceFolder(workspacePath);
      if (folderRes.success && folderRes.files) {
        setFiles(folderRes.files);
      }
    }
    await refreshGitStatus(repoRoot);
    setGitLoading(false);
    return true;
  };

  const switchBranch = async (branch: string, create = false): Promise<boolean> => {
    if (!repoRoot) return false;
    setGitLoading(true);
    setGitError(null);
    const res = await gitService.checkout(repoRoot, branch, create);
    if (!res.success) {
      setGitError(res.error || 'Failed to switch branch');
      setGitLoading(false);
      return false;
    }
    setGitBranch(branch);
    if (workspacePath) {
      const folderRes = await gitService.readWorkspaceFolder(workspacePath);
      if (folderRes.success && folderRes.files) {
        setFiles(folderRes.files);
      }
    }
    await refreshGitStatus(repoRoot);
    setGitLoading(false);
    return true;
  };

  const applyGeneratedFiles = async (genFiles: AIGeneratedFile[]): Promise<number> => {
    if (!genFiles || genFiles.length === 0) return 0;

    // If workspace is empty and no workspacePath is set yet, create a real workspace directory on disk if possible
    let activeHostPath = workspacePath;
    if (!activeHostPath && !directoryHandleRef.current && files.length === 0) {
      const folderRes = await gitService.createWorkspaceDir(
        masterPrompt.projectName && masterPrompt.projectName !== 'workspace'
          ? masterPrompt.projectName
          : `ai-project-${Date.now().toString().slice(-4)}`,
        genFiles.map(g => ({ path: g.path, content: g.content }))
      );
      if (folderRes.success && folderRes.workspacePath) {
        activeHostPath = folderRes.workspacePath;
        setWorkspacePath(folderRes.workspacePath);
        setTerminalCwd(folderRes.workspacePath);
        setMasterPrompt(prev => ({
          ...prev,
          projectName: folderRes.folderName || prev.projectName,
        }));
      }
    }

    let appliedCount = 0;
    const updatedFiles = [...files];
    const newlyOpenedIds: string[] = [...openFileIds];
    let lastTouchedId = activeFileId;

    for (const gf of genFiles) {
      const cleanPath = gf.path.replace(/\\/g, '/').replace(/^\/+/, '');
      if (!cleanPath) continue;
      const fileName = cleanPath.split('/').pop() || cleanPath;
      const ext = fileName.split('.').pop()?.toLowerCase() || 'ts';
      const lang =
        gf.language ||
        (ext === 'c' || ext === 'h'
          ? 'c'
          : ext === 'py'
            ? 'python'
            : ext === 'json'
              ? 'json'
              : ext === 'html'
                ? 'html'
                : ext === 'css'
                  ? 'css'
                  : ext === 'md'
                    ? 'markdown'
                    : 'typescript');

      // Persist to disk if handle or workspacePath exists
      if (directoryHandleRef.current) {
        try {
          await createFileOnDisk(directoryHandleRef.current, cleanPath, gf.content);
        } catch (err) {
          console.warn('Could not write AI file to directory handle:', err);
        }
      } else if (activeHostPath) {
        await gitService.writeWorkspaceFile(activeHostPath, cleanPath, gf.content);
      }

      const existingIdx = updatedFiles.findIndex(f => f.path === cleanPath);
      if (existingIdx >= 0) {
        updatedFiles[existingIdx] = {
          ...updatedFiles[existingIdx],
          content: gf.content,
          savedContent: activeHostPath || directoryHandleRef.current ? gf.content : updatedFiles[existingIdx].savedContent,
          isDirty: !(activeHostPath || directoryHandleRef.current),
          isModified: true,
        };
        lastTouchedId = updatedFiles[existingIdx].id;
        if (!newlyOpenedIds.includes(lastTouchedId)) newlyOpenedIds.push(lastTouchedId);
      } else {
        const newId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        updatedFiles.push({
          id: newId,
          name: fileName,
          path: cleanPath,
          language: lang,
          content: gf.content,
          savedContent: gf.content,
          isDirty: false,
          isModified: true,
        });
        lastTouchedId = newId;
        newlyOpenedIds.push(newId);
      }
      appliedCount++;
    }

    setFiles(applyUpdatedAst(updatedFiles));
    setOpenFileIds(newlyOpenedIds);
    if (lastTouchedId) {
      setActiveFileId(lastTouchedId);
      setActiveView('editor');
    }
    if (isGitRepo && repoRoot) {
      refreshGitStatus();
    }
    return appliedCount;
  };

  const stopAIGeneration = () => {
    if (aiAbortRef.current) {
      aiAbortRef.current.abort();
      aiAbortRef.current = null;
    }
    setIsGeneratingAI(false);
  };

  const runPromptAgainstModel = async (historySnapshot: ChatMessage[]) => {
    const hasBackendKey = Boolean(configuredProviders[activeModel.providerKey]);
    if (activeModel.requiresApiKey !== false && !hasBackendKey) {
      setChatMessages(prev => [
        ...prev,
        {
          id: 'msg-key-' + (Date.now() + 1),
          sender: 'assistant',
          model: activeModel.name,
          content: `API key required for **${activeModel.name}** (${activeModel.provider}). Add your API key below or in the Model Gateway to run prompts.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
          needsApiKey: {
            providerKey: activeModel.providerKey,
            providerName: activeModel.provider,
          },
        },
      ]);
      return;
    }

    const controller = new AbortController();
    aiAbortRef.current = controller;
    setIsGeneratingAI(true);
    const streamMsgId = 'msg-' + (Date.now() + 1);

    try {
      const activeFile = files.find(f => f.id === activeFileId);
      const bundle = selectRelevantContext({
        projectName: masterPrompt.projectName || 'workspace',
        files,
        activeFile,
        selectedCode: selectedEditorCode,
        attachedPaths: attachedContextPaths,
        graphNodes,
        graphEdges,
        diagnostics,
        ciaResult,
      });
      setLastContextBundle(bundle);

      setChatMessages(prev => [
        ...prev,
        {
          id: streamMsgId,
          sender: 'assistant',
          model: activeModel.name,
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contextContinuity: true,
        },
      ]);

      const result = await sendModelRequest({
        model: activeModel,
        messages: historySnapshot,
        systemPrompt: bundle.systemPrompt,
        signal: controller.signal,
        onDelta: (partial) => {
          setChatMessages(prev =>
            prev.map(m => (m.id === streamMsgId ? { ...m, content: partial } : m))
          );
        },
      });

      await refreshAiKeyStatuses();

      if (!result.success || !result.content) {
        setChatMessages(prev =>
          prev.map(m =>
            m.id === streamMsgId
              ? {
                  ...m,
                  content: result.aborted
                    ? 'Generation stopped by user.'
                    : `Error from ${activeModel.name}: ${result.error || 'No response received.'}`,
                  isError: !result.aborted,
                }
              : m
          )
        );
        return;
      }

      const generatedFiles = parseGeneratedFilesFromResponse(result.content);
      const usedTokens = result.usage?.totalTokens || 0;

      setChatMessages(prev =>
        prev.map(m =>
          m.id === streamMsgId
            ? {
                ...m,
                content: result.content!,
                tokensUsed: usedTokens > 0 ? usedTokens : undefined,
                contextContinuity: true,
                generatedFiles: generatedFiles.length > 0 ? generatedFiles : undefined,
              }
            : m
        )
      );
    } finally {
      aiAbortRef.current = null;
      setIsGeneratingAI(false);
    }
  };

  const sendChatMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const historySnapshot = [...chatMessages, userMsg];
    setChatMessages(historySnapshot);

    if (trimmed.startsWith('[SYSTEM EVENT:')) {
      return;
    }

    await runPromptAgainstModel(historySnapshot);
  };

  const retryLastChatMessage = async () => {
    if (isGeneratingAI) return;
    const lastUserIdx = [...chatMessages].reverse().findIndex(m => m.sender === 'user');
    if (lastUserIdx === -1) return;
    const actualIdx = chatMessages.length - 1 - lastUserIdx;
    const snapshot = chatMessages.slice(0, actualIdx + 1);
    setChatMessages(snapshot);
    await runPromptAgainstModel(snapshot);
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
        allModels,
        customModels,
        addCustomModel,
        removeCustomModel,
        configuredProviders,
        providerStatuses,
        refreshAiKeyStatuses,
        setApiKey,
        isGeneratingAI,
        stopAIGeneration,
        retryLastChatMessage,
        attachedContextPaths,
        setAttachedContextPaths,
        selectedEditorCode,
        setSelectedEditorCode,
        lastContextBundle,
        applyGeneratedFiles,
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
        createFolder,
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
        appTheme,
        setAppTheme,
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
        toggleProblemsPanel,
        isTerminalOpen,
        setIsTerminalOpen,
        toggleTerminal,
        terminalHistory,
        terminalCwd,
        isRunningCommand,
        runTerminalCommand,
        clearTerminal,
        githubUser,
        githubToken,
        githubAuthMethod,
        githubOAuthConfigured,
        githubCliAvailable,
        githubRepos,
        isGitHubModalOpen,
        setIsGitHubModalOpen,
        isGitHubLoading,
        githubError,
        gitSyncMessage,
        remoteUrl,
        githubLinkedRepo,
        gitBranches,
        gitAhead,
        gitBehind,
        fetchFromRemote,
        refreshGitHubAuthStatus,
        loginWithGitHubCli,
        setAuthenticatedGitHubUser,
        loginWithGitHubToken,
        logoutGitHub,
        fetchGitHubRepos,
        cloneGitHubRepo,
        createGitHubRepo,
        publishToGitHub,
        pushToGitHub,
        pullFromGitHub,
        switchBranch,
        graphSession,
        setGraphSession,
        updateGraphSession,
        resetGraphSession,
        isGraphGuideOpen,
        setIsGraphGuideOpen,
        canGoBack,
        canGoForward,
        goBack,
        goForward,
        recordNavigation,
        pinnedFileIds,
        closedTabHistory,
        togglePinTab,
        closeOtherTabs,
        closeTabsToRight,
        closeSavedTabs,
        closeAllTabs,
        reopenClosedTab,
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
