import React from 'react';
import { useIDE } from '../../context/IDEContext';
import { AVAILABLE_MODELS } from '../../data/mockModels';
import { AIModel } from '../../types/ide';
import { 
  X, 
  Check, 
  Sparkles, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Cpu, 
  Layers,
  Database
} from 'lucide-react';

export const ModelSwitcherModal: React.FC = () => {
  const { 
    isModelSwitchingModalOpen, 
    setIsModelSwitchingModalOpen, 
    activeModel, 
    setActiveModel,
    sendChatMessage,
    masterPrompt
  } = useIDE();

  if (!isModelSwitchingModalOpen) return null;

  const handleSelectModel = (model: AIModel) => {
    if (model.id !== activeModel.id) {
      setActiveModel(model);
      sendChatMessage(`[SYSTEM EVENT: Model Gateway switched to ${model.name}]. Zero context loss: Reused persistent context containing ${masterPrompt.invariants.length} architectural invariants and active AST state.`);
    }
    setIsModelSwitchingModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-ide-panel border border-ide-border rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-ide-border flex items-center justify-between bg-ide-sidebar/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span>Model Gateway Switcher</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Zero Context Loss
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Switch coding models mid-task without re-reading the project or losing state.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModelSwitchingModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-ide-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Persistent Context Handover Banner */}
        <div className="bg-gradient-to-r from-blue-900/20 via-cyan-900/20 to-emerald-900/20 border-b border-ide-border p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-cyan-300">
            <Database className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Persistent Project Context Ready:</strong> Shared AST symbol index ({masterPrompt.astVersion}) will be instantaneously provided to the new model.
            </span>
          </div>
          <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded whitespace-nowrap ml-2">
            100% Shared Cache
          </span>
        </div>

        {/* Models List */}
        <div className="p-4 overflow-y-auto space-y-3">
          {AVAILABLE_MODELS.map((model) => {
            const isSelected = model.id === activeModel.id;
            return (
              <div
                key={model.id}
                onClick={() => handleSelectModel(model)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-ide-card border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                    : 'bg-ide-card/50 border-ide-border hover:border-slate-600 hover:bg-ide-card'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-tr ${model.color} flex items-center justify-center text-white shadow-md font-bold text-sm`}>
                      {model.name.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                          {model.name}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {model.provider}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {model.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{model.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="text-right font-mono text-[11px] hidden sm:block">
                      <div className="text-slate-300">Context: {model.contextWindow}</div>
                      <div className="text-slate-500">{model.costPer1k}/1k tokens</div>
                    </div>
                    {isSelected ? (
                      <div className="w-7 h-7 rounded-full bg-cyan-500 text-slate-900 flex items-center justify-center font-bold">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <button className="px-3 py-1.5 rounded-lg bg-ide-hover hover:bg-cyan-600 text-xs font-medium text-slate-200 group-hover:text-white transition-colors">
                        Select
                      </button>
                    )}
                  </div>
                </div>

                {/* Benefits comparison */}
                <div className="mt-3 pt-2.5 border-t border-ide-border flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Zap className="w-3 h-3" /> Re-reads eliminated: 9 files (~18k tokens saved)
                  </span>
                  <span className="text-slate-500">Handover Latency: &lt; 1.2s</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-ide-border bg-ide-sidebar/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>AST symbol table and call graph are synchronized.</span>
          </div>
          <button
            onClick={() => setIsModelSwitchingModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-ide-card hover:bg-ide-hover border border-ide-border text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
