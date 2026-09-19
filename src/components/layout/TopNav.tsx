import React, { useState } from 'react';
import { useIDE } from '../../context/IDEContext';
import { ActiveView } from '../../types/ide';
import { 
  Code2, 
  GitFork, 
  AlertTriangle, 
  Layers, 
  CheckCircle2, 
  FlaskConical, 
  Sparkles, 
  Cpu, 
  Database,
  ArrowRightLeft,
  ChevronDown,
  FolderGit2,
  Check
} from 'lucide-react';

export const TopNav: React.FC = () => {
  const { 
    activeView, 
    setActiveView, 
    currentProjectId,
    setCurrentProjectId,
    activeModel, 
    tokensSaved, 
    masterPrompt,
    setIsModelSwitchingModalOpen,
    isAnalyzingAST,
    rebuildAST
  } = useIDE();

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const navItems: { id: ActiveView; label: string; icon: any; badge?: string }[] = [
    // { id: 'graph', label: 'Knowledge Graph', icon: GitFork, badge: 'Tree-Sitter' }, // Disabled
    { id: 'editor', label: 'Code Editor', icon: Code2 },
    { id: 'cia', label: 'Impact Analysis', icon: AlertTriangle, badge: 'Blast: High' },
    { id: 'mcp', label: 'MCP Hub', icon: Layers, badge: '15 Tools' },
    { id: 'validation', label: 'Validation Engine', icon: CheckCircle2 },
    { id: 'evaluation', label: 'Evaluation Suite', icon: FlaskConical, badge: 'Exp 1-4' },
    { id: 'analyzer', label: 'Master Prompt', icon: Sparkles }
  ];

  return (
    <header className="h-14 bg-ide-sidebar border-b border-ide-border px-4 flex items-center justify-between select-none z-30 relative">
      {/* Brand & Project Identity with Project Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>

          {/* Project Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-ide-panel/80 transition-colors text-left group"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-white tracking-wide">IntelliCode</span>
                  <span className="text-[9px] font-mono px-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    CBM v0.24
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-cyan-300 font-medium font-mono">
                  <FolderGit2 className="w-3 h-3 text-cyan-400" />
                  <span className="truncate max-w-[170px]">{masterPrompt.projectName}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition-transform" />
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isProjectDropdownOpen && (
              <div className="absolute top-12 left-0 w-72 bg-ide-panel border border-ide-border rounded-xl shadow-2xl p-2 z-50 animate-in fade-in duration-150">
                <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1">
                  Select Active Codebase Graph
                </div>
                
                <div
                  onClick={() => {
                    setCurrentProjectId('codebase-memory-mcp');
                    setIsProjectDropdownOpen(false);
                  }}
                  className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer text-xs font-mono transition-colors ${
                    currentProjectId === 'codebase-memory-mcp'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'hover:bg-ide-hover text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white">DeusData / codebase-memory-mcp</div>
                    <div className="text-[10px] text-slate-400">Tree-Sitter AST & C native graph engine</div>
                  </div>
                  {currentProjectId === 'codebase-memory-mcp' && <Check className="w-4 h-4 text-cyan-400" />}
                </div>

                <div
                  onClick={() => {
                    setCurrentProjectId('novastore');
                    setIsProjectDropdownOpen(false);
                  }}
                  className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer text-xs font-mono transition-colors mt-1 ${
                    currentProjectId === 'novastore'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'hover:bg-ide-hover text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white">NovaStore E-Commerce</div>
                    <div className="text-[10px] text-slate-400">Reference project from ide.pdf</div>
                  </div>
                  {currentProjectId === 'novastore' && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-6 w-px bg-ide-border hidden md:block" />

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-ide-panel text-cyan-400 border border-ide-border shadow-sm text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-ide-hover/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                      item.id === 'cia'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : isActive
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Controls: Token Metrics & Model Gateway */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-mono font-medium">
            Saved: {(tokensSaved / 1000).toFixed(1)}k tokens (99% CBM)
          </span>
        </div>

        <button
          onClick={() => rebuildAST()}
          disabled={isAnalyzingAST}
          title="Click to force incremental AST & Knowledge Graph rebuild"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ide-card hover:bg-ide-hover border border-ide-border text-xs text-slate-300 transition-colors"
        >
          <span className={`w-2 h-2 rounded-full ${isAnalyzingAST ? 'bg-amber-400 animate-ping' : 'bg-cyan-400'}`} />
          <span className="text-[11px] font-mono">
            {isAnalyzingAST ? 'Indexing...' : 'Graph Synced'}
          </span>
        </button>

        <button
          onClick={() => setIsModelSwitchingModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/30 to-cyan-600/30 hover:from-blue-600/50 hover:to-cyan-600/50 border border-cyan-500/30 text-white text-xs font-medium transition-all shadow-sm group"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-180 transition-transform duration-300" />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[10px] text-cyan-300 font-mono">Model Gateway</span>
            <span className="text-xs font-semibold text-slate-100">{activeModel.name}</span>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    </header>
  );
};
