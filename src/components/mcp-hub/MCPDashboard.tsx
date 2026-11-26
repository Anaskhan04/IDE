import React, { useEffect, useMemo, useState } from 'react';
import {
  Database,
  FolderSync,
  Github,
  Globe,
  MessageSquare,
  Play,
  Plus,
  Server,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import type { MCPServer, MCPTool } from '../../types/ide';
import { Badge, Button, Checkbox, EmptyState, NotificationBanner, Textarea } from '../ui';

const getServerIcon = (name: string): LucideIcon => {
  switch (name) {
    case 'Github':
      return Github;
    case 'Database':
      return Database;
    case 'Globe':
      return Globe;
    case 'MessageSquare':
      return MessageSquare;
    default:
      return FolderSync;
  }
};

export const MCPDashboard: React.FC = () => {
  const { mcpServers, toggleMcpTool, toggleMcpServer } = useIDE();
  const [selectedServerId, setSelectedServerId] = useState<string | null>(mcpServers[0]?.id ?? null);
  const [selectedToolName, setSelectedToolName] = useState<string | null>(mcpServers[0]?.tools[0]?.name ?? null);
  const [toolArgsJson, setToolArgsJson] = useState('{}');
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const selectedServer = useMemo(
    () => mcpServers.find((server) => server.id === selectedServerId) ?? mcpServers[0] ?? null,
    [mcpServers, selectedServerId]
  );
  const selectedTool = useMemo(
    () => selectedServer?.tools.find((tool) => tool.name === selectedToolName) ?? selectedServer?.tools[0] ?? null,
    [selectedServer, selectedToolName]
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
  }, [selectedTool?.name]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setJsonError('Invalid JSON payload. Fix syntax before running preview.');
      return;
    }

    setIsExecuting(true);
    setExecutionOutput(null);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const previewResponse = {
      simulated: true,
      note: 'Local simulated MCP tool response (no external MCP server process attached).',
      tool: selectedTool.name,
      server: selectedServer.name,
      permission: selectedTool.permission,
      timestamp: new Date().toISOString(),
    };

    setExecutionOutput(JSON.stringify(previewResponse, null, 2));
    setIsExecuting(false);
  };

  const statusBadge = (server: MCPServer) => {
    if (server.status === 'connected') return <Badge variant="success">Preview active</Badge>;
    if (server.status === 'connecting') return <Badge variant="warning">Connecting</Badge>;
    if (server.status === 'error') return <Badge variant="error">Error</Badge>;
    return <Badge variant="neutral">Not connected</Badge>;
  };

  return (
    <section
      id="mcp-workspace"
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-ide-bg font-sans"
      data-purpose="mcp-workspace"
    >
      <div className="mx-auto w-full max-w-[1220px] space-y-6 px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-ide-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-ide-cyan" aria-hidden="true" />
              <h1 className="text-[20px] font-semibold text-ide-strong">MCP Hub</h1>
              <Badge variant="warning">Experimental</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-[13px] text-ide-muted">
              Inspect configured MCP server definitions, tool permissions, and simulated JSON-RPC test payloads.
            </p>
          </div>
          <Button
            variant="secondary"
            disabled
            leftIcon={<Plus className="h-4 w-4" />}
            title="Live external MCP server registration is not enabled in this local build"
          >
            Add server (unavailable)
          </Button>
        </header>

        <NotificationBanner
          variant="info"
          title="Simulated MCP environment"
          message="Tool execution in MCP Hub runs against local mock fixtures. Use the Integrated Terminal or GitHub integration for live repository operations."
        />

        {mcpServers.length === 0 || !selectedServer ? (
          <EmptyState
            icon={<Server className="h-5 w-5" />}
            title="No MCP servers configured"
            description="No server definitions are registered in this workspace."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Servers List */}
            <div className="space-y-2 lg:col-span-4">
              <h2 className="text-[12px] font-semibold text-ide-muted">Configured servers</h2>
              <div className="space-y-2">
                {mcpServers.map((server) => {
                  const Icon = getServerIcon(server.icon);
                  const isSelected = server.id === selectedServer.id;
                  return (
                    <div
                      key={server.id}
                      className={`rounded-ide-panel border p-3.5 transition-colors ${
                        isSelected
                          ? 'border-ide-focus bg-ide-selected'
                          : 'border-ide-border bg-ide-panel hover:bg-ide-hover'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedServerId(server.id)}
                        className="ide-focus-ring flex w-full items-start justify-between gap-2 text-left"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-ide-cyan" aria-hidden="true" />
                          <span className="truncate text-[13px] font-semibold text-ide-strong">{server.name}</span>
                        </div>
                        {statusBadge(server)}
                      </button>
                      <p className="mt-1.5 text-[12px] text-ide-muted">{server.description}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-ide-border pt-2.5 text-[12px]">
                        <span className="text-ide-subtle">{server.tools.length} tools</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleMcpServer(server.id)}
                        >
                          {server.status === 'connected' ? 'Disable' : 'Enable preview'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Server Tools & Inspector */}
            <div className="space-y-4 lg:col-span-8">
              <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-ide-border pb-3">
                  <div>
                    <h2 className="text-[14px] font-semibold text-ide-strong">{selectedServer.name} tools</h2>
                    <p className="text-[12px] text-ide-muted">Enable or inspect tool permissions and arguments.</p>
                  </div>
                  {statusBadge(selectedServer)}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {selectedServer.tools.map((tool) => {
                    const active = selectedTool?.name === tool.name;
                    return (
                      <div
                        key={tool.name}
                        className={`flex items-start justify-between gap-2 rounded-ide-control border p-3 ${
                          active
                            ? 'border-ide-focus bg-ide-selected'
                            : 'border-ide-border bg-ide-bg hover:bg-ide-hover'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectTool(tool)}
                          className="ide-focus-ring min-w-0 flex-1 text-left"
                        >
                          <div className="truncate font-mono text-[12px] font-semibold text-ide-strong">
                            {tool.name}
                          </div>
                          <div className="mt-0.5 line-clamp-2 text-[12px] text-ide-muted">
                            {tool.description}
                          </div>
                        </button>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Badge
                            variant={
                              tool.permission === 'write'
                                ? 'warning'
                                : tool.permission === 'execute'
                                  ? 'intelligence'
                                  : 'accent'
                            }
                          >
                            {tool.permission}
                          </Badge>
                          <Checkbox
                            label=""
                            aria-label={`Enable ${tool.name}`}
                            checked={tool.enabled}
                            onChange={() => toggleMcpTool(selectedServer.id, tool.name)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedTool && (
                <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-mono text-[13px] font-semibold text-ide-strong">{selectedTool.name}</h3>
                      <p className="text-[12px] text-ide-muted">{selectedTool.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<Play className="h-3.5 w-3.5" />}
                      loading={isExecuting}
                      disabled={selectedServer.status !== 'connected' || !selectedTool.enabled}
                      onClick={handleExecuteTool}
                    >
                      Run simulated call
                    </Button>
                  </div>

                  <Textarea
                    label="Arguments (JSON)"
                    rows={5}
                    value={toolArgsJson}
                    onChange={(e) => setToolArgsJson(e.target.value)}
                    error={jsonError || undefined}
                    className="font-mono text-[12px]"
                  />

                  {executionOutput && (
                    <pre className="max-h-52 overflow-auto rounded-ide-control border border-ide-border bg-ide-code p-3 font-mono text-[12px] text-ide-text select-text">
                      {executionOutput}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
