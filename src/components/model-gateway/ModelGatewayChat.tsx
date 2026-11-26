import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AtSign,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  FileCode,
  FolderPlus,
  KeyRound,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { isSensitiveFilePath } from '../../utils/aiContextBuilder';
import { getWorkspaceDragId, parseWorkspaceDragPayload } from '../../utils/workspaceDragDrop';
import type { AIGeneratedFile } from '../../types/ide';
import { Badge, Button, IconButton, Input, Menu, Tabs } from '../ui';

type AssistantTab = 'assistant' | 'impact';

function buildSimpleDiffLines(oldText: string, newText: string): { type: 'same' | 'add' | 'del'; text: string }[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const out: { type: 'same' | 'add' | 'del'; text: string }[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < Math.min(maxLen, 120); i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === n) {
      out.push({ type: 'same', text: n ?? '' });
    } else {
      if (o !== undefined) out.push({ type: 'del', text: o });
      if (n !== undefined) out.push({ type: 'add', text: n });
    }
  }
  return out;
}

const CodeBlockWithCopy: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="my-2 overflow-hidden rounded-ide-control border border-ide-border bg-ide-code">
      <div className="flex items-center justify-between border-b border-ide-border bg-ide-shell px-3 py-1 font-sans text-[11px] text-ide-muted">
        <span className="font-mono">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="ide-focus-ring inline-flex items-center gap-1 rounded-ide-small px-1.5 py-0.5 text-[11px] text-ide-muted hover:bg-ide-hover hover:text-ide-text"
        >
          {copied ? <Check className="h-3 w-3 text-ide-emerald" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="max-h-64 overflow-auto p-3 font-mono text-[13px] leading-relaxed text-ide-text select-text">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const MessageContentRenderer: React.FC<{ content: string }> = ({ content }) => {
  const parts = useMemo(() => {
    const tokens: ({ kind: 'text'; text: string } | { kind: 'code'; lang: string; code: string })[] = [];
    const regex = /```([^\n]*)\n([\s\S]*?)```/g;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      if (m.index > lastIdx) {
        tokens.push({ kind: 'text', text: content.slice(lastIdx, m.index) });
      }
      tokens.push({ kind: 'code', lang: (m[1] || 'text').trim(), code: m[2] ?? '' });
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < content.length) {
      tokens.push({ kind: 'text', text: content.slice(lastIdx) });
    }
    return tokens;
  }, [content]);

  return (
    <div className="space-y-2 font-sans text-[13px] leading-relaxed text-ide-text">
      {parts.map((p, idx) =>
        p.kind === 'code' ? (
          <CodeBlockWithCopy key={idx} language={p.lang} code={p.code} />
        ) : (
          <p key={idx} className="whitespace-pre-wrap break-words">
            {p.text}
          </p>
        )
      )}
    </div>
  );
};

