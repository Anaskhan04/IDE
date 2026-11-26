import React, { useState } from 'react';
import { BookOpen, FileCode2, FolderGit2, FunctionSquare, GitBranch, MousePointerClick } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Tabs, TabItem } from '../ui/Tabs';
import { Button } from '../ui/Button';

export interface GraphGuideDialogProps {
  open: boolean;
  onClose: () => void;
}

const GUIDE_TABS: TabItem[] = [
  { id: 'relationships', label: 'Relationships', icon: <GitBranch className="h-3.5 w-3.5" /> },
  { id: 'nodes', label: 'Node types', icon: <FolderGit2 className="h-3.5 w-3.5" /> },
  { id: 'interactions', label: 'Interactions', icon: <MousePointerClick className="h-3.5 w-3.5" /> },
];

const RELATIONSHIP_ROWS = [
  {
    key: 'IMPORTS',
    label: 'Imports',
    token: 'var(--graph-file)',
    dashed: false,
    description: 'Module or file dependency where one source file imports symbols or types from another.',
    example: 'src/App.tsx -> src/context/IDEContext.tsx',
  },
  {
    key: 'CALLS',
    label: 'Calls',
    token: 'var(--graph-class)',
    dashed: false,
    description: 'Runtime function, hook, or method invocation between symbols or across modules.',
    example: 'openFile() -> openTabState()',
  },
  {
    key: 'DEFINES',
    label: 'Defines',
    token: 'var(--graph-function)',
    dashed: true,
    description: 'Structural ownership showing which file declares a component, function, or class.',
    example: 'CodeEditor.tsx -> CodeEditor',
  },
  {
    key: 'REFERENCES',
    label: 'References',
    token: 'var(--graph-interface)',
    dashed: true,
    description: 'Type, constant, or identifier usage without a direct function call.',
    example: 'GraphSessionState referenced in IDEContext.tsx',
  },
];

const NODE_TYPE_ROWS = [
  {
    key: 'Group',
    icon: FolderGit2,
    token: 'var(--graph-module)',
    summary: 'Module or directory cluster summarizing contained files and cross-module dependencies.',
    hint: 'Click to select, double-click or click + to expand files.',
  },
  {
    key: 'File',
    icon: FileCode2,
    token: 'var(--graph-file)',
    summary: 'Source file node displaying language, path, and semantic connections.',
    hint: 'Click to inspect relationships, double-click to open in Editor.',
  },
  {
    key: 'Symbol',
    icon: FunctionSquare,
    token: 'var(--graph-function)',
    summary: 'Function, class, component, or method revealed when expanding a file.',
    hint: 'Double-click to jump directly to its definition line in Editor.',
  },
];

const INTERACTION_ROWS = [
  { gesture: 'Click node or edge', outcome: 'Selects it and updates the Inspector with incoming/outgoing relationships.' },
  { gesture: 'Double-click file or symbol', outcome: 'Opens the file in the Code Editor at its target line while preserving Graph state.' },
  { gesture: 'Double-click group', outcome: 'Expands or scopes into the module without hiding the parent node.' },
  { gesture: 'Right-click node', outcome: 'Opens context actions: Open in Editor, Focus neighborhood, Scope to module, Attach to AI, or Run Impact.' },
  { gesture: 'Drag file from Explorer', outcome: 'Drop onto Knowledge Graph to focus its relationships, or onto the top banner to open in Editor.' },
  { gesture: 'Alt + Left / Right', outcome: 'Navigate Back and Forward across Editor files and Knowledge Graph views.' },
];

export const GraphGuideDialog: React.FC<GraphGuideDialogProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState<'relationships' | 'nodes' | 'interactions'>('relationships');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Knowledge Graph Guide"
      description="Semantic edge colors, node types, and workspace navigation shortcuts."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-ide-muted">
            <BookOpen className="h-3.5 w-3.5 text-ide-accent" />
            All state, selection, and viewport zoom persist when switching views.
          </span>
          <Button size="sm" variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="-mx-5 -mt-4 mb-4">
        <Tabs
          items={GUIDE_TABS}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as 'relationships' | 'nodes' | 'interactions')}
          ariaLabel="Knowledge Graph Guide sections"
        />
      </div>

      {activeTab === 'relationships' && (
        <div className="space-y-2.5" data-testid="graph-guide-relationships">
          {RELATIONSHIP_ROWS.map((row) => (
            <div
              key={row.key}
              className="flex items-start gap-3 rounded-lg border border-ide-border bg-ide-panel/60 px-3.5 py-2.5"
            >
              <div className="mt-1.5 flex w-14 shrink-0 items-center gap-1.5">
                <span
                  className="h-0.5 w-10 rounded-full"
                  style={{
                    backgroundColor: row.dashed ? 'transparent' : `rgb(${row.token})`,
                    borderTop: row.dashed ? `2px dashed rgb(${row.token})` : undefined,
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-ide-strong">{row.label}</span>
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium border"
                    style={{
                      color: `rgb(${row.token})`,
                      borderColor: `rgb(${row.token} / 0.35)`,
                      backgroundColor: `rgb(${row.token} / 0.1)`,
                    }}
                  >
                    {row.key}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-ide-muted leading-relaxed">{row.description}</p>
                <p className="mt-1 font-mono text-[11px] text-ide-subtle">{row.example}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'nodes' && (
        <div className="space-y-2.5" data-testid="graph-guide-nodes">
          {NODE_TYPE_ROWS.map((row) => {
            const Icon = row.icon;
            return (
              <div
                key={row.key}
                className="flex items-start gap-3 rounded-lg border border-ide-border bg-ide-panel/60 px-3.5 py-3"
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
                  style={{
                    color: `rgb(${row.token})`,
                    borderColor: `rgb(${row.token} / 0.4)`,
                    backgroundColor: `rgb(${row.token} / 0.12)`,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ide-strong">{row.key}</div>
                  <p className="mt-0.5 text-[12px] text-ide-muted leading-relaxed">{row.summary}</p>
                  <p className="mt-1 text-[11px] text-ide-subtle">{row.hint}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'interactions' && (
        <div className="divide-y divide-ide-border rounded-lg border border-ide-border bg-ide-panel/60" data-testid="graph-guide-interactions">
          {INTERACTION_ROWS.map((item) => (
            <div key={item.gesture} className="flex flex-col gap-1 px-3.5 py-2.5 sm:flex-row sm:items-center sm:gap-4">
              <span className="w-52 shrink-0 font-mono text-[11.5px] font-medium text-ide-strong">
                {item.gesture}
              </span>
              <span className="text-[12px] text-ide-muted">{item.outcome}</span>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
};
