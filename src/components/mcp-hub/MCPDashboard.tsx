import React, { useState } from 'react';
import { useIDE } from '../../context/IDEContext';
import { MCPServer, MCPTool } from '../../types/ide';
import { 
  Layers, 
  Server, 
  Terminal, 
  Key, 
  ShieldCheck, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Check, 
  Lock, 
  ExternalLink,
  Code2,
  Database,
  Globe,
  Github,
  MessageSquare,
  FolderSync,
  Radio,
  Sparkles
} from 'lucide-react';

export const MCPDashboard: React.FC = () => {
  const { mcpServers, toggleMcpTool, toggleMcpServer } = useIDE();
  const [selectedServer, setSelectedServer] = useState<MCPServer>(mcpServers[0]);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(mcpServers[0].tools[0] || null);
  const [toolArgsJson, setToolArgsJson] = useState<string>(
    JSON.stringify(mcpServers[0].tools[0]?.sampleArgs || {}, null, 2)
  );
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  const getIcon = (name: string) => {
    switch (name) {
      case 'Github': return Github;
      case 'Database': return Database;
      case 'Globe': return Globe;
      case 'MessageSquare': return MessageSquare;
      default: return FolderSync;
    }
  };

  const handleSelectTool = (tool: MCPTool) => {
    setSelectedTool(tool);
    setToolArgsJson(JSON.stringify(tool.sampleArgs, null, 2));
    setExecutionOutput(null);
  };

  const handleExecuteTool = async () => {
    if (!selectedTool) return;
    setIsExecuting(true);
    setExecutionOutput(null);

    await new Promise(r => setTimeout(r, 800));

    let mockResponse: any;
    if (selectedTool.name === 'run_e2e_checkout_flow') {
      mockResponse = {
        jsonrpc: "2.0",
        id: "call_mcp_9012",
        result: {
          status: "PASSED",
          stepsExecuted: 4,
          url: "http://localhost:3000/checkout",
          trace: [
            "1. Cart payload initialized ($49.00)",
            "2. Triggered processPayment() via paymentService.ts",
            "3. Gateway response received: AUTH_OK_889",
            "4. Confirmation screen verified"
          ],
          duration: "1.82s"
        }
      };
    } else if (selectedTool.name === 'introspect_schema') {
      mockResponse = {
        jsonrpc: "2.0",
        id: "call_mcp_9013",
        result: {
          schema: "public",
          tables: ["users", "orders", "payment_transactions", "cart_items"],
          constraints: [
            "orders.user_id -> users.id (CASCADE)",
            "payment_transactions.order_id -> orders.id (RESTRICT)"
          ]
        }
      };
    } else {
      mockResponse = {
        jsonrpc: "2.0",
        id: "call_mcp_9014",
        result: {
          success: true,
          tool: selectedTool.name,
          server: selectedServer.name,
          timestamp: new Date().toISOString(),
          data: "Simulated MCP operation completed with zero authentication prompt."
        }
      };
    }

    setExecutionOutput(JSON.stringify(mockResponse, null, 2));
    setIsExecuting(false);
  };

  return (
    <div className="flex-1 bg-ide-bg h-[calc(100vh-3.5rem-1.75rem)] overflow-y-auto p-6 select-none font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-ide-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Layers className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white">Centralized MCP & Integration Hub</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Unified Protocol
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Eliminate fragmented per-project setup. Centralize MCP servers, tool definitions, permissions, and API keys across Claude, GPT-4o, Gemini, and DeepSeek.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsVaultOpen(!isVaultOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ide-panel hover:bg-ide-hover border border-ide-border text-slate-300 text-xs font-mono transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Central Key Vault</span>
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Connect MCP Server</span>
            </button>
          </div>
        </div>

        {/* Central Key Vault Modal / Bar */}
        {isVaultOpen && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/20 via-ide-panel to-ide-card border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 font-mono">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Centralized Credentials & API Key Vault</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Configured once, inherited by all models</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-ide-card border border-ide-border flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">GITHUB_PERSONAL_ACCESS_TOKEN</span>
                  <span className="text-emerald-400 font-bold">ghp_••••••••••••94b</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="p-2.5 rounded-lg bg-ide-card border border-ide-border flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">POSTGRES_CONNECTION_URI</span>
                  <span className="text-emerald-400 font-bold">postgresql://•••••••:5432</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="p-2.5 rounded-lg bg-ide-card border border-ide-border flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">STRIPE_SECRET_KEY</span>
                  <span className="text-emerald-400 font-bold">sk_test_•••••••••88f</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>
        )}

        {/* Servers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mcpServers.map((server) => {
            const Icon = getIcon(server.icon);
            const isSelected = selectedServer.id === server.id;
            const isConnected = server.status === 'connected';

            return (
              <div
                key={server.id}
                onClick={() => {
                  setSelectedServer(server);
                  if (server.tools.length > 0) {
                    handleSelectTool(server.tools[0]);
                  }
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-ide-panel border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/40'
                    : 'bg-ide-panel/60 border-ide-border hover:bg-ide-panel hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-800 text-cyan-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white font-mono">{server.name}</h3>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          Transport: {server.transport}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMcpServer(server.id);
                      }}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                        isConnected
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {isConnected ? 'ONLINE' : 'OFFLINE'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {server.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-ide-border/60 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="text-slate-300">{server.tools.length} Tools Exposed</span>
                  <span className="text-cyan-400 flex items-center gap-1">
                    Manage Tools →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Server Details & Tool Execution Tester */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tool Definitions & Permissions (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>Exposed Tools: {selectedServer.name}</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Fine-grained RBAC</span>
            </div>

            <div className="space-y-2">
              {selectedServer.tools.map((tool) => {
                const isSelected = selectedTool?.name === tool.name;
                return (
                  <div
                    key={tool.name}
                    onClick={() => handleSelectTool(tool)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-ide-card border-cyan-500/60 shadow-sm'
                        : 'bg-ide-panel/80 border-ide-border hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {tool.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded ${
                          tool.permission === 'read' ? 'bg-blue-500/20 text-blue-300' :
                          tool.permission === 'write' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-purple-500/20 text-purple-300'
                        }`}>
                          {tool.permission}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMcpTool(selectedServer.id, tool.name);
                          }}
                          className={`w-6 h-3.5 rounded-full transition-colors relative p-0.5 ${
                            tool.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                            tool.enabled ? 'translate-x-2.5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 font-sans mt-1 leading-snug">
                      {tool.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Tool Sandbox (7 cols) */}
          <div className="lg:col-span-7 bg-ide-panel border border-ide-border rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-ide-border">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white font-mono">
                    MCP Tool Execution Sandbox: <span className="text-cyan-300">{selectedTool?.name}</span>
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  JSON-RPC 2.0
                </span>
              </div>

              {/* JSON Parameters Input */}
              <div className="mt-3 space-y-1.5">
                <label className="text-[11px] font-mono text-slate-400">Call Arguments (JSON):</label>
                <textarea
                  rows={5}
                  value={toolArgsJson}
                  onChange={(e) => setToolArgsJson(e.target.value)}
                  className="w-full bg-code p-3 rounded-lg border border-ide-border text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              {/* Execution Output */}
              {executionOutput && (
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400">
                    <span>Tool Call Response (Success):</span>
                    <span className="text-slate-500">Latency: 124ms</span>
                  </div>
                  <pre className="bg-code p-3 rounded-lg border border-ide-border text-xs font-mono text-emerald-300 overflow-x-auto max-h-48">
                    {executionOutput}
                  </pre>
                </div>
              )}
            </div>

            {/* Action trigger */}
            <div className="pt-3 border-t border-ide-border flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Permissions: {selectedTool?.permission.toUpperCase()} allowed
              </span>

              <button
                onClick={handleExecuteTool}
                disabled={isExecuting || !selectedTool?.enabled}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isExecuting ? 'Calling MCP Server...' : 'Execute Tool Call'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
