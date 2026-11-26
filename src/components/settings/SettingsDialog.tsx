import React, { useState } from 'react';
import {
  Cpu,
  FolderOpen,
  Github,
  Info,
  Keyboard,
  Palette,
  Sliders,
  Terminal as TerminalIcon,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { Badge, Button, Checkbox, Dialog, Divider, Select } from '../ui';

type SettingsSection =
  | 'general'
  | 'appearance'
  | 'editor'
  | 'terminal'
  | 'ai'
  | 'accounts'
  | 'shortcuts'
  | 'about';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');

const NAV_ITEMS: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Sliders className="h-4 w-4" aria-hidden="true" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" aria-hidden="true" /> },
  { id: 'editor', label: 'Editor', icon: <FolderOpen className="h-4 w-4" aria-hidden="true" /> },
  { id: 'terminal', label: 'Terminal', icon: <TerminalIcon className="h-4 w-4" aria-hidden="true" /> },
  { id: 'ai', label: 'AI providers', icon: <Cpu className="h-4 w-4" aria-hidden="true" /> },
  { id: 'accounts', label: 'Accounts', icon: <Github className="h-4 w-4" aria-hidden="true" /> },
  { id: 'shortcuts', label: 'Keyboard shortcuts', icon: <Keyboard className="h-4 w-4" aria-hidden="true" /> },
  { id: 'about', label: 'About', icon: <Info className="h-4 w-4" aria-hidden="true" /> },
];

