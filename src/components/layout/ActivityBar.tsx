import React, { useState } from 'react';

type ActivityItem = 'explorer' | 'search' | 'git' | 'extensions' | 'database';

export const ActivityBar: React.FC = () => {
  const [activeItem, setActiveItem] = useState<ActivityItem>('explorer');

  return (
    <aside className="w-12 bg-[#070a12] border-r border-[#161d2c] flex flex-col items-center py-2.5 justify-between select-none shrink-0 z-20" data-purpose="activity-bar">
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Explorer (Active) */}
        <button
          onClick={() => setActiveItem('explorer')}
          className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            activeItem === 'explorer'
              ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#111726]'
          }`}
          title="Explorer (Ctrl+Shift+E)"
        >
          {activeItem === 'explorer' && (
            <span className="absolute -left-[2px] top-2 bottom-2 w-1 bg-blue-500 rounded-r"></span>
          )}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
          </svg>
        </button>

        {/* Search */}
        <button
          onClick={() => setActiveItem('search')}
          className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            activeItem === 'search'
              ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#111726]'
          }`}
          title="Search (Ctrl+Shift+F)"
        >
          {activeItem === 'search' && (
            <span className="absolute -left-[2px] top-2 bottom-2 w-1 bg-blue-500 rounded-r"></span>
          )}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
          </svg>
        </button>

        {/* Git / Source Control */}
        <button
          onClick={() => setActiveItem('git')}
          className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            activeItem === 'git'
              ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#111726]'
          }`}
          title="Source Control (Ctrl+Shift+G)"
        >
          {activeItem === 'git' && (
            <span className="absolute -left-[2px] top-2 bottom-2 w-1 bg-blue-500 rounded-r"></span>
          )}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="18" cy="18" r="3"></circle>
            <circle cx="6" cy="6" r="3"></circle>
            <path d="M13 6h3a2 2 0 0 1 2 2v7"></path>
            <line x1="6" x2="6" y1="9" y2="21"></line>
          </svg>
        </button>

        {/* Extensions / Plugins */}
        <button
          onClick={() => setActiveItem('extensions')}
          className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            activeItem === 'extensions'
              ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#111726]'
          }`}
          title="Extensions (Ctrl+Shift+X)"
        >
          {activeItem === 'extensions' && (
            <span className="absolute -left-[2px] top-2 bottom-2 w-1 bg-blue-500 rounded-r"></span>
          )}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
          </svg>
        </button>

        {/* Database / Memory */}
        <button
          onClick={() => setActiveItem('database')}
          className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            activeItem === 'database'
              ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#111726]'
          }`}
          title="Codebase Graph Database"
        >
          {activeItem === 'database' && (
            <span className="absolute -left-[2px] top-2 bottom-2 w-1 bg-blue-500 rounded-r"></span>
          )}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
        </button>
      </div>

      {/* Activity Bar Bottom Settings */}
      <div className="flex flex-col items-center gap-3">
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors"
          title="Manage Settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
        </button>
      </div>
    </aside>
  );
};
