import React, { useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, ChevronRight, Cpu, FileCode, Play, Send, X } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';

type ContextTab = 'notes' | 'impact';

const formatTokens = (tokens?: number) => (tokens ? `${(tokens / 1000).toFixed(1)}k` : '0');

export const ModelGatewayChat: React.FC = () => {
  const {
    chatMessages,
    sendChatMessage,
    activeModel,
    setIsModelSwitchingModalOpen,
    setActiveView,
    runTests,
    isExecutingTests,
    setIsCopilotOpen,
    files,
    activeFileId,
    ciaResult,
  } = useIDE();

  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<ContextTab>('notes');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = messagesPanelRef.current;
    if (!panel) return;
    const distanceFromBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight;
    if (distanceFromBottom < 120) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const activeFile = files.find((file) => file.id === activeFileId);

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputMessage.trim()) return;
    const message = inputMessage;
    setInputMessage('');
    sendChatMessage(message);
  };

  return (
    <aside className="flex h-full w-[332px] max-w-[42vw] shrink-0 flex-col border-l border-ide-border bg-ide-sidebar max-[1100px]:absolute max-[1100px]:inset-y-0 max-[1100px]:right-0 max-[1100px]:z-40 max-[1100px]:w-[min(332px,80vw)]" data-purpose="context-inspector">
      <div className="shrink-0 border-b border-ide-border bg-ide-panel">
        <div className="flex h-12 items-center justify-between px-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-ide-strong">
              <span className="h-1.5 w-1.5 bg-ide-cyan" aria-hidden="true" />
              Context inspector
            </div>
            <div className="mt-1 truncate font-mono text-[10px] text-ide-subtle">{activeFile?.path || 'No active file'}</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsModelSwitchingModalOpen(true)}
              className="ide-focus-ring flex h-7 items-center gap-1 border border-ide-border-strong px-2 font-mono text-[10px] text-ide-muted hover:bg-ide-hover hover:text-ide-text"
              title="Switch coding model"
            >
              <ArrowRightLeft className="h-3 w-3 text-ide-cyan" aria-hidden="true" />
              Model
            </button>
            <button type="button" onClick={() => setIsCopilotOpen(false)} className="ide-focus-ring flex h-7 w-7 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text" title="Close context inspector" aria-label="Close context inspector">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex h-8 border-t border-ide-border px-3" role="tablist" aria-label="Context inspector sections">
          {(['notes', 'impact'] as ContextTab[]).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab)}
                className={`ide-focus-ring border-b-2 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] ${isSelected ? 'border-ide-cyan text-ide-text' : 'border-transparent text-ide-subtle hover:text-ide-muted'}`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'notes' ? (
        <>
          <div ref={messagesPanelRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="mb-3 border-b border-ide-border pb-3 font-mono text-[10px] text-ide-subtle">
              Shared context · {activeModel.name}
            </div>
            <div className="space-y-4">
              {chatMessages.map((message) => {
                const isUser = message.sender === 'user';
                return (
                  <article key={message.id} className={`border-l-2 pl-3 ${isUser ? 'border-ide-focus' : 'border-ide-cyan'}`}>
                    <div className="mb-1 flex items-center gap-2 font-mono text-[10px] text-ide-subtle">
                      <span className={isUser ? 'text-ide-focus' : 'text-ide-cyan'}>{isUser ? 'You' : message.model || activeModel.name}</span>
                      <span aria-hidden="true">·</span>
                      <span>{message.timestamp}</span>
                    </div>
                    <div className="whitespace-pre-wrap text-xs leading-relaxed text-ide-text">{message.content}</div>

                    {!isUser && (message.tokensSaved || message.tokensUsed || message.contextContinuity) && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-ide-border pt-2 font-mono text-[10px] text-ide-subtle">
                        <span>Used {formatTokens(message.tokensUsed)} tokens</span>
                        <span className="text-ide-emerald">Saved {formatTokens(message.tokensSaved)}</span>
                        {message.contextContinuity && <span>Handover 100%</span>}
                      </div>
                    )}

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
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSend} className="shrink-0 border-t border-ide-border bg-ide-panel p-3">
            <label htmlFor="context-composer" className="mb-1.5 block font-mono text-[10px] text-ide-muted">Shared context</label>
            <div className="flex items-center gap-2 border border-ide-border-strong bg-ide-surface px-2 focus-within:border-ide-focus">
              <input
                id="context-composer"
                type="text"
                value={inputMessage}
                onChange={(event) => setInputMessage(event.target.value)}
                placeholder={`Ask ${activeModel.name}…`}
                className="min-w-0 flex-1 bg-transparent py-2 text-xs text-ide-text outline-none placeholder:text-ide-subtle"
              />
              <button type="submit" disabled={!inputMessage.trim()} className="ide-focus-ring flex h-7 w-7 items-center justify-center bg-ide-focus text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
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
