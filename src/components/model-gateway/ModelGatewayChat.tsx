import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  AtSign,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Cpu,
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
import type { AIGeneratedFile } from '../../types/ide';

type ContextTab = 'assistant' | 'impact';

const formatTokens = (tokens?: number) =>
  tokens ? (tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens)) : '0';

/**
 * Compute simple line-by-line diff preview between existing workspace file and AI-generated content.
 */
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
      <div className="flex items-center justify-between border-b border-ide-border bg-ide-shell px-2.5 py-1 font-mono text-[10px] text-ide-muted">
        <span>{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="ide-focus-ring inline-flex items-center gap-1 rounded-ide-control px-1.5 py-0.5 text-[10px] text-ide-muted hover:bg-ide-hover hover:text-ide-text"
        >
          {copied ? <Check className="h-3 w-3 text-ide-emerald" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="max-h-60 overflow-auto p-2.5 font-mono text-[11px] leading-relaxed text-ide-text select-text">
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
    <div className="space-y-1.5">
      {parts.map((p, idx) =>
        p.kind === 'code' ? (
          <CodeBlockWithCopy key={idx} language={p.lang} code={p.code} />
        ) : (
          <p key={idx} className="whitespace-pre-wrap break-words leading-relaxed">
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
    configuredProviders,
    providerStatuses,
    setApiKey,
    setIsModelSwitchingModalOpen,
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
  } = useIDE();

  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<ContextTab>('assistant');
  const [inlineKeyDraft, setInlineKeyDraft] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showContextDetails, setShowContextDetails] = useState(false);
  const [previewDiffKey, setPreviewDiffKey] = useState<string | null>(null);
  const [decisionMap, setDecisionMap] = useState<Record<string, 'accepted' | 'rejected'>>({});

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

  return (
    <aside
      className="flex h-full w-[372px] max-w-[46vw] shrink-0 flex-col border-l border-ide-border bg-ide-sidebar max-[1100px]:absolute max-[1100px]:inset-y-0 max-[1100px]:right-0 max-[1100px]:z-40 max-[1100px]:w-[min(372px,88vw)]"
      data-purpose="context-inspector"
    >
      <div className="shrink-0 border-b border-ide-border bg-ide-panel">
        <div className="flex h-12 items-center justify-between px-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-ide-strong">
              <Sparkles className="h-3.5 w-3.5 text-ide-cyan" aria-hidden="true" />
              <span>AI Assistant</span>
              {needsKeyNow ? (
                <span className="rounded border border-ide-amber/40 bg-ide-amber/10 px-1.5 py-0.5 font-mono text-[9px] text-ide-amber">
                  Key Needed
                </span>
              ) : pStatus === 'connected' ? (
                <span className="rounded border border-ide-emerald/40 bg-ide-emerald/10 px-1.5 py-0.5 font-mono text-[9px] text-ide-emerald">
                  Connected
                </span>
              ) : activeModel.requiresApiKey === false ? (
                <span className="rounded border border-ide-cyan/40 bg-ide-cyan/10 px-1.5 py-0.5 font-mono text-[9px] text-ide-cyan">
                  Local
                </span>
              ) : (
                <span className="rounded border border-ide-cyan/40 bg-ide-cyan/10 px-1.5 py-0.5 font-mono text-[9px] text-ide-cyan">
                  Configured
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate font-mono text-[10px] text-ide-muted">
              {activeModel.name} · {activeModel.provider}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsModelSwitchingModalOpen(true)}
            className="ide-focus-ring flex items-center gap-1 rounded-ide-control border border-ide-border-strong bg-ide-surface px-2 py-1 font-mono text-[10px] text-ide-text hover:bg-ide-hover"
            title="Switch Model or Configure API Keys"
          >
            <ArrowRightLeft className="h-3 w-3 text-ide-cyan" aria-hidden="true" />
            <span>Models</span>
          </button>
        </div>

        <div className="grid grid-cols-2 border-t border-ide-border text-[11px] font-medium" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'assistant'}
            onClick={() => setActiveTab('assistant')}
            className={`ide-focus-ring border-r border-ide-border py-2 transition-colors ${
              activeTab === 'assistant'
                ? 'bg-ide-selected text-ide-strong'
                : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
            }`}
          >
            AI Chat ({chatMessages.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'impact'}
            onClick={() => setActiveTab('impact')}
            className={`ide-focus-ring py-2 transition-colors ${
              activeTab === 'impact'
                ? 'bg-ide-selected text-ide-strong'
                : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
            }`}
          >
            Blast Radius ({ciaResult.directAffected.length})
          </button>
        </div>
      </div>

      {activeTab === 'assistant' ? (
        <>
          {/* Visible Context Summary Bar */}
          <div className="shrink-0 border-b border-ide-border bg-ide-surface/50 px-3 py-1.5 text-[10px] font-mono">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowContextDetails((v) => !v)}
                className="flex items-center gap-1 text-ide-muted hover:text-ide-text"
              >
                {showContextDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span>
                  Context: {activeFile ? activeFile.name : 'None'}
                  {attachedContextPaths.length > 0 ? ` + ${attachedContextPaths.length} @file` : ''}
                  {selectedEditorCode ? ' · Selection' : ''}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowAttachMenu((v) => !v)}
                className="ide-focus-ring inline-flex items-center gap-1 rounded-ide-control border border-ide-border bg-ide-bg px-1.5 py-0.5 text-[10px] text-ide-cyan hover:bg-ide-hover"
                title="Attach workspace files (@file)"
              >
                <AtSign className="h-2.5 w-2.5" />
                <span>@file</span>
              </button>
            </div>

            {showAttachMenu && (
              <div className="mt-2 max-h-32 overflow-y-auto rounded-ide-control border border-ide-border bg-ide-bg p-1.5 space-y-0.5">
                {safeAttachableFiles.length === 0 ? (
                  <div className="px-1.5 py-1 text-ide-subtle">No non-sensitive files available.</div>
                ) : (
                  safeAttachableFiles.map((f) => {
                    const checked = attachedContextPaths.includes(f.path);
                    return (
                      <label
                        key={f.id}
                        className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] text-ide-text hover:bg-ide-hover"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAttachPath(f.path)}
                        />
                        <span className="truncate">{f.path}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}

            {showContextDetails && (
              <div className="mt-1.5 space-y-1 border-t border-ide-border pt-1.5 text-[10px]">
                {lastContextBundle ? (
                  <>
                    <div className="text-ide-subtle">Included in last request:</div>
                    {lastContextBundle.includedFiles.map((inc) => (
                      <div key={inc.path} className="flex justify-between gap-2 text-ide-text">
                        <span className="truncate">{inc.path}</span>
                        <span className="shrink-0 text-ide-cyan">{inc.reason}</span>
                      </div>
                    ))}
                    {lastContextBundle.excludedSensitive.length > 0 && (
                      <div className="flex items-center gap-1 text-ide-amber">
                        <ShieldAlert className="h-3 w-3 shrink-0" />
                        <span>Excluded {lastContextBundle.excludedSensitive.length} sensitive file(s)</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-ide-subtle">Send a prompt to inspect AST &amp; graph context selection.</div>
                )}
              </div>
            )}
          </div>

          <div ref={messagesPanelRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 select-text">
            <div className="space-y-4">
              {chatMessages.map((message) => {
                const isUser = message.sender === 'user';
                const isSystem = message.sender === 'system' || message.content.startsWith('[SYSTEM EVENT:');
                const genFiles = message.generatedFiles || [];

                if (isSystem) {
                  return (
                    <div
                      key={message.id}
                      className="border-l-2 border-ide-border-strong pl-2.5 font-mono text-[10px] leading-relaxed text-ide-subtle"
                    >
                      {message.content.replace('[SYSTEM EVENT:', '').replace(']', '').trim()}
                    </div>
                  );
                }

                return (
                  <article
                    key={message.id}
                    className={`border-l-2 pl-3 text-xs ${
                      isUser
                        ? 'border-ide-focus'
                        : message.isError
                          ? 'border-ide-rose'
                          : 'border-ide-cyan'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 font-mono text-[10px]">
                      <span
                        className={
                          isUser
                            ? 'text-ide-focus font-semibold'
                            : message.isError
                              ? 'text-ide-rose font-semibold'
                              : 'text-ide-cyan font-semibold'
                        }
                      >
                        {isUser ? 'You' : message.model || activeModel.name}
                      </span>
                      <span className="text-ide-subtle">{message.timestamp}</span>
                    </div>

                    <div className="text-ide-text">
                      <MessageContentRenderer content={message.content} />
                    </div>

                    {/* Inline API Key Prompt if key missing */}
                    {message.needsApiKey && (
                      <form
                        onSubmit={handleSaveInlineKey}
                        className="mt-2.5 rounded-ide-control border border-ide-amber/40 bg-ide-panel p-2.5 space-y-2"
                      >
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-ide-amber">
                          <KeyRound className="h-3 w-3" />
                          <span>Enter {message.needsApiKey.providerName} API Key (stored on backend):</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="password"
                            value={inlineKeyDraft}
                            onChange={(e) => setInlineKeyDraft(e.target.value)}
                            placeholder="Paste API key…"
                            className="min-w-0 flex-1 rounded-ide-control border border-ide-border-strong bg-ide-bg px-2 py-1 font-mono text-[11px] text-ide-strong outline-none"
                          />
                          <button
                            type="submit"
                            className="rounded-ide-control bg-ide-focus px-2.5 py-1 font-mono text-[10px] font-semibold text-ide-strong"
                          >
                            Save
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Generated Files Diff Preview & Accept/Reject Controls */}
                    {genFiles.length > 0 && (
                      <div className="mt-3 rounded-ide-panel border border-ide-emerald/40 bg-ide-panel p-2.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-semibold text-ide-emerald">
                            {genFiles.length} Proposed File Change{genFiles.length > 1 ? 's' : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAcceptAll(message.id, genFiles)}
                            className="ide-focus-ring inline-flex items-center gap-1 rounded-ide-control bg-ide-emerald px-2.5 py-1 font-mono text-[10px] font-semibold text-ide-shell hover:bg-ide-emerald/90"
                          >
                            <FolderPlus className="h-3 w-3" />
                            Accept All
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {genFiles.map((gf) => {
                            const key = `${message.id}:${gf.path}`;
                            const decision = decisionMap[key];
                            const existing = files.find((f) => f.path === gf.path);
                            const isPreviewing = previewDiffKey === key;

                            return (
                              <div key={gf.path} className="rounded-ide-control border border-ide-border bg-ide-bg p-2 space-y-1.5">
                                <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <FileCode className="h-3 w-3 shrink-0 text-ide-cyan" />
                                    <span className="truncate text-ide-text">{gf.path}</span>
                                    <span className="shrink-0 text-ide-subtle">
                                      {existing ? 'modify' : 'new'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewDiffKey(isPreviewing ? null : key)}
                                      className="rounded border border-ide-border px-1.5 py-0.5 text-[9px] text-ide-muted hover:text-ide-text"
                                      title="Preview diff"
                                    >
                                      <Eye className="inline h-2.5 w-2.5 mr-0.5" />
                                      Diff
                                    </button>
                                    {decision === 'accepted' ? (
                                      <span className="text-ide-emerald font-semibold">Applied</span>
                                    ) : decision === 'rejected' ? (
                                      <span className="text-ide-rose">Rejected</span>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleAcceptFile(message.id, gf)}
                                          className="rounded bg-ide-emerald/20 px-1.5 py-0.5 text-[9px] text-ide-emerald hover:bg-ide-emerald/30"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRejectFile(message.id, gf)}
                                          className="rounded bg-ide-rose/20 px-1.5 py-0.5 text-[9px] text-ide-rose hover:bg-ide-rose/30"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {isPreviewing && (
                                  <div className="max-h-40 overflow-auto rounded border border-ide-border bg-ide-code p-1.5 font-mono text-[10px]">
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

                    {!isUser && message.tokensUsed ? (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-ide-border pt-2 font-mono text-[10px] text-ide-subtle">
                        <span>Provider tokens: {formatTokens(message.tokensUsed)}</span>
                      </div>
                    ) : null}

                    {message.suggestedAction?.type === 'run_tests' && (
                      <button
                        type="button"
                        onClick={() => runTests()}
                        disabled={isExecutingTests}
                        className="ide-focus-ring mt-2 inline-flex items-center gap-1 rounded-ide-control bg-ide-emerald px-2.5 py-1 font-mono text-[10px] font-semibold text-ide-shell hover:bg-ide-emerald/85 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Play className="h-3 w-3" aria-hidden="true" />
                        {isExecutingTests ? 'Running tests' : message.suggestedAction.label}
                      </button>
                    )}
                  </article>
                );
              })}

              {isGeneratingAI && (
                <div className="flex items-center justify-between border-l-2 border-ide-cyan pl-3 font-mono text-[11px] text-ide-muted">
                  <span className="animate-pulse">Generating with {activeModel.name}…</span>
                  <button
                    type="button"
                    onClick={stopAIGeneration}
                    className="inline-flex items-center gap-1 rounded-ide-control border border-ide-rose/40 bg-ide-rose/10 px-2 py-0.5 text-[10px] text-ide-rose hover:bg-ide-rose/20"
                  >
                    <Square className="h-2.5 w-2.5" />
                    Stop
                  </button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Prompts + Composer */}
          <div className="shrink-0 border-t border-ide-border bg-ide-panel p-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {selectedEditorCode && (
                <button
                  type="button"
                  onClick={() => sendChatMessage('Explain the selected code and point out any edge cases.')}
                  disabled={isGeneratingAI}
                  className="rounded-ide-control border border-ide-cyan/40 bg-ide-cyan/10 px-2 py-0.5 font-mono text-[10px] text-ide-cyan hover:bg-ide-cyan/20 disabled:opacity-50"
                >
                  Explain Selection
                </button>
              )}
              {activeFile && (
                <>
                  <button
                    type="button"
                    onClick={() => sendChatMessage(`Find bugs and suggest fixes in ${activeFile.path}.`)}
                    disabled={isGeneratingAI}
                    className="rounded-ide-control border border-ide-border bg-ide-surface px-2 py-0.5 font-mono text-[10px] text-ide-muted hover:bg-ide-hover hover:text-ide-text disabled:opacity-50"
                  >
                    Find Bugs
                  </button>
                  <button
                    type="button"
                    onClick={() => sendChatMessage(`Explain dependencies and change impact for ${activeFile.path}.`)}
                    disabled={isGeneratingAI}
                    className="rounded-ide-control border border-ide-border bg-ide-surface px-2 py-0.5 font-mono text-[10px] text-ide-muted hover:bg-ide-hover hover:text-ide-text disabled:opacity-50"
                  >
                    Dependencies
                  </button>
                </>
              )}
              {diagnostics.length > 0 && (
                <button
                  type="button"
                  onClick={() => sendChatMessage('Fix all current diagnostics/errors in the workspace files.')}
                  disabled={isGeneratingAI}
                  className="rounded-ide-control border border-ide-rose/40 bg-ide-rose/10 px-2 py-0.5 font-mono text-[10px] text-ide-rose hover:bg-ide-rose/20 disabled:opacity-50"
                >
                  Fix {diagnostics.length} Problem{diagnostics.length > 1 ? 's' : ''}
                </button>
              )}
              {!isGeneratingAI && chatMessages.some((m) => m.sender === 'user') && (
                <button
                  type="button"
                  onClick={retryLastChatMessage}
                  className="ml-auto inline-flex items-center gap-1 rounded-ide-control border border-ide-border bg-ide-surface px-2 py-0.5 font-mono text-[10px] text-ide-muted hover:bg-ide-hover hover:text-ide-text"
                  title="Retry last prompt"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Retry
                </button>
              )}
            </div>

            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 rounded-ide-control border border-ide-border-strong bg-ide-surface px-2 focus-within:border-ide-focus"
            >
              <input
                id="context-composer"
                type="text"
                value={inputMessage}
                onChange={(event) => setInputMessage(event.target.value)}
                disabled={isGeneratingAI}
                placeholder={`Ask ${activeModel.name} about your code…`}
                className="min-w-0 flex-1 bg-transparent py-2 text-xs text-ide-text outline-none placeholder:text-ide-subtle"
              />
              {isGeneratingAI ? (
                <button
                  type="button"
                  onClick={stopAIGeneration}
                  className="ide-focus-ring flex h-7 w-7 items-center justify-center rounded-ide-control bg-ide-rose text-ide-strong"
                  aria-label="Stop generation"
                >
                  <Square className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="ide-focus-ring flex h-7 w-7 items-center justify-center rounded-ide-control bg-ide-focus text-ide-strong disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              )}
            </form>
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="mb-3 flex items-center justify-between border-b border-ide-border pb-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ide-subtle">Impact score</div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ide-amber">
                {ciaResult.blastRadiusScore}
                <span className="text-xs text-ide-subtle"> / 100</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('cia')}
              className="ide-focus-ring inline-flex items-center gap-1 rounded-ide-control border border-ide-border-strong px-2.5 py-1.5 font-mono text-[10px] text-ide-text hover:bg-ide-hover"
            >
              Full simulator <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-4">
            <section>
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ide-subtle">
                Direct dependents
              </h3>
              <div className="divide-y divide-ide-border border-y border-ide-border">
                {ciaResult.directAffected.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      openFile(item.id);
                      setActiveView('editor');
                    }}
                    className="ide-focus-ring flex w-full items-start gap-2.5 py-2.5 text-left hover:bg-ide-hover/60"
                  >
                    <FileCode className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ide-amber" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-ide-text">{item.name}</div>
                      <div className="mt-0.5 text-[11px] leading-relaxed text-ide-muted">{item.reason}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ide-subtle">
                Downstream impact
              </h3>
              <div className="divide-y divide-ide-border border-y border-ide-border">
                {ciaResult.indirectAffected.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 text-xs">
                    <span className="truncate font-mono text-ide-text">{item.name}</span>
                    <span className="font-mono text-[10px] text-ide-subtle">Depth {item.depth}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      <footer className="flex shrink-0 items-center justify-between border-t border-ide-border bg-ide-shell px-3 py-2 font-mono text-[10px] text-ide-subtle">
        <span className="flex items-center gap-1.5">
          <Cpu className="h-3 w-3 text-ide-cyan" aria-hidden="true" />
          AST + Graph Context
        </span>
        <span>{files.length} files</span>
      </footer>
    </aside>
  );
};
