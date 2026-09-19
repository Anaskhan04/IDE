import React, { useState, useRef, useEffect } from 'react';
import { useIDE } from '../../context/IDEContext';
import { 
  Send, 
  Sparkles, 
  Database, 
  Cpu, 
  ArrowRightLeft, 
  Layers, 
  ShieldAlert, 
  Play, 
  CheckCircle,
  Clock,
  Terminal,
  ChevronRight,
  Info
} from 'lucide-react';

export const ModelGatewayChat: React.FC = () => {
  const { 
    chatMessages, 
    sendChatMessage, 
    activeModel, 
    setIsModelSwitchingModalOpen,
    setActiveView,
    runTests,
    isExecutingTests,
    ciaResult
  } = useIDE();

  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'context'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const msg = inputMessage;
    setInputMessage('');
    sendChatMessage(msg);
  };

  const samplePrompts = [
    "Refactor paymentService to support Apple Pay without breaking Checkout",
    "Analyze change impact on cartStore if currency format changes to ISO-4217",
    "Switch to GPT-4o for regression test synthesis"
  ];

  return (
    <div className="w-80 lg:w-96 bg-ide-sidebar border-l border-ide-border flex flex-col h-[calc(100vh-3.5rem-1.75rem)] select-none">
      {/* Copilot Header */}
      <div className="p-3 border-b border-ide-border bg-ide-panel/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white">Model Gateway</span>
              <span className="text-[9px] font-mono px-1.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Shared Context
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              Active: <span className="text-cyan-300 font-medium">{activeModel.name}</span>
            </p>
          </div>
        </div>

        {/* Model switcher quick trigger */}
        <button
          onClick={() => setIsModelSwitchingModalOpen(true)}
          className="p-1.5 rounded-lg bg-ide-card hover:bg-ide-hover border border-ide-border text-slate-300 hover:text-cyan-400 transition-colors"
          title="Switch Model (Zero Context Loss)"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border bg-ide-card/30 text-xs font-medium">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-1.5 text-center transition-colors border-b-2 ${
            activeTab === 'chat'
              ? 'border-cyan-500 text-cyan-400 bg-ide-panel/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Cross-Model Chat
        </button>
        <button
          onClick={() => setActiveTab('context')}
          className={`flex-1 py-1.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'context'
              ? 'border-cyan-500 text-cyan-400 bg-ide-panel/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-3 h-3 text-cyan-400" />
          <span>Shared Memory</span>
        </button>
      </div>

      {/* Main Body */}
      {activeTab === 'chat' ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans">
            {chatMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender & Model Tag */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-mono">
                    {!isUser && <Cpu className="w-3 h-3 text-cyan-400" />}
                    <span>{isUser ? 'You' : msg.model || activeModel.name}</span>
                    <span className="text-slate-600">•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[90%] rounded-xl p-3 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-xs shadow-md'
                        : 'bg-ide-card border border-ide-border text-slate-200 rounded-bl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>

                    {/* Telemetry info for model response */}
                    {!isUser && (msg.tokensSaved || msg.tokensUsed) && (
                      <div className="mt-2.5 pt-2 border-t border-ide-border/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="text-emerald-400">
                          ⚡ Tokens Saved: {msg.tokensSaved ? (msg.tokensSaved / 1000).toFixed(1) + 'k' : '18.2k'}
                        </span>
                        <span className="text-slate-500">
                          {msg.contextContinuity ? 'Context Handover: 100%' : ''}
                        </span>
                      </div>
                    )}

                    {/* Action recommendations */}
                    {msg.suggestedAction && (
                      <div className="mt-3 pt-2 border-t border-ide-border flex flex-col gap-1.5">
                        <button
                          onClick={() => {
                            if (msg.suggestedAction?.type === 'run_tests') {
                              setActiveView('validation');
                              runTests();
                            } else {
                              setActiveView('cia');
                            }
                          }}
                          disabled={isExecutingTests}
                          className="w-full py-1.5 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 text-cyan-400" />
                          <span>
                            {isExecutingTests ? 'Executing Affected Tests...' : msg.suggestedAction.label}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts */}
          <div className="px-3 py-1.5 border-t border-ide-border/40 bg-ide-panel/40">
            <p className="text-[10px] text-slate-500 font-mono mb-1">Suggested Cross-Model Tasks:</p>
            <div className="space-y-1">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => sendChatMessage(prompt)}
                  className="w-full text-left text-[11px] text-slate-400 hover:text-cyan-300 hover:bg-ide-card/70 p-1.5 rounded transition-colors truncate border border-transparent hover:border-ide-border font-mono"
                >
                  › {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} className="p-2.5 border-t border-ide-border bg-ide-panel">
            <div className="relative">
              <input
                type="text"
                placeholder={`Ask ${activeModel.name} with shared context...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="w-full bg-ide-card text-xs text-slate-100 pl-3 pr-10 py-2.5 rounded-lg border border-ide-border focus:outline-none focus:border-cyan-500/80 font-sans"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="absolute right-1.5 top-1.5 p-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Persistent Context Inspector Tab */
        <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans text-xs">
          <div className="p-3 rounded-lg bg-ide-card border border-ide-border">
            <div className="flex items-center justify-between font-mono text-[11px] text-cyan-400 mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Persistent Intelligence Cache
              </span>
              <span className="text-emerald-400">SYNCED</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              This memory layer remains intact across model switches, tool calls, and test runs.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
              1. Shared Invariants (from Master Prompt)
            </h4>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="p-2 rounded bg-ide-card/50 border border-ide-border text-slate-300">
                • Strict Currency validation in all payment flows
              </div>
              <div className="p-2 rounded bg-ide-card/50 border border-ide-border text-slate-300">
                • Zero whole-repo re-indexing on model switch
              </div>
              <div className="p-2 rounded bg-ide-card/50 border border-ide-border text-slate-300">
                • Automatic blast radius calculation on service change
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
              2. Live AST Symbol Index
            </h4>
            <div className="p-2 rounded bg-ide-card/50 border border-ide-border font-mono text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Active Symbols:</span>
                <span className="text-cyan-400">24 symbols</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Dependency Edges:</span>
                <span className="text-cyan-400">12 edges</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Cache Footprint:</span>
                <span className="text-emerald-400">14.8k tokens</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveView('analyzer')}
            className="w-full py-2 px-3 rounded-lg bg-ide-card hover:bg-ide-hover border border-ide-border text-slate-300 text-xs font-mono text-center transition-colors"
          >
            Inspect Full AST Manifest →
          </button>
        </div>
      )}
    </div>
  );
};
