import React from 'react';
import { Database, Folder, GitBranch, Layers, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';

interface ActivityItem {
  id: 'explorer' | 'search' | 'git' | 'extensions' | 'database';
  label: string;
  icon: LucideIcon;
  available: boolean;
}

const activityItems: ActivityItem[] = [
  { id: 'explorer', label: 'Explorer', icon: Folder, available: true },
  { id: 'search', label: 'Search (not enabled)', icon: Search, available: false },
  { id: 'git', label: 'Source control (not enabled)', icon: GitBranch, available: false },
  { id: 'extensions', label: 'Extensions (not enabled)', icon: Layers, available: false },
  { id: 'database', label: 'Codebase graph (not enabled)', icon: Database, available: false },
];

export const ActivityBar: React.FC = () => {
  const { setActiveView } = useIDE();

  return (
    <aside
      className="flex w-12 shrink-0 flex-col items-center border-r border-ide-border bg-ide-shell py-2"
      data-purpose="activity-bar"
      aria-label="Activity navigation"
    >
      <div className="flex w-full flex-col items-center gap-1">
        {activityItems.map(({ id, label, icon: Icon, available }) => (
          <button
            key={id}
            type="button"
            disabled={!available}
            onClick={() => available && setActiveView('editor')}
            className={`ide-focus-ring relative flex h-10 w-10 items-center justify-center border-l-2 border-transparent text-ide-muted transition-colors ${
              available
                ? 'hover:bg-ide-hover hover:text-ide-strong'
                : 'cursor-not-allowed text-ide-subtle/50'
            }`}
            title={label}
            aria-label={label}
          >
            {available && <span className="absolute inset-y-2 left-[-2px] w-0.5 bg-ide-focus" aria-hidden="true" />}
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
          </button>
        ))}
      </div>
    </aside>
  );
};
