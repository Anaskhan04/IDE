import React, { useState, useRef, useEffect } from 'react';
import { useIDE } from '../../context/IDEContext';
import { 
  Send, 
  Sparkles, 
  Cpu, 
  ArrowRightLeft, 
  Play, 
  X
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
    setIsCopilotOpen
  } = useIDE();

  const [inputMessage, setInputMessage] = useState('');
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

  // Sample quick prompt actions (commented out for clean minimalist view):
  // const samplePrompts = [
  //   "Refactor paymentService to support Apple Pay",
  //   "Analyze change impact on cartStore",
  //   "Generate unit tests for modified symbols"
  // ];

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
              <span className="text-xs font-semibold text-white">AI Copilot</span>
              <span className="text-[9px] font-mono px-1.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {activeModel.name}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Zero-Loss AST Gateway
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Switch model button - Kept visible, but unclickable */}
          <button
            disabled
            className="p-1.5 rounded-lg bg-ide-card/50 border border-ide-border/50 text-slate-500 cursor-not-allowed opacity-75"
            title="Switch Model (Unclickable)"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* Close Panel Button */}
          <button
            onClick={() => setIsCopilotOpen(false)}
            className="p-1.5 rounded-lg bg-ide-card hover:bg-ide-hover border border-ide-border text-slate-400 hover:text-white transition-colors"
            title="Close Copilot Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body */}
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
                              runTests();
                            }
                          }}
                          disabled={isExecutingTests || msg.suggestedAction?.type !== 'run_tests'}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            msg.suggestedAction?.type === 'run_tests'
                              ? 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300'
                              : 'bg-ide-card/50 border border-ide-border/60 text-slate-500 cursor-not-allowed opacity-75'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5" />
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

      {/* 
        // PERSISTENT CONTEXT INSPECTOR TAB COMMENTED OUT (Uncomment anytime to restore Shared Memory tab):
        // <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans text-xs">...</div>
      */}
    </div>
  );
};