export const SettingsDialog: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    masterPrompt,
    workspacePath,
    files,
    gitBranch,
    isGitRepo,
    editorSettings,
    updateEditorSettings,
    appTheme,
    setAppTheme,
    activeModel,
    configuredProviders,
    setIsModelSwitchingModalOpen,
    githubUser,
    setIsGitHubModalOpen,
    terminalCwd,
  } = useIDE();

  const [section, setSection] = useState<SettingsSection>('general');

  const modKey = isMac ? '⌘' : 'Ctrl';
  const configuredCount = Object.values(configuredProviders).filter(Boolean).length;

  return (
    <Dialog
      open={isSettingsOpen}
      onClose={() => setIsSettingsOpen(false)}
      title="Settings"
      description="Configure workspace preferences, appearance, editor behavior, and connected services."
      size="lg"
    >
      <div className="flex min-h-[380px] flex-col gap-4 md:flex-row">
        <nav
          aria-label="Settings categories"
          className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-ide-border pb-3 md:w-48 md:flex-col md:border-b-0 md:border-r md:pb-0 md:pr-4"
        >
          {NAV_ITEMS.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`ide-focus-ring flex h-8 shrink-0 items-center gap-2 rounded-ide-control px-2.5 text-left font-sans text-[13px] transition-colors duration-150 ${
                  active
                    ? 'bg-ide-selected font-medium text-ide-strong'
                    : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'
                }`}
              >
                <span className={active ? 'text-ide-focus' : 'text-ide-subtle'}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 space-y-5 font-sans text-[13px]">
          {section === 'general' && (
            <div className="space-y-4">
              <h3 className="text-[14px] font-semibold text-ide-strong">Workspace</h3>
              <div className="rounded-ide-control border border-ide-border bg-ide-surface p-3.5 space-y-2 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ide-muted">Active project</span>
                  <span className="font-medium text-ide-strong">{masterPrompt.projectName || 'workspace'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ide-muted">Disk location</span>
                  <span className="truncate font-mono text-ide-text">{workspacePath || 'Browser memory'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ide-muted">Files indexed</span>
                  <span className="font-mono text-ide-text">{files.length}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ide-muted">Source control</span>
                  <span className="font-mono text-ide-text">{isGitRepo ? gitBranch || 'HEAD' : 'Not initialized'}</span>
                </div>
              </div>
            </div>
          )}

          {section === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[14px] font-semibold text-ide-strong">Theme</h3>
                <p className="mt-1 text-[12px] text-ide-muted">
                  Theme preferences apply immediately and persist across reloads.
                </p>
              </div>
              <Select
                label="Color theme"
                value={appTheme}
                onChange={(e) => setAppTheme(e.target.value as 'obsidian' | 'light')}
                options={[
                  { value: 'obsidian', label: 'IntelliCode Obsidian (Default Dark)' },
                  { value: 'light', label: 'IntelliCode Light (Preview)' },
                ]}
                helperText="Note: Graph, Impact, and Benchmark views complete full light-theme migration in Phases E–F."
              />
            </div>
          )}

          {section === 'editor' && (
            <div className="space-y-4">
              <h3 className="text-[14px] font-semibold text-ide-strong">Editor preferences</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Font size"
                  value={String(editorSettings.fontSize)}
                  onChange={(e) => updateEditorSettings({ fontSize: Number(e.target.value) })}
                  options={[11, 12, 13, 14, 15, 16, 18, 20].map((s) => ({
                    value: String(s),
                    label: `${s} px`,
                  }))}
                />
                <Select
                  label="Tab size"
                  value={String(editorSettings.tabSize)}
                  onChange={(e) => updateEditorSettings({ tabSize: Number(e.target.value) })}
                  options={[
                    { value: '2', label: '2 spaces' },
                    { value: '4', label: '4 spaces' },
                    { value: '8', label: '8 spaces' },
                  ]}
                />
              </div>
              <Divider />
              <div className="space-y-3">
                <Checkbox
                  label="Word wrap"
                  description="Wrap long lines within the editor viewport."
                  checked={editorSettings.wordWrap}
                  onChange={(e) => updateEditorSettings({ wordWrap: e.target.checked })}
                />
                <Checkbox
                  label="Show minimap"
                  description="Display a compact code overview beside the editor."
                  checked={editorSettings.showMinimap}
                  onChange={(e) => updateEditorSettings({ showMinimap: e.target.checked })}
                />
                <Checkbox
                  label="Show line numbers"
                  description="Display line numbers and diagnostic markers in the gutter."
                  checked={editorSettings.lineNumbers}
                  onChange={(e) => updateEditorSettings({ lineNumbers: e.target.checked })}
                />
              </div>
            </div>
          )}

          {section === 'terminal' && (
            <div className="space-y-4">
              <h3 className="text-[14px] font-semibold text-ide-strong">Integrated terminal</h3>
              <div className="rounded-ide-control border border-ide-border bg-ide-surface p-3.5 space-y-2 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ide-muted">Working directory</span>
                  <span className="truncate font-mono text-ide-text">{terminalCwd || workspacePath || 'Active workspace root'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ide-muted">Execution mode</span>
                  <Badge variant="neutral">Local OS shell (localhost only)</Badge>
                </div>
              </div>
            </div>
          )}

          {section === 'ai' && (
            <div className="space-y-4">
              <h3 className="text-[14px] font-semibold text-ide-strong">AI providers &amp; models</h3>
              <div className="rounded-ide-control border border-ide-border bg-ide-surface p-3.5 space-y-2 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ide-muted">Active model</span>
                  <span className="font-medium text-ide-strong">{activeModel.name}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ide-muted">Configured API keys</span>
                  <span className="text-ide-text">{configuredCount} provider(s)</span>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsModelSwitchingModalOpen(true);
                }}
              >
                Open AI models &amp; provider settings
              </Button>
            </div>
          )}

          {section === 'accounts' && (
            <div className="space-y-4">
              <h3 className="text-[14px] font-semibold text-ide-strong">Accounts &amp; connected services</h3>
              <div className="rounded-ide-control border border-ide-border bg-ide-surface p-3.5 space-y-2 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ide-muted">Local workspace</span>
                  <Badge variant="success">Active (no login required)</Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ide-muted">GitHub</span>
                  <Badge variant={githubUser ? 'success' : 'neutral'}>
                    {githubUser ? `@${githubUser.login}` : 'Not connected'}
                  </Badge>
                </div>
              </div>
              <Button
                variant="secondary"
                leftIcon={<Github className="h-4 w-4" />}
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsGitHubModalOpen(true);
                }}
              >
                {githubUser ? 'Manage GitHub account' : 'Connect GitHub'}
              </Button>
            </div>
          )}

          {section === 'shortcuts' && (
            <div className="space-y-3">
              <h3 className="text-[14px] font-semibold text-ide-strong">Keyboard shortcuts</h3>
              <div className="divide-y divide-ide-border rounded-ide-control border border-ide-border bg-ide-surface text-[12px]">
                {[
                  ['Global search & commands', `${modKey}+K`],
                  ['Quick open file', `${modKey}+P`],
                  ['Toggle integrated terminal', `${modKey}+\``],
                  ['Toggle problems panel', `${modKey}+Shift+M`],
                  ['Save active file', `${modKey}+S`],
                  ['Save all files', `${modKey}+Shift+S`],
                  ['Find in file', `${modKey}+F`],
                  ['Open settings', `${modKey}+,`],
                ].map(([label, shortcut]) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2">
                    <span className="text-ide-text">{label}</span>
                    <kbd className="rounded-ide-small border border-ide-border bg-ide-bg px-2 py-0.5 font-mono text-[11px] text-ide-muted">
                      {shortcut}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'about' && (
            <div className="space-y-3">
              <h3 className="text-[14px] font-semibold text-ide-strong">IntelliCode IDE</h3>
              <p className="text-[12px] text-ide-muted leading-relaxed">
                Local-first development environment with TypeScript semantic diagnostics, AST Knowledge Graph, Change Impact Analysis, integrated Git &amp; terminal, and multi-provider AI assistance.
              </p>
              <div className="rounded-ide-control border border-ide-border bg-ide-surface p-3 space-y-1.5 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-ide-muted">Version</span>
                  <span className="font-mono text-ide-text">0.24.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ide-muted">Design System</span>
                  <span className="text-ide-text">2.0 (IntelliCode Obsidian)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
