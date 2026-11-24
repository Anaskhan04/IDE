import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  Check,
  ChevronRight,
  Cpu,
  FileCode,
  FolderPlus,
  KeyRound,
  Play,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';

type ContextTab = 'assistant' | 'impact';

const formatTokens = (tokens?: number) => (tokens ? (tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens)) : '0');

export const ModelGatewayChat: React.FC = () => {
  const {
    chatMessages,
    sendChatMessage,
    isGeneratingAI,
    applyGeneratedFiles,
    activeModel,
    apiKeys,
    setApiKey,
    setIsModelSwitchingModalOpen,
    setActiveView,
    runTests,
    isExecutingTests,
    setIsCopilotOpen,
    files,
    activeFileId,
    ciaResult,
    diagnostics,
  } = useIDE();

  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<ContextTab>('assistant');
  const [inlineKeyDraft, setInlineKeyDraft] = useState('');
  const [appliedMessageIds, setAppliedMessageIds] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = messagesPanelRef.current;
    if (!panel) return;
    const distanceFromBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight;
    if (distanceFromBottom < 140) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isGeneratingAI]);

  const activeFile = files.find((file) => file.id === activeFileId);
  const needsKeyNow = activeModel.requiresApiKey !== false && !apiKeys[activeModel.providerKey];

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputMessage.trim() || isGeneratingAI) return;
    const message = inputMessage;
    setInputMessage('');
    sendChatMessage(message);
  };

  const handleSaveInlineKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineKeyDraft.trim()) return;
    setApiKey(activeModel.providerKey, inlineKeyDraft.trim());
    setInlineKeyDraft('');
  };

  const handleApplyAll = async (messageId: string, genFiles: { path: string; content: string; language: string }[]) => {
    await applyGeneratedFiles(genFiles);
    setAppliedMessageIds((prev) => new Set(prev).add(messageId));
  };

  return (
    <aside
      className="flex h-full w-[356px] max-w-[44vw] shrink-0 flex-col border-l border-ide-border bg-ide-sidebar max-[1100px]:absolute max-[1100px]:inset-y-0 max-[1100px]:right-0 max-[1100px]:z-40 max-[1100px]:w-[min(356px,85vw)]"
      data-purpose="context-inspector"
    >
      <div className="shrink-0 border-b border-ide-border bg-ide-panel">
        <div className="flex h-12 items-center justify-between px-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-ide-strong">
              <Sparkles className="h-3.5 w-3.5 text-ide-cyan" aria-hidden="true" />
              <span>AI Assistant</span>
              {needsKeyNow ? (
                <span className="rounded border border-ide-amber/40 bg-ide-amber/10 px-1 py-0.2 font-mono text-[9px] text-ide-amber">
                  Key Needed
                </span>
              ) : (
                <span className="rounded border border-ide-emerald/40 bg-ide-emerald/10 px-1 py-0.2 font-mono text-[9px] text-ide-emerald">
                  Ready
                </span>
              )}
            </div>
            <div className="mt-1 truncate font-mono text-[10px] text-ide-subtle">
              {activeModel.name} · {activeFile?.path || 'Workspace context'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsModelSwitchingModalOpen(true)}
              className="ide-focus-ring flex h-7 items-center gap-1 rounded-ide-control border border-ide-border-strong px-2 font-mono text-[10px] text-ide-muted hover:bg-ide-hover hover:text-ide-text"
              title="Switch model or configure API keys"
            >
              <ArrowRightLeft className="h-3 w-3 text-ide-cyan" aria-hidden="true" />
              Models
            </button>
            <button
              type="button"
              onClick={() => setIsCopilotOpen(false)}
              className="ide-focus-ring flex h-7 w-7 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text"
              title="Close AI Assistant"
              aria-label="Close AI Assistant"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex h-8 border-t border-ide-border px-3" role="tablist" aria-label="AI Assistant sections">
          {(['assistant', 'impact'] as ContextTab[]).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab)}
                className={`ide-focus-ring border-b-2 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                  isSelected ? 'border-ide-cyan text-ide-text' : 'border-transparent text-ide-subtle hover:text-ide-muted'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'assistant' ? (
        <>
          {/* Inline API Key Prompt when selected provider key is missing */}
          {needsKeyNow && (
            <form onSubmit={handleSaveInlineKey} className="shrink-0 border-b border-ide-amber/30 bg-ide-amber/10 p-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 font-semibold text-ide-amber">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <KeyRound className="h-3.5 w-3.5" />
                  API Key Needed for {activeModel.provider}
                </span>
                <button
                  type="button"
                  onClick={() => setIsModelSwitchingModalOpen(true)}
                  className="font-mono text-[10px] text-ide-focus hover:underline"
                >
                  All Keys
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  type="password"
                  value={inlineKeyDraft}
                  onChange={(e) => setInlineKeyDraft(e.target.value)}
                  placeholder={`Paste ${activeModel.provider} API key…`}
                  className="ide-focus-ring min-w-0 flex-1 rounded-ide-control border border-ide-border-strong bg-ide-bg px-2 py-1 font-mono text-[11px] text-ide-strong outline-none"
                />
                <button
                  type="submit"
                  disabled={!inlineKeyDraft.trim()}
                  className="ide-focus-ring rounded-ide-control bg-ide-focus px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          {/* Chat Messages */}
          <div ref={messagesPanelRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-4">
              {chatMessages.map((message) => {
                const isUser = message.sender === 'user';
                const isApplied = appliedMessageIds.has(message.id);
                return (
                  <article
                    key={message.id}
                    className={`border-l-2 pl-3 ${
                      isUser ? 'border-ide-focus' : message.isError ? 'border-ide-rose' : 'border-ide-cyan'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 font-mono text-[10px] text-ide-subtle">
                      <span className={isUser ? 'text-ide-focus' : message.isError ? 'text-ide-rose' : 'text-ide-cyan'}>
                        {isUser ? 'You' : message.model || activeModel.name}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{message.timestamp}</span>
                    </div>
                    <div className="whitespace-pre-wrap break-words text-xs leading-relaxed text-ide-text select-text">
                      {message.content}
                    </div>

                    {message.needsApiKey && (
                      <button
                        type="button"
                        onClick={() => setIsModelSwitchingModalOpen(true)}
                        className="ide-focus-ring mt-2 inline-flex items-center gap-1.5 rounded-ide-control border border-ide-amber/40 bg-ide-amber/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-ide-amber hover:bg-ide-amber/20"
                      >
                        <KeyRound className="h-3 w-3" />
                        Configure {message.needsApiKey.providerName} Key
                      </button>
                    )}

                    {/* Generated Files / Project Apply Action */}
                    {message.generatedFiles && message.generatedFiles.length > 0 && (
                      <div className="mt-2.5 rounded-ide-panel border border-ide-border-strong bg-ide-panel p-2.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-semibold text-ide-cyan">
                            Generated {message.generatedFiles.length} file{message.generatedFiles.length > 1 ? 's' : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApplyAll(message.id, message.generatedFiles!)}
                            className={`ide-focus-ring flex items-center gap-1 rounded-ide-control px-2 py-1 text-[10px] font-semibold transition-colors ${
                              isApplied
                                ? 'bg-ide-emerald/20 text-ide-emerald border border-ide-emerald/40'
                                : 'bg-ide-focus text-white hover:bg-ide-focus/90'
                            }`}
                          >
                            {isApplied ? <Check className="h-3 w-3" /> : <FolderPlus className="h-3 w-3" />}
                            <span>{isApplied ? 'Applied to Workspace' : 'Apply All to Workspace'}</span>
                          </button>
                        </div>
                        <div className="space-y-1">
                          {message.generatedFiles.map((gf) => (
                            <div
                              key={gf.path}
                              className="flex items-center justify-between gap-2 rounded-ide-control border border-ide-border bg-ide-bg px-2 py-1 font-mono text-[10px]"
                            >
                              <span className="truncate text-ide-text" title={gf.path}>
                                {gf.path}
                              </span>
                              <button
                                type="button"
                                onClick={() => applyGeneratedFiles([gf])}
                                className="shrink-0 text-ide-focus hover:underline"
                              >
                                Apply
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isUser && (message.tokensUsed || message.tokensSaved) ? (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-ide-border pt-2 font-mono text-[10px] text-ide-subtle">
                        <span>Tokens: {formatTokens(message.tokensUsed)}</span>
                        {message.contextContinuity && <span>Workspace Synced</span>}
                      </div>
                    ) : null}

                    {message.suggestedAction?.type === 'run_tests' && (
                      <button
                        type="button"
                        onClick={() => runTests()}
                        disabled={isExecutingTests}
                        className="ide-focus-ring mt-3 inline-flex items-center gap-2 border border-ide-emerald/60 px-2.5 py-1.5 text-[10px] font-semibold text-ide-emerald hover:bg-ide-emerald/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Play className="h-3 w-3" aria-hidden="true" />
                        {isExecutingTests ? 'Running tests' : message.suggestedAction.label}
                      </button>
                    )}
                  </article>
                );
              })}

              {isGeneratingAI && (
                <div className="border-l-2 border-ide-cyan pl-3 font-mono text-[11px] text-ide-muted animate-pulse">
                  Generating with {activeModel.name}…
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Prompts + Composer */}
          <div className="shrink-0 border-t border-ide-border bg-ide-panel p-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setInputMessage('Create a complete React + TypeScript todo app with clean styling and modular components.')
                }
                className="rounded-ide-control border border-ide-border bg-ide-surface px-2 py-0.5 font-mono text-[10px] text-ide-muted hover:bg-ide-hover hover:text-ide-text"
              >
                Scaffold Project
              </button>
              {activeFile && (
                <button
                  type="button"
                  onClick={() => sendChatMessage(`Explain ${activeFile.path} and suggest improvements.`)}
                  disabled={isGeneratingAI}
                  className="rounded-ide-control border border-ide-border bg-ide-surface px-2 py-0.5 font-mono text-[10px] text-ide-muted hover:bg-ide-hover hover:text-ide-text disabled:opacity-50"
                >
                  Explain File
                </button>
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
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2 rounded-ide-control border border-ide-border-strong bg-ide-surface px-2 focus-within:border-ide-focus">
              <input
                id="context-composer"
                type="text"
                value={inputMessage}
                onChange={(event) => setInputMessage(event.target.value)}
                disabled={isGeneratingAI}
                placeholder={`Ask ${activeModel.name} to code or build…`}
                className="min-w-0 flex-1 bg-transparent py-2 text-xs text-ide-text outline-none placeholder:text-ide-subtle"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isGeneratingAI}
                className="ide-focus-ring flex h-7 w-7 items-center justify-center rounded-ide-control bg-ide-focus text-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="mb-4 border-b border-ide-border pb-3">
            <div className="flex items-center gap-2 font-mono text-[10px] text-ide-amber">
              <FileCode className="h-3.5 w-3.5" aria-hidden="true" />
              Impact context
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ide-muted">A compact view of the active file’s downstream relationships.</p>
          </div>

          {activeFile?.isModified ? (
            <div className="space-y-4">
              <div className="border-l-2 border-ide-amber pl-3">
                <div className="font-mono text-[10px] text-ide-subtle">Target</div>
                <div className="mt-1 text-xs font-semibold text-ide-text">{activeFile.name}</div>
                <div className="mt-1 font-mono text-[10px] text-ide-muted">{activeFile.path}</div>
              </div>
              <div className="grid grid-cols-3 border-y border-ide-border py-3 text-center font-mono">
                <div><div className="text-base text-ide-amber">{ciaResult.blastRadiusScore}</div><div className="text-[9px] text-ide-subtle">score</div></div>
                <div><div className="text-base text-ide-amber">{ciaResult.directAffected.length}</div><div className="text-[9px] text-ide-subtle">direct</div></div>
                <div><div className="text-base text-ide-cyan">{ciaResult.indirectAffected.length}</div><div className="text-[9px] text-ide-subtle">ripple</div></div>
              </div>
              <div className="space-y-2">
                {ciaResult.directAffected.slice(0, 3).map((item) => (
                  <div key={item.id} className="border-b border-ide-border pb-2">
                    <div className="text-xs text-ide-text">{item.name}</div>
                    <div className="mt-1 font-mono text-[10px] text-ide-subtle">Direct · {item.type}</div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setActiveView('cia')} className="ide-focus-ring inline-flex items-center gap-1 text-[10px] font-semibold text-ide-focus hover:text-ide-text">
                Open full impact analysis <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="border-l-2 border-ide-border-strong py-1 pl-3">
              <div className="font-mono text-[10px] text-ide-subtle">Impact unavailable</div>
              <p className="mt-2 text-xs leading-relaxed text-ide-muted">No modified file has been analyzed yet.</p>
              <button type="button" onClick={() => setActiveView('cia')} className="ide-focus-ring mt-4 inline-flex items-center gap-1 border border-ide-border-strong px-2.5 py-1.5 text-[10px] text-ide-text hover:bg-ide-hover">
                Open impact analysis <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="mt-6 border-t border-ide-border pt-3 font-mono text-[10px] text-ide-subtle">
            <div className="flex items-center gap-2"><Cpu className="h-3 w-3 text-ide-cyan" /> Source: AST context</div>
          </div>
        </div>
      )}
    </aside>
  );
};
