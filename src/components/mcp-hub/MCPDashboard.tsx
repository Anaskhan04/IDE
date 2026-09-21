import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  FolderSync,
  Github,
  Globe,
  Key,
  Lock,
  MessageSquare,
  Play,
  Plus,
  Server,
  Terminal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import type { MCPServer, MCPTool } from '../../types/ide';

const permissionClass: Record<MCPTool['permission'], string> = {
  read: 'text-ide-focus',
  write: 'text-ide-amber',
  execute: 'text-ide-purple',
};

const getServerIcon = (name: string): LucideIcon => {
  switch (name) {
    case 'Github': return Github;
    case 'Database': return Database;
    case 'Globe': return Globe;
    case 'MessageSquare': return MessageSquare;
    default: return FolderSync;
  }
};

const serverState = (server: MCPServer) => {
  if (server.status === 'connected') return { label: 'Connected', className: 'text-ide-emerald', marker: 'bg-ide-emerald' };
  if (server.status === 'connecting') return { label: 'Connecting', className: 'text-ide-amber', marker: 'bg-ide-amber' };
  if (server.status === 'error') return { label: 'Error', className: 'text-ide-rose', marker: 'bg-ide-rose' };
  return { label: 'Offline', className: 'text-ide-subtle', marker: 'bg-ide-subtle' };
};

