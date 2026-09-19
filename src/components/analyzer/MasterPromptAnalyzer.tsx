import React, { useState } from 'react';
import { useIDE } from '../../context/IDEContext';
import { 
  Sparkles, 
  Cpu, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  FileCode, 
  Code2, 
  ShieldCheck, 
  Save, 
  Plus, 
  Layers,
  Terminal
} from 'lucide-react';

export const MasterPromptAnalyzer: React.FC = () => {
  const { 
    masterPrompt, 
    setMasterPrompt, 
    files, 
    rebuildAST, 
    isAnalyzingAST, 
    tokensSaved,
    setActiveView 
  } = useIDE();

  const [projectName, setProjectName] = useState(masterPrompt.projectName);
  const [requirements, setRequirements] = useState(masterPrompt.requirements);
  const [architecture, setArchitecture] = useState(masterPrompt.architecture);
  const [savedStatus, setSavedStatus] = useState(false);

  const handleSave = () => {
    setMasterPrompt(prev => ({
      ...prev,
      projectName,
      requirements,
      architecture
    }));
    setSavedStatus(true);
    rebuildAST();
    setTimeout(() => setSavedStatus(false), 2500);
  };

  // Aggregate all symbols from files
  const allSymbols = files.flatMap(f => (f.symbols || []).map(s => ({ ...s, filePath: f.path, fileName: f.name })));

  return (
    <div className="flex-1 bg-ide-bg h-[calc(100vh-3.5rem-1.75rem)] overflow-y-auto p-6 select-none font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-ide-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white">Master Prompt & Project Analyzer</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Persistent Project Intelligence Layer
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              The Master Prompt grounds the Project Analyzer to parse the source code into an Abstract Syntax Tree (AST), extract symbol tables, and build the shared Knowledge Graph.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => rebuildAST()}
              disabled={isAnalyzingAST}
              className="px-3 py-2 rounded-lg bg-ide-panel hover:bg-ide-hover border border-ide-border text-slate-300 text-xs font-mono flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingAST ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isAnalyzingAST ? 'Rebuilding AST...' : 'Incremental Re-Index'}</span>
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savedStatus ? 'Saved & Synced' : 'Save Master Prompt'}</span>
            </button>
          </div>
        </div>

        {/* Intelligence Status Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-ide-panel border border-ide-border">
            <span className="text-xs font-mono text-slate-400">Active AST Fingerprint</span>
            <div className="my-2">
              <span className="text-xl font-bold font-mono text-cyan-400">{masterPrompt.astVersion}</span>
            </div>
            <p className="text-[11px] text-slate-400">SHA hash of parsed symbols</p>
          </div>

          <div className="p-4 rounded-xl bg-ide-panel border border-ide-border">
            <span className="text-xs font-mono text-slate-400">Indexed Symbols</span>
            <div className="my-2">
              <span className="text-xl font-bold font-mono text-emerald-400">{allSymbols.length} Symbols</span>
            </div>
            <p className="text-[11px] text-slate-400">Across {files.length} project files</p>
          </div>

          <div className="p-4 rounded-xl bg-ide-panel border border-ide-border">
            <span className="text-xs font-mono text-slate-400">Persistent Cache Size</span>
            <div className="my-2">
              <span className="text-xl font-bold font-mono text-white">{(masterPrompt.activeTokensCount / 1000).toFixed(1)}k tokens</span>
            </div>
            <p className="text-[11px] text-slate-400">Cached in unified memory</p>
          </div>

          <div className="p-4 rounded-xl bg-ide-panel border border-ide-border">
            <span className="text-xs font-mono text-slate-400">Re-reading Token Savings</span>
            <div className="my-2">
              <span className="text-xl font-bold font-mono text-emerald-400">{(tokensSaved / 1000).toFixed(1)}k tokens</span>
            </div>
            <p className="text-[11px] text-slate-400">{masterPrompt.cacheHitRatio} cache hit ratio</p>
          </div>
        </div>

        {/* Master Prompt Form & Symbol Indexer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Master Prompt Definition (7 cols) */}
          <div className="lg:col-span-7 bg-ide-panel border border-ide-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-ide-border">
              <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>Master Prompt Grounding Specification</span>
              </h2>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Continuous Watcher Active
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300">Project Identifier:</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-code p-2.5 rounded-lg border border-ide-border text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300">System Requirements & Invariants:</label>
              <textarea
                rows={4}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className="w-full bg-code p-3 rounded-lg border border-ide-border text-xs font-sans text-slate-200 focus:outline-none focus:border-cyan-500/60 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300">Architecture Blueprint & Layering:</label>
              <textarea
                rows={5}
                value={architecture}
                onChange={(e) => setArchitecture(e.target.value)}
                className="w-full bg-code p-3 rounded-lg border border-ide-border text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/60 leading-relaxed"
              />
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-mono uppercase text-slate-400 mb-2">Immutable Architectural Invariants:</h4>
              <div className="space-y-1.5">
                {masterPrompt.invariants.map((inv, idx) => (
                  <div key={idx} className="p-2 rounded bg-ide-card border border-ide-border text-xs font-mono text-slate-300 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{inv}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Extracted AST Symbol Table (5 cols) */}
          <div className="lg:col-span-5 bg-ide-panel border border-ide-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-ide-border">
              <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Extracted AST Symbols ({allSymbols.length})</span>
              </h2>
              {/* Knowledge Graph disabled:
              <button
                onClick={() => setActiveView('graph')}
                className="text-xs font-mono text-cyan-400 hover:underline"
              >
                View Graph →
              </button>
              */}
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
              {allSymbols.map((sym) => (
                <div
                  key={sym.id}
                  className="p-2.5 rounded-lg bg-ide-card border border-ide-border text-xs font-mono space-y-1 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300 font-bold">{sym.name}</span>
                    <span className="text-[10px] text-slate-500">Line {sym.line}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[180px]">{sym.fileName}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 uppercase text-slate-300 text-[9px]">
                      {sym.kind}
                    </span>
                  </div>
                  {sym.calledBy && sym.calledBy.length > 0 && (
                    <div className="text-[10px] text-amber-400/90 pt-1">
                      Callers: {sym.calledBy.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