export const ModelGatewayChat: React.FC = () => {
  const {
    chatMessages,
    sendChatMessage,
    stopAIGeneration,
    retryLastChatMessage,
    isGeneratingAI,
    applyGeneratedFiles,
    activeModel,
    setActiveModel,
    allModels,
    configuredProviders,
    providerStatuses,
    setApiKey,
    setIsModelSwitchingModalOpen,
    setIsCopilotOpen,
    setActiveView,
    runTests,
    isExecutingTests,
    openFile,
    files,
    activeFileId,
    ciaResult,
    diagnostics,
    attachedContextPaths,
    setAttachedContextPaths,
    selectedEditorCode,
    lastContextBundle,
    workspacePath,
  } = useIDE();

  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<AssistantTab>('assistant');
  const [inlineKeyDraft, setInlineKeyDraft] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showContextDetails, setShowContextDetails] = useState(false);
  const [previewDiffKey, setPreviewDiffKey] = useState<string | null>(null);
  const [decisionMap, setDecisionMap] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const [aiDropState, setAiDropState] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = messagesPanelRef.current;
    if (!panel) return;
    const distanceFromBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight;
    if (distanceFromBottom < 140) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isGeneratingAI]);

  const activeFile = files.find((file) => file.id === activeFileId);
  const isConfigured = Boolean(configuredProviders[activeModel.providerKey]);
  const pStatus = providerStatuses[activeModel.providerKey] || (isConfigured ? 'configured' : 'disconnected');
  const needsKeyNow = activeModel.requiresApiKey !== false && !isConfigured;

  const safeAttachableFiles = useMemo(
    () => files.filter((f) => !isSensitiveFilePath(f.path)),
    [files]
  );

  const visibleMessages = useMemo(
    () => chatMessages.filter((m) => m.id !== 'msg-init' && m.sender !== 'system' && !m.content.startsWith('[SYSTEM EVENT:')),
    [chatMessages]
  );

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputMessage.trim() || isGeneratingAI) return;
    const message = inputMessage;
    setInputMessage('');
    sendChatMessage(message);
  };

  const handleSaveInlineKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineKeyDraft.trim()) return;
    await setApiKey(activeModel.providerKey, inlineKeyDraft.trim());
    setInlineKeyDraft('');
  };

  const handleAcceptFile = async (msgId: string, gf: AIGeneratedFile) => {
    await applyGeneratedFiles([gf]);
    setDecisionMap((prev) => ({ ...prev, [`${msgId}:${gf.path}`]: 'accepted' }));
  };

  const handleRejectFile = (msgId: string, gf: AIGeneratedFile) => {
    setDecisionMap((prev) => ({ ...prev, [`${msgId}:${gf.path}`]: 'rejected' }));
  };

  const handleAcceptAll = async (msgId: string, genFiles: AIGeneratedFile[]) => {
    const pending = genFiles.filter((gf) => decisionMap[`${msgId}:${gf.path}`] !== 'rejected');
    if (pending.length === 0) return;
    await applyGeneratedFiles(pending);
    setDecisionMap((prev) => {
      const next = { ...prev };
      pending.forEach((gf) => {
        next[`${msgId}:${gf.path}`] = 'accepted';
      });
      return next;
    });
  };

  const toggleAttachPath = (filePath: string) => {
    setAttachedContextPaths((prev) =>
      prev.includes(filePath) ? prev.filter((p) => p !== filePath) : [...prev, filePath]
    );
  };

  const statusBadge = needsKeyNow ? (
    <Badge variant="warning">Not configured</Badge>
  ) : pStatus === 'connected' ? (
    <Badge variant="success">Connected</Badge>
  ) : activeModel.requiresApiKey === false ? (
    <Badge variant="accent">Local</Badge>
  ) : (
    <Badge variant="neutral">Configured</Badge>
  );

  return (
    <aside
      className="flex h-full w-full flex-col bg-ide-panel font-sans"
      data-purpose="context-inspector"
    >
      {/* Simple Assistant Header */}
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-ide-border bg-ide-shell px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-ide-purple" aria-hidden="true" />
          <span className="text-[14px] font-semibold text-ide-strong">Assistant</span>
          {statusBadge}
        </div>
        <IconButton size="sm" label="Close Assistant" onClick={() => setIsCopilotOpen(false)}>
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </header>

      <Tabs
        ariaLabel="Assistant views"
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as AssistantTab)}
        items={[
          { id: 'assistant', label: 'Chat', badge: visibleMessages.length > 0 ? visibleMessages.length : undefined },
          { id: 'impact', label: 'Impact', badge: ciaResult.directAffected.length > 0 ? ciaResult.directAffected.length : undefined },
        ]}
      />

      {activeTab === 'assistant' ? (
        <>
          {/* Conversation Stream */}
          <div ref={messagesPanelRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 select-text">
            {visibleMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center px-2">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-ide-panel border border-ide-border bg-ide-surface text-ide-purple">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="text-[14px] font-semibold text-ide-strong">Ask about your workspace</h2>
                <p className="mt-1 max-w-[260px] text-[12px] text-ide-muted">
                  {needsKeyNow
                    ? `Configure a ${activeModel.provider} API key or choose another model to start.`
                    : `Ready using ${activeModel.name}.`}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {activeFile && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => sendChatMessage(`Explain ${activeFile.path} and point out any edge cases.`)}
                    >
                      Explain {activeFile.name}
                    </Button>
                  )}
                  {diagnostics.length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => sendChatMessage('Fix current errors in the workspace files.')}
                    >
                      Fix {diagnostics.length} problem{diagnostics.length > 1 ? 's' : ''}
                    </Button>
                  )}
                  {needsKeyNow && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsModelSwitchingModalOpen(true)}
                    >
                      Configure provider
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleMessages.map((message) => {
                  const isUser = message.sender === 'user';
                  const genFiles = message.generatedFiles || [];

                  return (
                    <article
                      key={message.id}
                      className={`rounded-ide-panel border p-3 ${
                        isUser
                          ? 'border-ide-border bg-ide-surface'
                          : message.isError
                            ? 'border-ide-rose/40 bg-ide-rose/10'
                            : 'border-ide-border bg-ide-bg'
                      }`}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-[12px]">
                        <span
                          className={`font-semibold ${
                            isUser ? 'text-ide-focus' : message.isError ? 'text-ide-rose' : 'text-ide-strong'
                          }`}
                        >
                          {isUser ? 'You' : message.model || activeModel.name}
                        </span>
                        <span className="text-[11px] text-ide-subtle">{message.timestamp}</span>
                      </div>

                      <MessageContentRenderer content={message.content} />

                      {message.needsApiKey && (
                        <form
                          onSubmit={handleSaveInlineKey}
                          className="mt-3 rounded-ide-control border border-ide-amber/40 bg-ide-panel p-3 space-y-2"
                        >
                          <div className="flex items-center gap-1.5 text-[12px] font-medium text-ide-amber">
                            <KeyRound className="h-4 w-4" aria-hidden="true" />
                            <span>{message.needsApiKey.providerName} API key required</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="password"
                              value={inlineKeyDraft}
                              onChange={(e) => setInlineKeyDraft(e.target.value)}
                              placeholder="Paste API key…"
                              aria-label="Provider API key"
                            />
                            <Button type="submit" size="sm" variant="primary">
                              Save
                            </Button>
                          </div>
                        </form>
                      )}

                      {genFiles.length > 0 && (
                        <div className="mt-3 rounded-ide-control border border-ide-borderStrong bg-ide-surface p-3 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] font-semibold text-ide-strong">
                              {genFiles.length} proposed file change{genFiles.length > 1 ? 's' : ''}
                            </span>
                            <Button
                              size="sm"
                              variant="primary"
                              leftIcon={<FolderPlus className="h-3.5 w-3.5" />}
                              onClick={() => handleAcceptAll(message.id, genFiles)}
                            >
                              Accept all
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {genFiles.map((gf) => {
                              const key = `${message.id}:${gf.path}`;
                              const decision = decisionMap[key];
                              const existing = files.find((f) => f.path === gf.path);
                              const isPreviewing = previewDiffKey === key;

                              return (
                                <div key={gf.path} className="rounded-ide-control border border-ide-border bg-ide-bg p-2.5 space-y-2">
                                  <div className="flex items-center justify-between gap-2 text-[12px]">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <FileCode className="h-4 w-4 shrink-0 text-ide-cyan" aria-hidden="true" />
                                      <span className="truncate font-mono text-ide-text">{gf.path}</span>
                                      <Badge variant="neutral">{existing ? 'modify' : 'new'}</Badge>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        leftIcon={<Eye className="h-3.5 w-3.5" />}
                                        onClick={() => setPreviewDiffKey(isPreviewing ? null : key)}
                                      >
                                        Diff
                                      </Button>
                                      {decision === 'accepted' ? (
                                        <Badge variant="success">Applied</Badge>
                                      ) : decision === 'rejected' ? (
                                        <Badge variant="error">Rejected</Badge>
                                      ) : (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleAcceptFile(message.id, gf)}
                                          >
                                            Accept
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleRejectFile(message.id, gf)}
                                          >
                                            Reject
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {isPreviewing && (
                                    <div className="max-h-44 overflow-auto rounded-ide-small border border-ide-border bg-ide-code p-2 font-mono text-[12px]">
                                      {buildSimpleDiffLines(existing?.content || '', gf.content).map((ln, idx) => (
                                        <div
                                          key={idx}
                                          className={
                                            ln.type === 'add'
                                              ? 'bg-ide-emerald/15 text-ide-emerald'
                                              : ln.type === 'del'
                                                ? 'bg-ide-rose/15 text-ide-rose'
                                                : 'text-ide-subtle'
                                          }
                                        >
                                          {ln.type === 'add' ? '+ ' : ln.type === 'del' ? '- ' : '  '}
                                          {ln.text}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {message.suggestedAction?.type === 'run_tests' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-2.5"
                          leftIcon={<Play className="h-3.5 w-3.5" />}
                          disabled={isExecutingTests}
                          onClick={() => runTests()}
                        >
                          {isExecutingTests ? 'Running tests…' : message.suggestedAction.label}
                        </Button>
                      )}
                    </article>
                  );
                })}

                {isGeneratingAI && (
                  <div className="flex items-center justify-between rounded-ide-control border border-ide-border bg-ide-surface px-3 py-2 text-[12px] text-ide-muted">
                    <span className="animate-pulse">Generating with {activeModel.name}…</span>
                    <Button
                      size="sm"
                      variant="danger"
                      leftIcon={<Square className="h-3 w-3" />}
                      onClick={stopAIGeneration}
                    >
                      Stop
                    </Button>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Prompt Composer & Context Chips (also accepts Explorer / Graph DnD attachments without auto-sending) */}
          <div
            data-testid="ai-context-drop-zone"
            onDragOver={(e) => {
              e.preventDefault();
              setAiDropState('valid');
            }}
            onDragLeave={() => setAiDropState('idle')}
            onDrop={(e) => {
              e.preventDefault();
              setAiDropState('idle');
              const parsed = parseWorkspaceDragPayload(
                e.dataTransfer,
                getWorkspaceDragId(workspacePath),
                files,
                { rejectSensitive: true },
              );
              if (!parsed.valid) {
                setAiDropState('invalid');
                window.setTimeout(() => setAiDropState('idle'), 1600);
                return;
              }
              const targetPath = parsed.file?.path || parsed.payload.filePath;
              if (targetPath) {
                setAttachedContextPaths((prev) => (prev.includes(targetPath) ? prev : [...prev, targetPath]));
              }
            }}
            className={`shrink-0 border-t border-ide-border bg-ide-shell p-3 space-y-2.5 transition-colors ${
              aiDropState === 'valid'
                ? 'ring-2 ring-inset ring-ide-focus'
                : aiDropState === 'invalid'
                  ? 'ring-2 ring-inset ring-ide-rose'
                  : ''
            }`}
          >
            {/* Compact Context Chips + Inspector */}
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFile && (
                <Badge variant="neutral" className="max-w-[160px] truncate font-mono">
                  {activeFile.name}
                </Badge>
              )}
              {selectedEditorCode && <Badge variant="accent">Selection</Badge>}
              {attachedContextPaths.map((p) => (
                <span
                  key={p}
                  className="inline-flex max-w-[180px] items-center gap-1 rounded-ide-small border border-ide-borderStrong bg-ide-surface px-2 py-0.5 font-mono text-[11px] text-ide-text"
                >
                  <span className="truncate">{p}</span>
                  <button
                    type="button"
                    onClick={() => toggleAttachPath(p)}
                    className="ide-focus-ring rounded-ide-small text-ide-subtle hover:text-ide-text"
                    aria-label={`Remove ${p} from project context`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setShowAttachMenu((v) => !v)}
                className="ide-focus-ring inline-flex h-6 items-center gap-1 rounded-ide-small border border-ide-border bg-ide-bg px-2 text-[11px] font-medium text-ide-muted hover:bg-ide-hover hover:text-ide-text"
                title="Attach workspace files to project context"
              >
                <AtSign className="h-3 w-3" aria-hidden="true" />
                <span>Add file</span>
              </button>
              <button
                type="button"
                onClick={() => setShowContextDetails((v) => !v)}
                className="ide-focus-ring ml-auto inline-flex h-6 items-center gap-1 rounded-ide-small px-1.5 text-[11px] text-ide-muted hover:bg-ide-hover hover:text-ide-text"
                aria-expanded={showContextDetails}
              >
                {showContextDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span>Project context</span>
              </button>
            </div>

            {showAttachMenu && (
              <div className="max-h-32 overflow-y-auto rounded-ide-control border border-ide-borderStrong bg-ide-bg p-1.5 space-y-0.5">
                {safeAttachableFiles.length === 0 ? (
                  <div className="px-2 py-1 text-[12px] text-ide-subtle">No attachable files available.</div>
                ) : (
                  safeAttachableFiles.map((f) => {
                    const checked = attachedContextPaths.includes(f.path);
                    return (
                      <label
                        key={f.id}
                        className="flex cursor-pointer items-center gap-2 rounded-ide-small px-2 py-1 text-[12px] text-ide-text hover:bg-ide-hover"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAttachPath(f.path)}
                        />
                        <span className="truncate font-mono">{f.path}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}

            {showContextDetails && (
              <div className="rounded-ide-control border border-ide-border bg-ide-bg p-2.5 text-[12px] space-y-1">
                {lastContextBundle ? (
                  <>
                    <div className="font-medium text-ide-muted">Included in last request:</div>
                    {lastContextBundle.includedFiles.map((inc) => (
                      <div key={inc.path} className="flex justify-between gap-2 text-ide-text">
                        <span className="truncate font-mono">{inc.path}</span>
                        <span className="shrink-0 text-ide-cyan">{inc.reason}</span>
                      </div>
                    ))}
                    {lastContextBundle.excludedSensitive.length > 0 && (
                      <div className="flex items-center gap-1 text-ide-amber">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>Excluded {lastContextBundle.excludedSensitive.length} sensitive file(s)</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-ide-subtle">Send a prompt to inspect selected project context.</div>
                )}
              </div>
            )}

            <form
              onSubmit={handleSend}
              className="rounded-ide-panel border border-ide-borderStrong bg-ide-bg p-2 space-y-2 focus-within:border-ide-focus"
            >
              <input
                id="context-composer"
                type="text"
                value={inputMessage}
                onChange={(event) => setInputMessage(event.target.value)}
                disabled={isGeneratingAI}
                placeholder={`Ask ${activeModel.name}…`}
                aria-label="Prompt composer"
                className="w-full bg-transparent px-1 py-1 font-sans text-[13px] text-ide-text outline-none placeholder:text-ide-subtle"
              />
              <div className="flex items-center justify-between gap-2">
                <Menu
                  align="left"
                  side="top"
                  trigger={(props) => (
                    <button
                      type="button"
                      onClick={props.toggle}
                      aria-expanded={props['aria-expanded']}
                      aria-haspopup={props['aria-haspopup']}
                      className="ide-focus-ring inline-flex h-7 max-w-[200px] items-center gap-1.5 rounded-ide-control border border-ide-border bg-ide-surface px-2 text-[12px] text-ide-text hover:bg-ide-hover"
                    >
                      <span className="truncate">{activeModel.name}</span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ide-subtle" aria-hidden="true" />
                    </button>
                  )}
                  items={[
                    ...allModels.slice(0, 8).map((m) => ({
                      id: m.id,
                      label: `${m.name} (${m.provider})`,
                      selected: m.id === activeModel.id,
                      onSelect: () => setActiveModel(m),
                    })),
                    {
                      id: 'manage-providers',
                      label: 'Manage models & providers…',
                      onSelect: () => setIsModelSwitchingModalOpen(true),
                    },
                  ]}
                />

                <div className="flex items-center gap-1.5">
                  {!isGeneratingAI && visibleMessages.some((m) => m.sender === 'user') && (
                    <IconButton size="sm" label="Retry last prompt" onClick={retryLastChatMessage}>
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    </IconButton>
                  )}
                  {isGeneratingAI ? (
                    <IconButton size="sm" variant="danger" label="Stop generation" onClick={stopAIGeneration}>
                      <Square className="h-3.5 w-3.5" aria-hidden="true" />
                    </IconButton>
                  ) : (
                    <IconButton
                      type="submit"
                      size="sm"
                      variant="primary"
                      label="Send message"
                      disabled={!inputMessage.trim()}
                    >
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    </IconButton>
                  )}
                </div>
              </div>
            </form>
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5">
          <div className="rounded-ide-panel border border-ide-border bg-ide-surface p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] text-ide-muted">Impact</div>
                <div className="mt-0.5 text-[20px] font-semibold text-ide-strong">{ciaResult.blastRadiusScore}%</div>
              </div>
              <Badge variant={ciaResult.severity === 'critical' || ciaResult.severity === 'high' ? 'error' : 'warning'}>
                {ciaResult.severity}
              </Badge>
            </div>
            <div className="mt-2 truncate font-mono text-[12px] text-ide-muted">{ciaResult.targetPath}</div>
          </div>

          <div>
            <h3 className="mb-2 text-[12px] font-semibold text-ide-muted">
              Directly affected ({ciaResult.directAffected.length})
            </h3>
            <div className="space-y-1.5">
              {ciaResult.directAffected.map((item) => {
                const targetFile = files.find((f) => f.path === item.path || f.name === item.name);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (targetFile) {
                        openFile(targetFile.id);
                        setActiveView('editor');
                      }
                    }}
                    className="ide-focus-ring flex w-full items-center justify-between rounded-ide-control border border-ide-border bg-ide-bg px-3 py-2 text-left text-[12px] hover:bg-ide-hover"
                  >
                    <span className="truncate font-mono text-ide-text">{item.name}</span>
                    <span className="text-ide-focus">Open file</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-[12px] font-semibold text-ide-muted">
              Indirectly affected ({ciaResult.indirectAffected.length})
            </h3>
            <div className="space-y-1.5">
              {ciaResult.indirectAffected.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-ide-control border border-ide-border bg-ide-bg px-3 py-2 text-[12px]"
                >
                  <span className="truncate font-mono text-ide-text">{item.name}</span>
                  <span className="text-ide-muted">Depth {item.depth}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
