import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  ActiveView, 
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
  TracePathResult
} from '../types/ide';
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
  createFile: (name: string, folderPath?: string, content?: string) => void;
  deleteFile: (fileId: string) => void;
  renameFile: (fileId: string, newName: string) => void;
  saveFile: (fileId: string) => void;
  loadExternalFiles: (newFiles: ProjectFile[], folderName?: string) => void;
}

const IDEContext = createContext<IDEContextType | undefined>(undefined);

export const IDEProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ActiveView>('editor'); // Default to Code Editor (Knowledge Graph disabled)
  const [currentProjectId, setCurrentProjectIdState] = useState<ProjectId>('codebase-memory-mcp');
  
  // Initialize with codebase-memory-mcp repository data by default!
  const [files, setFiles] = useState<ProjectFile[]>(CBM_REPO_FILES);
  const [activeFileId, setActiveFileId] = useState<string>('cbm-cypher');
  const [openFileIds, setOpenFileIds] = useState<string[]>(['cbm-cypher', 'cbm-mcp', 'cbm-main']);
  const [activeModel, setActiveModel] = useState<AIModel>(AVAILABLE_MODELS[0]);
  const [masterPrompt, setMasterPrompt] = useState<MasterPromptData>({
    ...INITIAL_MASTER_PROMPT,
    projectName: 'DeusData / codebase-memory-mcp',
    version: 'v0.24.1 (Pure C)',
    astVersion: 'CBM-AST-TREE-SITTER',
    requirements: 'Native, extreme-performance code intelligence engine with persistent tree-sitter AST knowledge graph, Cypher query engine, BFS path tracer, and 99% token reduction for AI coding agents.'
  });
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>(CBM_GRAPH_NODES);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>(CBM_GRAPH_EDGES);
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(CBM_GRAPH_NODES[1]); // cbm_cypher_execute
  const [ciaResult, setCiaResult] = useState<CIAResult>(CBM_CIA_RESULT);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>(INITIAL_MCP_SERVERS);
  const [testSuites, setTestSuites] = useState<TestSuite[]>(INITIAL_TEST_SUITES);
  const [isExecutingTests, setIsExecutingTests] = useState<boolean>(false);
  const [experiments, setExperiments] = useState<EvaluationExperiment[]>(EVALUATION_EXPERIMENTS);
  const [isAnalyzingAST, setIsAnalyzingAST] = useState<boolean>(false);
  const [tokensSaved, setTokensSaved] = useState<number>(245800);
  const [isModelSwitchingModalOpen, setIsModelSwitchingModalOpen] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);

  // Default cypher result for codebase-memory-mcp
  const [cypherResult, setCypherResult] = useState<CypherQueryResult | null>({
    query: 'MATCH (caller)-[:CALLS]->(f:Function) WHERE f.name = "cbm_cypher_execute" RETURN caller.label AS caller, caller.type AS kind, caller.file AS source',
    executionTimeMs: 0.72,
    columns: ['caller', 'kind', 'source'],
    rows: [
      { caller: 'mcp.c', kind: 'File / MCP Handler', source: 'src/mcp/mcp.c' },
      { caller: 'cli.c', kind: 'File / CLI Runner', source: 'src/cli/cli.c' },
      { caller: 'test_cypher.c', kind: 'Test Suite', source: 'tests/test_cypher.c' }
    ]
  });
  const [isExecutingCypher, setIsExecutingCypher] = useState(false);
  
  // Default trace result for codebase-memory-mcp
  const [traceResult, setTraceResult] = useState<TracePathResult | null>({
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
  const [isTracingPath, setIsTracingPath] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-cbm',
      sender: 'assistant',
      model: 'Claude 3.5 Sonnet',
      content: `**IntelliCode Knowledge Graph Active for \`DeusData/codebase-memory-mcp\`.**

Loaded complete architectural knowledge graph from \`https://github.com/DeusData/codebase-memory-mcp.git\`:
- **Core C Architecture**:
  - \`src/main.c\` (Entry point & dispatcher)
  - \`src/cypher/cypher.c\` (Cypher query engine & parser)
  - \`src/mcp/mcp.c\` (MCP JSON-RPC 2.0 protocol server with 15 tools)
  - \`src/store/store.c\` (In-memory SQLite graph store & zstd VACUUM)
  - \`src/traces/traces.c\` (BFS call path traversal & OTLP)
  - \`src/daemon/daemon.c\` (Session coordination daemon)
- **Knowledge Graph**: 16 Nodes, 13 Edges with 5 Louvain community clusters.
- **Sub-millisecond Queries**: Query the graph via Cypher or BFS call path tracing!`,
      timestamp: '10:00 AM',
      tokensUsed: 380,
      tokensSaved: 38500,
      contextContinuity: true
    }
  ]);

  const setCurrentProjectId = (id: ProjectId) => {
    setCurrentProjectIdState(id);
    if (id === 'codebase-memory-mcp') {
      setFiles(CBM_REPO_FILES);
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
      setFiles(INITIAL_FILES);
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
    if (activeFileId === fileId && nextOpen.length > 0) {
      setActiveFileId(nextOpen[nextOpen.length - 1]);
    }
  };

  const updateFileContent = (fileId: string, content: string) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content, isModified: true, isDirty: true } : f));
    if (fileId === 'payment-service' || fileId === 'auth-service' || fileId === 'cbm-cypher') {
      runChangeImpactAnalysis(fileId);
    }
  };

  const saveFile = (fileId: string) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isDirty: false } : f));
  };

  const createFile = (name: string, folderPath?: string, content: string = '') => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const path = folderPath ? `${folderPath}/${cleanName}` : (cleanName.includes('/') ? cleanName : `src/${cleanName}`);
    const ext = cleanName.split('.').pop() || 'ts';
    const newFile: ProjectFile = {
      id: 'file-' + Date.now(),
      name: cleanName.split('/').pop() || cleanName,
      path,
      language: ext === 'c' || ext === 'h' ? 'c' : ext === 'py' ? 'python' : ext === 'json' ? 'json' : 'typescript',
      content: content || `// ${cleanName}\n// Created in IntelliCode\n\n`,
      isDirty: false
    };

    setFiles(prev => {
      const updated = [...prev, newFile];
      // Automatically refresh knowledge graph with new file AST
      try {
        const { nodes, edges } = buildGraphFromFiles(updated);
        if (nodes.length > 0) {
          setGraphNodes(nodes);
          setGraphEdges(edges);
        }
      } catch (e) {
        console.error('AST parsing failed', e);
      }
      return updated;
    });

    setOpenFileIds(prev => [...prev, newFile.id]);
    setActiveFileId(newFile.id);
  };

  const deleteFile = (fileId: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      try {
        const { nodes, edges } = buildGraphFromFiles(updated);
        if (nodes.length > 0) {
          setGraphNodes(nodes);
          setGraphEdges(edges);
        }
      } catch (e) {}
      return updated;
    });
    closeFile(fileId);
  };

  const renameFile = (fileId: string, newName: string) => {
    const clean = newName.trim();
    if (!clean) return;
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      const parts = f.path.split('/');
      parts[parts.length - 1] = clean;
      return { ...f, name: clean, path: parts.join('/') };
    }));
  };

  const loadExternalFiles = (newFiles: ProjectFile[], folderName?: string) => {
    if (newFiles.length === 0) return;
    setFiles(newFiles);
    setOpenFileIds([newFiles[0].id]);
    setActiveFileId(newFiles[0].id);
    setCurrentProjectIdState('custom');
    setMasterPrompt(prev => ({
      ...prev,
      projectName: folderName || 'Opened Workspace',
      lastSynced: 'Just now (Loaded from folder)',
      astVersion: 'AST-' + Math.random().toString(36).substring(2, 7).toUpperCase()
    }));

    // Generate dynamic Knowledge Graph from actual loaded files!
    try {
      const { nodes, edges } = buildGraphFromFiles(newFiles);
      if (nodes.length > 0) {
        setGraphNodes(nodes);
        setGraphEdges(edges);
        setSelectedGraphNode(nodes[0]);
      }
    } catch (e) {
      console.error('Failed to parse graph from loaded files', e);
    }
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
    await new Promise(r => setTimeout(r, 1500));
    setIsAnalyzingAST(false);
    setMasterPrompt(prev => ({
      ...prev,
      lastSynced: 'Just now (codebase-memory-mcp incremental rebuild)',
      astVersion: 'AST-SHA-' + Math.random().toString(36).substring(2, 8)
    }));
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
        loadExternalFiles
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
