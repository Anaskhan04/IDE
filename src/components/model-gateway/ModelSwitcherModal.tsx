import React, { useEffect } from 'react';
import { Check, Database, X } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { AVAILABLE_MODELS } from '../../data/mockModels';
import type { AIModel } from '../../types/ide';

export const ModelSwitcherModal: React.FC = () => {
  const {
    isModelSwitchingModalOpen,
    setIsModelSwitchingModalOpen,
    activeModel,
    setActiveModel,
    sendChatMessage,
    masterPrompt,
  } = useIDE();

  useEffect(() => {
    if (!isModelSwitchingModalOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModelSwitchingModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModelSwitchingModalOpen, setIsModelSwitchingModalOpen]);

  if (!isModelSwitchingModalOpen) return null;

  const handleSelectModel = (model: AIModel) => {
    if (model.id !== activeModel.id) {
      setActiveModel(model);
      sendChatMessage(`[SYSTEM EVENT: Model Gateway switched to ${model.name}]. Zero context loss: Reused persistent context containing ${masterPrompt.invariants.length} architectural invariants and active AST state.`);
    }
    setIsModelSwitchingModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation">
      <section className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-ide-border-strong bg-ide-panel" role="dialog" aria-modal="true" aria-labelledby="model-switcher-title">
        <header className="flex items-start justify-between gap-4 border-b border-ide-border px-4 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="model-switcher-title" className="text-sm font-semibold text-ide-strong">Model gateway</h2>
              <span className="font-mono text-[10px] text-ide-emerald">Shared context active</span>
            </div>
            <p className="mt-1 text-xs text-ide-muted">Switch coding models without re-reading the project or losing state.</p>
          </div>
          <button type="button" onClick={() => setIsModelSwitchingModalOpen(false)} className="ide-focus-ring flex h-8 w-8 items-center justify-center text-ide-muted hover:bg-ide-hover hover:text-ide-text" aria-label="Close model gateway">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex items-center gap-2 border-b border-ide-border bg-ide-surface px-4 py-3 text-[11px] text-ide-muted">
          <Database className="h-3.5 w-3.5 text-ide-cyan" aria-hidden="true" />
          <span>Persistent project context: <span className="font-mono text-ide-text">{masterPrompt.astVersion || 'Unknown'}</span></span>
          <span className="ml-auto font-mono text-[10px] text-ide-subtle">{masterPrompt.invariants.length} invariants</span>
        </div>

        <div className="min-h-0 overflow-y-auto">
          {AVAILABLE_MODELS.map((model) => {
            const isSelected = model.id === activeModel.id;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => handleSelectModel(model)}
                className={`ide-focus-ring flex w-full items-start gap-3 border-b border-ide-border px-4 py-4 text-left transition-colors ${isSelected ? 'bg-ide-selected' : 'hover:bg-ide-hover'}`}
                aria-pressed={isSelected}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center border border-ide-border-strong bg-ide-card font-mono text-[10px] font-semibold text-ide-cyan`}>{model.name.substring(0, 2)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-semibold text-ide-text">{model.name}</span>
                    <span className="font-mono text-[10px] text-ide-subtle">{model.provider}</span>
                    <span className="font-mono text-[10px] text-ide-cyan">{model.badge}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-ide-muted">{model.description}</span>
                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-ide-subtle"><span>Context {model.contextWindow}</span><span>{model.costPer1k}/1k tokens</span></span>
                </span>
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border ${isSelected ? 'border-ide-emerald bg-ide-emerald text-ide-shell' : 'border-ide-border-strong text-transparent'}`} aria-label={isSelected ? 'Selected model' : 'Select model'}>
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-ide-border px-4 py-3 font-mono text-[10px] text-ide-subtle">
          <span>AST symbol table and call graph remain synchronized.</span>
          <button type="button" onClick={() => setIsModelSwitchingModalOpen(false)} className="ide-focus-ring border border-ide-border-strong px-3 py-1.5 text-ide-text hover:bg-ide-hover">Close</button>
        </footer>
      </section>
    </div>
  );
};