export const MCPDashboard: React.FC = () => {
  const { mcpServers, toggleMcpTool, toggleMcpServer } = useIDE();
  const [selectedServerId, setSelectedServerId] = useState<string | null>(mcpServers[0]?.id ?? null);
  const [selectedToolName, setSelectedToolName] = useState<string | null>(mcpServers[0]?.tools[0]?.name ?? null);
  const [toolArgsJson, setToolArgsJson] = useState('{}');
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const selectedServer = useMemo(
    () => mcpServers.find((server) => server.id === selectedServerId) ?? mcpServers[0] ?? null,
    [mcpServers, selectedServerId],
  );
  const selectedTool = useMemo(
    () => selectedServer?.tools.find((tool) => tool.name === selectedToolName) ?? selectedServer?.tools[0] ?? null,
    [selectedServer, selectedToolName],
  );

  useEffect(() => {
    if (!mcpServers.length) {
      setSelectedServerId(null);
      setSelectedToolName(null);
      return;
    }
    if (!mcpServers.some((server) => server.id === selectedServerId)) setSelectedServerId(mcpServers[0].id);
  }, [mcpServers, selectedServerId]);

  useEffect(() => {
    const firstToolName = selectedServer?.tools[0]?.name ?? null;
    if (!selectedServer?.tools.some((tool) => tool.name === selectedToolName)) setSelectedToolName(firstToolName);
  }, [selectedServer, selectedToolName]);

  useEffect(() => {
    setToolArgsJson(JSON.stringify(selectedTool?.sampleArgs || {}, null, 2));
    setExecutionOutput(null);
    setJsonError(null);
  }, [selectedTool?.name]);

  const handleSelectTool = (tool: MCPTool) => {
    setSelectedToolName(tool.name);
    setToolArgsJson(JSON.stringify(tool.sampleArgs, null, 2));
    setExecutionOutput(null);
    setJsonError(null);
  };

  const handleExecuteTool = async () => {
    if (!selectedServer || !selectedTool) return;
    if (selectedServer.status !== 'connected' || !selectedTool.enabled) return;

    try {
      JSON.parse(toolArgsJson);
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON. Fix the call arguments before executing.');
      return;
    }

    setIsExecuting(true);
    setExecutionOutput(null);
    await new Promise((resolve) => setTimeout(resolve, 800));

    let mockResponse: Record<string, unknown>;
    if (selectedTool.name === 'run_e2e_checkout_flow') {
      mockResponse = {
        jsonrpc: '2.0',
        id: 'call_mcp_9012',
        result: {
          status: 'PASSED',
          stepsExecuted: 4,
          url: 'http://localhost:3000/checkout',
          trace: [
            '1. Cart payload initialized ($49.00)',
            '2. Triggered processPayment() via paymentService.ts',
            '3. Gateway response received: AUTH_OK_889',
            '4. Confirmation screen verified',
          ],
          duration: '1.82s',
        },
      };
    } else if (selectedTool.name === 'introspect_schema') {
      mockResponse = {
        jsonrpc: '2.0',
        id: 'call_mcp_9013',
        result: {
          schema: 'public',
          tables: ['users', 'orders', 'payment_transactions', 'cart_items'],
          constraints: ['orders.user_id -> users.id (CASCADE)', 'payment_transactions.order_id -> orders.id (RESTRICT)'],
        },
      };
    } else {
      mockResponse = {
        jsonrpc: '2.0',
        id: 'call_mcp_9014',
        result: {
          success: true,
          tool: selectedTool.name,
          server: selectedServer.name,
          timestamp: new Date().toISOString(),
          data: 'Simulated MCP operation completed with zero authentication prompt.',
        },
      };
    }

    setExecutionOutput(JSON.stringify(mockResponse, null, 2));
    setIsExecuting(false);
  };

  return (
    <section id="mcp-workspace" className="flex h-full min-h-0 flex-col overflow-y-auto bg-ide-bg" data-purpose="mcp-workspace">
      <div className="mx-auto w-full max-w-[1220px] px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-ide-border pb-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-ide-cyan" aria-hidden="true" />
              <h1 className="text-base font-semibold text-ide-strong">MCP hub</h1>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ide-muted">Inspect connected servers, tool permissions, and the exact call response.</p>
          </div>
          <button type="button" disabled className="ide-focus-ring inline-flex min-h-[32px] cursor-not-allowed items-center gap-2 border border-ide-border-strong px-3 text-xs text-ide-subtle" title="Connecting new MCP servers is not available in this build">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Connect MCP server unavailable
          </button>
        </header>

        <div className="mt-5 border border-ide-border bg-ide-panel">
          <button type="button" onClick={() => setIsVaultOpen((open) => !open)} className="ide-focus-ring flex min-h-[38px] w-full items-center gap-2 px-3 text-left hover:bg-ide-hover">
            {isVaultOpen ? <ChevronDown className="h-3.5 w-3.5 text-ide-amber" /> : <ChevronRight className="h-3.5 w-3.5 text-ide-amber" />}
            <Key className="h-3.5 w-3.5 text-ide-amber" aria-hidden="true" />
            <span className="text-xs font-semibold text-ide-text">Centralized credentials &amp; API key vault</span>
            <span className="ml-auto font-mono text-[10px] text-ide-subtle">Configured once, inherited by tools</span>
          </button>
          {isVaultOpen && (
            <div className="grid border-t border-ide-border sm:grid-cols-3">
              {[
                ['GITHUB_PERSONAL_ACCESS_TOKEN', 'ghp_••••••••••••94b'],
                ['POSTGRES_CONNECTION_URI', 'postgresql://•••••••:5432'],
                ['STRIPE_SECRET_KEY', 'sk_test_•••••••••88f'],
              ].map(([name, value]) => (
                <div key={name} className="flex items-center justify-between gap-3 border-b border-ide-border p-3 font-mono text-[10px] sm:border-b-0 sm:border-r last:border-r-0">
                  <div className="min-w-0"><span className="block truncate text-ide-subtle">{name}</span><span className="mt-1 block truncate text-ide-text">{value}</span></div>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ide-emerald" aria-label="Configured" />
                </div>
              ))}
            </div>
          )}
        </div>

        {!selectedServer ? (
          <div className="mt-5 border-l-2 border-ide-border-strong bg-ide-panel px-4 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ide-subtle">No MCP servers</div>
            <p className="mt-2 text-sm text-ide-text">Connect a server to inspect its tools.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.8fr)]">
            <section aria-labelledby="server-register-heading" className="border border-ide-border bg-ide-panel">
              <div className="flex min-h-[40px] items-center justify-between border-b border-ide-border px-3">
                <h2 id="server-register-heading" className="text-xs font-semibold text-ide-text">Server register</h2>
                <span className="font-mono text-[10px] text-ide-subtle">{mcpServers.length} servers</span>
              </div>
              <div>
                {mcpServers.map((server) => {
                  const Icon = getServerIcon(server.icon);
                  const isSelected = server.id === selectedServer.id;
                  const status = serverState(server);
                  return (
                    <div key={server.id} className={`flex border-b border-ide-border ${isSelected ? 'border-l-2 border-l-ide-cyan bg-ide-selected' : 'border-l-2 border-l-transparent hover:bg-ide-hover/60'}`}>
                      <button type="button" onClick={() => { setSelectedServerId(server.id); setSelectedToolName(server.tools[0]?.name ?? null); }} className="ide-focus-ring min-w-0 flex-1 px-3 py-3 text-left" aria-selected={isSelected}>
                        <div className="flex items-start gap-2">
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ide-cyan" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-xs text-ide-text">{server.name}</span>
                            <span className="mt-1 block font-mono text-[10px] text-ide-subtle">{server.transport} · {server.tools.length} tools</span>
                          </span>
                        </div>
                        <span className={`mt-2 flex items-center gap-1.5 font-mono text-[10px] ${status.className}`}><span className={`h-1.5 w-1.5 ${status.marker}`} aria-hidden="true" />{status.label}</span>
                      </button>
                      <button type="button" onClick={() => toggleMcpServer(server.id)} className="ide-focus-ring self-start px-3 py-3 text-[10px] text-ide-subtle hover:text-ide-text" aria-label={`${server.status === 'connected' ? 'Disconnect' : 'Connect'} ${server.name}`}>
                        {server.status === 'connected' ? 'On' : 'Off'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="min-w-0 space-y-5">
              <section aria-labelledby="tool-manifest-heading" className="border border-ide-border bg-ide-panel">
                <div className="flex min-h-[40px] items-center justify-between border-b border-ide-border px-3">
                  <h2 id="tool-manifest-heading" className="text-xs font-semibold text-ide-text">Tool manifest <span className="font-mono text-ide-subtle">/ {selectedServer.name}</span></h2>
                  <span className="font-mono text-[10px] text-ide-subtle">Permission · state</span>
                </div>
                <div className="hidden grid-cols-[minmax(150px,0.8fr)_minmax(180px,1.5fr)_80px_72px] gap-3 border-b border-ide-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ide-subtle md:grid">
                  <span>Tool</span><span>Description</span><span>Permission</span><span>State</span>
                </div>
                {selectedServer.tools.length === 0 ? (
                  <div className="px-3 py-4 font-mono text-[10px] text-ide-subtle">No tools exposed by this server.</div>
                ) : selectedServer.tools.map((tool) => {
                  const isSelected = selectedTool?.name === tool.name;
                  return (
                    <div key={tool.name} className={`grid items-start gap-3 border-b border-ide-border px-3 py-3 md:grid-cols-[minmax(150px,0.8fr)_minmax(180px,1.5fr)_80px_72px] ${isSelected ? 'bg-ide-selected/60' : 'hover:bg-ide-hover/60'}`}>
                      <button type="button" onClick={() => handleSelectTool(tool)} className="ide-focus-ring min-w-0 text-left font-mono text-xs text-ide-text" aria-selected={isSelected}>{tool.name}</button>
                      <button type="button" onClick={() => handleSelectTool(tool)} className="ide-focus-ring text-left text-[11px] leading-relaxed text-ide-muted">{tool.description}</button>
                      <span className={`font-mono text-[10px] uppercase ${permissionClass[tool.permission]}`}>{tool.permission}</span>
                      <button type="button" onClick={() => toggleMcpTool(selectedServer.id, tool.name)} className={`ide-focus-ring font-mono text-[10px] ${tool.enabled ? 'text-ide-emerald' : 'text-ide-subtle'}`} aria-pressed={tool.enabled} aria-label={`${tool.name} ${tool.enabled ? 'enabled' : 'disabled'}`}>
                        {tool.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  );
                })}
              </section>

              <section aria-labelledby="invocation-bench-heading" className="border border-ide-border bg-ide-panel">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ide-border px-3 py-3">
                  <h2 id="invocation-bench-heading" className="flex items-center gap-2 text-xs font-semibold text-ide-text"><Terminal className="h-3.5 w-3.5 text-ide-cyan" aria-hidden="true" />Invocation bench <span className="font-mono text-ide-cyan">{selectedTool?.name || 'No tool selected'}</span></h2>
                  <span className="font-mono text-[10px] text-ide-subtle">JSON-RPC 2.0</span>
                </div>
                <div className="grid gap-4 p-3 lg:grid-cols-2">
                  <div>
                    <label htmlFor="mcp-call-args" className="mb-1.5 block font-mono text-[10px] text-ide-muted">Call arguments (JSON)</label>
                    <textarea id="mcp-call-args" rows={8} value={toolArgsJson} onChange={(event) => { setToolArgsJson(event.target.value); setJsonError(null); }} className={`ide-focus-ring w-full resize-y border bg-ide-code p-3 font-mono text-[11px] text-ide-text outline-none ${jsonError ? 'border-ide-rose' : 'border-ide-border-strong focus:border-ide-focus'}`} aria-describedby={jsonError ? 'mcp-json-error' : undefined} />
                    {jsonError && <div id="mcp-json-error" className="mt-2 flex items-start gap-1.5 font-mono text-[10px] text-ide-rose"><AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />{jsonError}</div>}
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] text-ide-muted"><span>Response</span>{executionOutput && <span className="text-ide-emerald">Success · 124ms</span>}</div>
                    {executionOutput ? <pre className="max-h-56 overflow-auto border border-ide-border-strong bg-ide-code p-3 font-mono text-[11px] leading-relaxed text-ide-emerald">{executionOutput}</pre> : <div className="flex min-h-[174px] items-center justify-center border border-dashed border-ide-border-strong bg-ide-code px-4 text-center font-mono text-[10px] text-ide-subtle">Tool response will appear here after execution.</div>}
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-ide-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 font-mono text-[10px] text-ide-muted">
                    <Lock className="h-3 w-3 text-ide-amber" aria-hidden="true" />
                    Permissions: <span className={selectedTool ? permissionClass[selectedTool.permission] : 'text-ide-subtle'}>{selectedTool?.permission.toUpperCase() || 'NONE'}</span>
                    {selectedServer.status !== 'connected' && <span className="text-ide-rose">· Server offline</span>}
                    {selectedTool && !selectedTool.enabled && <span className="text-ide-rose">· Tool disabled</span>}
                  </div>
                  <button type="button" onClick={handleExecuteTool} disabled={isExecuting || !selectedTool || !selectedTool.enabled || selectedServer.status !== 'connected'} className="ide-focus-ring inline-flex min-h-[32px] items-center justify-center gap-2 bg-ide-focus px-3 text-xs font-semibold text-white hover:bg-ide-focus/85 disabled:cursor-not-allowed disabled:bg-ide-border disabled:text-ide-subtle">
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    {isExecuting ? 'Calling server' : 'Execute tool call'}
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
