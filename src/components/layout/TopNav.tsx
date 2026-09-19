import React from 'react';
import { useIDE } from '../../context/IDEContext';

export const TopNav: React.FC = () => {
  const { 
    activeModel,
    masterPrompt,
  } = useIDE();

  return (
    <header className="h-10 bg-[#0a0e1a] border-b border-[#182133] flex items-center justify-between px-3 z-30 shrink-0 select-none" data-purpose="top-navigation">
      {/* Left: Logo & Brand */}
      <div className="flex items-center gap-2.5 min-w-[200px]">
        <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.6)] text-white font-bold text-xs">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </div>
        <span className="font-semibold tracking-wide text-white text-[13.5px] flex items-center gap-1.5">
          IntelliCode
          <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            v0.24
          </span>
        </span>
      </div>

      {/* Center: Global Quick Command Search & Actions */}
      <div className="flex items-center gap-2 max-w-[700px] w-full justify-center">
        {/* Search Bar */}
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <input
            className="w-full bg-[#111726] text-xs text-slate-300 placeholder-slate-500 pl-8 pr-12 py-1 rounded-md border border-[#1e2a42] focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all shadow-inner font-sans"
            placeholder="Search files, symbols, commands..."
            type="text"
          />
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-[#1a2336] border border-[#273552] rounded">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Top Tools / Dropdowns - Clickable, but nothing comes */}
        <div className="flex items-center gap-1 text-[12px] text-slate-400">
          <button 
            onClick={() => {}}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-[#151c2d] hover:text-slate-200 transition-colors cursor-pointer select-none active:scale-[0.98]"
            title="Impact Analysis"
          >
            <svg className="w-3.5 h-3.5 text-amber-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            <span>Impact Analysis</span>
            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </button>

          <button 
            onClick={() => {}}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-[#151c2d] hover:text-slate-200 transition-colors cursor-pointer select-none active:scale-[0.98]"
            title="MCP Hub"
          >
            <svg className="w-3.5 h-3.5 text-blue-400/80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            <span>MCP Hub</span>
            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </button>

          <button 
            onClick={() => {}}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-[#151c2d] hover:text-slate-200 transition-colors cursor-pointer select-none active:scale-[0.98]"
            title="Tools"
          >
            <span>Tools</span>
            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Right: Model Selector, Sync Status, Settings & Avatar */}
      <div className="flex items-center gap-3">
        {/* AST Sync Status - Clickable, but nothing comes */}
        <button
          onClick={() => {}}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10192a] border border-[#1e2a42] text-[11px] text-emerald-400 font-medium cursor-pointer select-none active:scale-[0.98]"
          title="AST Synced"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>AST Synced</span>
        </button>

        {/* LLM Model Picker - Clickable, but nothing comes */}
        <button
          onClick={() => {}}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#101726] hover:bg-[#162035] border border-[#212d46] rounded-md text-xs text-slate-200 transition-colors cursor-pointer select-none active:scale-[0.98]"
          title="AI Model"
        >
          <svg className="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
          </svg>
          <span className="font-medium">{activeModel.name || 'Claude 3.5 Sonnet'}</span>
          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
        </button>

        {/* Settings Icon */}
        <button 
          onClick={() => {}}
          className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer transition-colors"
          title="Settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
        </button>

        {/* User Profile Badge */}
        <div 
          className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-slate-800 border border-indigo-300/30 flex items-center justify-center text-[10px] font-bold text-white shadow-sm cursor-pointer select-none"
          title="User Profile (NK)"
        >
          NK
        </div>
      </div>
    </header>
  );
};
