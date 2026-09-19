import React from 'react';
import { useIDE } from '../../context/IDEContext';

export const StatusBar: React.FC = () => {
  const { masterPrompt, mcpServers } = useIDE();

  const connectedMcpCount = mcpServers.filter(s => s.status === 'connected').length || 5;
  const totalMcpCount = mcpServers.length || 5;

  return (
    <footer className="h-6 bg-[#070a12] border-t border-[#161d2c] flex items-center justify-between px-2 text-[11px] text-slate-400 shrink-0 z-30 select-none" data-purpose="ide-status-bar">
      {/* Left Status Indicators */}
      <div className="flex items-center gap-3">
        {/* Git Branch */}
        <button className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="6" x2="6" y1="3" y2="15"></line>
            <circle cx="18" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <path d="M18 9a9 9 0 0 1-9 9"></path>
          </svg>
          <span className="font-mono">main</span>
        </button>

        {/* Sync / Refresh */}
        <button className="hover:text-slate-200" title="Synchronize Changes">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
        </button>

        {/* Errors & Warnings */}
        <div className="flex items-center gap-2 font-mono">
          <span className="flex items-center gap-1 hover:text-slate-200 cursor-pointer">
            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 8v4m0 4h.01"></path>
            </svg>
            0
          </span>
          <span className="flex items-center gap-1 hover:text-slate-200 cursor-pointer">
            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            0
          </span>
        </div>

        {/* CIA Guard Active Status */}
        <div className="flex items-center gap-1.5 text-amber-400 font-medium pl-1">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>CIA Guard Active</span>
        </div>
      </div>

      {/* Right Status Indicators */}
      <div className="flex items-center gap-4 text-[11px]">
        {/* MCP Connection Status */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <span>MCP: {connectedMcpCount}/{totalMcpCount} Connected</span>
        </div>

        {/* Cache Ratio */}
        <div className="flex items-center gap-1 text-cyan-400 font-medium">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
          <span>Cache: {masterPrompt.cacheHitRatio || '96.8%'}</span>
        </div>

        {/* Language Mode */}
        <div className="text-blue-400 font-bold font-mono">C</div>

        {/* Encoding & EOL */}
        <div className="hover:text-slate-200 cursor-pointer">UTF-8</div>
        <div className="hover:text-slate-200 cursor-pointer">LF</div>

        {/* Curly Bracket Syntax */}
        <div className="flex items-center gap-1 hover:text-slate-200 cursor-pointer">
          <span className="font-mono text-slate-400">{'{ }'}</span>
          <span>C</span>
        </div>
      </div>
    </footer>
  );
};
