export type ActiveView = 
  | 'editor' 
  | 'graph' 
  | 'cia' 
  | 'mcp' 
  | 'validation' 
  | 'evaluation' 
  | 'analyzer';

export type SidebarView = 'explorer' | 'search' | 'git' | 'settings';

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  showMinimap: boolean;
  lineNumbers: boolean;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  time: string;
  filesCount?: number;
}

export interface SearchMatch {
  fileId: string;
  filePath: string;
  fileName: string;
  lineNumber: number;
  lineText: string;
  matchStart: number;
  matchEnd: number;
  isSymbol?: boolean;
  symbolKind?: string;
}

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  action: () => void | Promise<void>;
  icon?: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  savedContent?: string;
  isModified?: boolean;
  isDirty?: boolean;
  impactLevel?: 'none' | 'direct' | 'indirect' | 'modified';
  symbols?: SymbolInfo[];
  /** FileSystemFileHandle from the File System Access API. Present only when the
   *  file was imported via showDirectoryPicker and write-back is available. */
  fileHandle?: FileSystemFileHandle;
}

export interface SymbolInfo {
  id: string;
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'type';
  line: number;
  exported: boolean;
  calls?: string[];
  calledBy?: string[];
}

export type CBMNodeType = 'Function' | 'Class' | 'File' | 'Route' | 'Module' | 'Test' | 'MCP';
export type CBMEdgeType = 
  | 'CALLS' 
  | 'CALL_REFERENCE' 
  | 'IMPORTS' 
  | 'DEFINES' 
  | 'HTTP_CALLS' 
  | 'DATA_FLOWS' 
  | 'INHERITS' 
  | 'TESTS';

export interface GraphNode {
  id: string;
  label: string;
  type: CBMNodeType;
  module: string;
  cluster?: string;
  architectureArea?: 'frontend' | 'backend' | 'database' | 'utilities' | 'tests' | 'core';
  isGenerated?: boolean;
  path: string;
  impactStatus: 'none' | 'modified' | 'direct' | 'indirect';
  x?: number;
  y?: number;
  connectionsCount?: number;
  returnType?: string;
  loc?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: CBMEdgeType;
  label?: string;
  isImpactPath?: boolean;
  confidence?: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'Anthropic' | 'OpenAI' | 'Google' | 'DeepSeek' | 'Meta';
  version: string;
  badge: string;
  contextWindow: string;
  costPer1k: string;
  description: string;
  color: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  model?: string;
  content: string;
  timestamp: string;
  tokensUsed?: number;
  tokensSaved?: number;
  contextContinuity?: boolean;
  affectedComponents?: string[];
  suggestedAction?: {
    type: 'run_tests' | 'view_graph' | 'view_impact' | 'apply_patch';
    label: string;
  };
}

export interface CIAResult {
  targetId: string;
  targetName: string;
  targetPath: string;
  blastRadiusScore: number; // 0 - 100
  severity: 'low' | 'moderate' | 'high' | 'critical';
  directAffected: {
    id: string;
    name: string;
    path: string;
    reason: string;
    type: 'component' | 'service' | 'state' | 'controller';
  }[];
  indirectAffected: {
    id: string;
    name: string;
    path: string;
    depth: number;
    reason: string;
  }[];
  recommendedTests: {
    id: string;
    file: string;
    testSuite: string;
    priority: 'urgent' | 'high' | 'recommended';
    reason: string;
  }[];
}

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  transport: 'stdio' | 'sse' | 'http';
  toolsCount: number;
  apiConfigured: boolean;
  isPrimaryEngine?: boolean;
  tools: MCPTool[];
}

export interface MCPTool {
  name: string;
  description: string;
  permission: 'read' | 'write' | 'execute';
  enabled: boolean;
  sampleArgs: Record<string, any>;
}

export interface TestSuite {
  id: string;
  name: string;
  file: string;
  category: 'unit' | 'integration' | 'e2e';
  status: 'idle' | 'running' | 'passed' | 'failed';
  duration?: string;
  testsCount: number;
  passedCount: number;
  failedCount: number;
  impactScore?: number;
  coverage?: number;
}

export interface EvaluationExperiment {
  id: string;
  title: string;
  hypothesis: string;
  description: string;
  metrics: {
    label: string;
    conventional: string | number;
    intelliCode: string | number;
    improvement: string;
  }[];
  status: 'ready' | 'running' | 'completed';
}

export interface CypherQueryResult {
  query: string;
  executionTimeMs: number;
  columns: string[];
  rows: Record<string, any>[];
}

export interface TracePathResult {
  symbol: string;
  direction: 'inbound' | 'outbound';
  depth: number;
  executionTimeMs: number;
  paths: {
    source: string;
    target: string;
    edge: string;
    file: string;
    line: number;
  }[];
}
