import React from 'react';
import { Code2, Layers, Network, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import type { ActiveView } from '../../types/ide';

interface WorkspaceMode {
  id: Extract<ActiveView, 'editor' | 'cia' | 'mcp' | 'graph' | 'validation'>;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const modes: WorkspaceMode[] = [
  {
    id: 'editor',
    label: 'Editor',
    description: 'Edit workspace files',
    icon: Code2,
  },
  {
    id: 'cia',
    label: 'Impact analysis',
    description: 'Review affected components',
    icon: ShieldAlert,
  },
  {
    id: 'mcp',
    label: 'MCP hub',
    description: 'Inspect external tools',
    icon: Layers,
  },
  {
    id: 'graph',
    label: 'Knowledge graph',
    description: 'Trace code relationships',
    icon: Network,
  },
  {
    id: 'validation',
    label: 'Validation',
    description: 'Run targeted test suites',
    icon: ShieldCheck,
  },
];

export const WorkspaceModeTabs: React.FC = () => {
  const { activeView, setActiveView } = useIDE();
  const selectedMode = modes.some((mode) => mode.id === activeView) ? activeView : 'editor';

  return (
    <nav
      className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-ide-border bg-ide-shell px-3"
      aria-label="Workspace modes"
    >
      <div className="flex min-w-0 items-stretch gap-1" role="tablist" aria-label="Primary workspace views">
        {modes.map(({ id, label, description, icon: Icon }) => {
          const isSelected = selectedMode === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${id}-workspace`}
              title={description}
              onClick={() => setActiveView(id)}
              className={`ide-focus-ring relative flex min-h-[36px] shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[11px] font-medium transition-colors ${
                isSelected
                  ? 'border-ide-focus text-ide-strong'
                  : 'border-transparent text-ide-muted hover:bg-ide-hover/70 hover:text-ide-text'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-ide-focus' : 'text-ide-subtle'}`} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <div className="ml-auto hidden items-center gap-2 text-[10px] font-mono text-ide-subtle 2xl:flex">
        <span className="h-1.5 w-1.5 bg-ide-amber" aria-hidden="true" />
        <span>Changes are analyzed before tests run</span>
      </div>
    </nav>
  );
};
