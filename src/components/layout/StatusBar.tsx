import React from 'react';
import { useIDE } from '../../context/IDEContext';
import { 
  GitBranch, 
  Cpu, 
  CheckCheck, 
  Database, 
  ShieldCheck, 
  Layers, 
  Zap 
} from 'lucide-react';

export const StatusBar: React.FC = () => {
  const { activeModel, masterPrompt, mcpServers, tokensSaved, setActiveView } = useIDE();

  const connectedMcpCount = mcpServers.filter(s => s.status === 'connected').length;

  return (
    <footer className="h-7 bg-ide-sidebar border-t border-ide-border px-3 flex items-center justify-between text-[11px] font-mono select-none text-slate-400">
      {/* Left items */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer">
          <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
          <span>main</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-300">
          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{masterPrompt.astVersion}</span>
        </div>

        <button 
          onClick={() => setActiveView('cia')}
          className="hidden sm:flex items-center gap-1.5 text-amber-300 hover:underline"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>CIA Guard Active (High Blast Alert)</span>
        </button>
      </div>

      {/* Right items */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setActiveView('mcp')}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>MCP: {connectedMcpCount}/{mcpServers.length} Connected</span>
        </button>

        <div className="hidden md:flex items-center gap-1.5 text-emerald-400">
          <Zap className="w-3.5 h-3.5" />
          <span>Cache: {masterPrompt.cacheHitRatio}</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-200">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-semibold">{activeModel.name}</span>
        </div>
      </div>
    </footer>
  );
};
