import React, { useState } from 'react';
import {
  Check,
  Code2,
  FolderGit2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sun,
  Moon,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  LoadingState,
  Menu,
  NotificationBanner,
  Popover,
  ResizablePanel,
  Select,
  Tabs,
  Textarea,
  Tooltip,
} from './index';

export const ComponentShowcase: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    document.documentElement.classList.contains('light') ? 'light' : 'dark'
  );
  const [activeTab, setActiveTab] = useState('buttons');
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [selectValue, setSelectValue] = useState('obsidian');
  const [checked, setChecked] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('light', next === 'light');
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <div className="h-screen w-screen overflow-y-auto bg-ide-bg p-6 font-sans text-[13px] text-ide-text">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ide-border pb-4">
          <div>
            <h1 className="text-[20px] font-semibold text-ide-strong">
              IntelliCode Design System 2.0 Showcase
            </h1>
            <p className="mt-1 text-[12px] text-ide-muted">
              Development-only verification of IntelliCode Obsidian &amp; Light tokens, typography, and shared primitives.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              leftIcon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              onClick={toggleTheme}
            >
              Switch to {theme === 'dark' ? 'Light' : 'Obsidian Dark'}
            </Button>
            <Button variant="ghost" onClick={() => (window.location.href = '/')}>
              Back to IDE
            </Button>
          </div>
        </header>

        <Tabs
          ariaLabel="Showcase sections"
          activeId={activeTab}
          onChange={setActiveTab}
          items={[
            { id: 'buttons', label: 'Controls & Tokens' },
            { id: 'forms', label: 'Forms & Overlays' },
            { id: 'states', label: 'States & Layout', badge: 'Live' },
          ]}
        />

        {activeTab === 'buttons' && (
          <section className="space-y-6">
            <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4 space-y-3">
              <h2 className="text-[14px] font-semibold text-ide-strong">Tokens &amp; Badges</h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">Neutral</Badge>
                <Badge variant="accent">Accent</Badge>
                <Badge variant="success">Connected</Badge>
                <Badge variant="warning">Unsaved</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="intelligence">Intelligence</Badge>
              </div>
              <Divider />
              <div className="space-y-1">
                <div className="text-[20px] font-semibold text-ide-strong">Main heading (20px / 600)</div>
                <div className="text-[18px] font-semibold text-ide-strong">Dialog title (18px / 600)</div>
                <div className="text-[14px] font-semibold text-ide-strong">Section heading (14px / 600)</div>
                <div className="text-[13px] text-ide-text">Standard UI body text (13px / 400)</div>
                <div className="text-[12px] text-ide-muted">Supporting metadata text (12px / 400)</div>
                <div className="font-mono text-[14px] text-ide-cyan">
                  const codeSample = &quot;JetBrains Mono 14px&quot;;
                </div>
              </div>
            </div>

            <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4 space-y-4">
              <h2 className="text-[14px] font-semibold text-ide-strong">Buttons &amp; IconButtons</h2>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>Primary</Button>
                <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />}>Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>Danger</Button>
                <Button variant="primary" loading>Loading</Button>
                <Button variant="secondary" disabled>Disabled</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Tooltip content="Search files">
                  <IconButton label="Search files">
                    <Search className="h-4 w-4" />
                  </IconButton>
                </Tooltip>
                <IconButton label="Settings" variant="secondary">
                  <Settings className="h-4 w-4" />
                </IconButton>
                <IconButton label="Active code view" active>
                  <Code2 className="h-4 w-4" />
                </IconButton>
                <IconButton label="Loading action" loading>
                  <RefreshCw className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'forms' && (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4 space-y-4">
              <h2 className="text-[14px] font-semibold text-ide-strong">Inputs &amp; Validation</h2>
              <Input
                label="Workspace name"
                placeholder="intellicode-workspace"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setInputError(e.target.value.includes(' ') ? 'Spaces are not allowed.' : '');
                }}
                error={inputError}
                helperText={!inputError ? 'Lowercase letters and hyphens recommended.' : undefined}
              />
              <Select
                label="Theme preview"
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                options={[
                  { value: 'obsidian', label: 'IntelliCode Obsidian' },
                  { value: 'light', label: 'IntelliCode Light' },
                ]}
              />
              <Textarea label="Notes" placeholder="Add implementation notes…" />
              <Checkbox
                label="Preserve unsaved editor buffers"
                description="Protects open forms from accidental dismissal."
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
            </div>

            <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4 space-y-4">
              <h2 className="text-[14px] font-semibold text-ide-strong">Dialogs, Menus &amp; Popovers</h2>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={() => setDialogOpen(true)}>
                  Open Dialog
                </Button>

                <Menu
                  trigger={(props) => (
                    <Button
                      variant="secondary"
                      rightIcon={<MoreVertical className="h-4 w-4" />}
                      onClick={props.toggle}
                      aria-expanded={props['aria-expanded']}
                      aria-haspopup={props['aria-haspopup']}
                    >
                      Actions Menu
                    </Button>
                  )}
                  items={[
                    { id: 'open', label: 'Open file', shortcut: 'Ctrl+O', onSelect: () => {} },
                    { id: 'sync', label: 'Refresh models', icon: <RefreshCw className="h-4 w-4" />, onSelect: () => {} },
                    { id: 'del', label: 'Delete item', danger: true, icon: <Trash2 className="h-4 w-4" />, onSelect: () => {} },
                  ]}
                />

                <Popover
                  open={popoverOpen}
                  onClose={() => setPopoverOpen(false)}
                  ariaLabel="Sample popover"
                  trigger={
                    <Button variant="secondary" onClick={() => setPopoverOpen((v) => !v)}>
                      Toggle Popover
                    </Button>
                  }
                >
                  <div className="w-56 space-y-2 text-[12px]">
                    <div className="font-semibold text-ide-strong">Local Workspace</div>
                    <p className="text-ide-muted">Keyboard Escape or outside click closes this popover.</p>
                  </div>
                </Popover>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'states' && (
          <section className="space-y-4">
            {bannerVisible && (
              <NotificationBanner
                variant="info"
                title="Design System 2.0"
                message="All primitives in src/components/ui/ use semantic Obsidian & Light tokens."
                onDismiss={() => setBannerVisible(false)}
              />
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <EmptyState
                icon={<FolderGit2 className="h-5 w-5" />}
                title="No repositories open"
                description="Open a local folder or connect GitHub."
                action={<Button size="sm" variant="primary">Open folder</Button>}
              />
              <LoadingState label="Indexing workspace symbols…" className="rounded-ide-panel border border-ide-border bg-ide-panel" />
              <ErrorState
                title="Connection failed"
                message="Could not reach local provider."
                onRetry={() => {}}
              />
            </div>

            <div className="h-40 overflow-hidden rounded-ide-panel border border-ide-border bg-ide-panel flex">
              <ResizablePanel
                direction="horizontal"
                handlePosition="end"
                defaultSize={248}
                minSize={180}
                maxSize={420}
                ariaLabel="Resize demo sidebar"
                className="bg-ide-shell p-3"
              >
                <div className="text-[12px] font-semibold text-ide-strong">Resizable Sidebar</div>
                <p className="mt-1 text-[12px] text-ide-muted">
                  Drag handle or focus separator + press ArrowLeft/ArrowRight.
                </p>
              </ResizablePanel>
              <div className="flex-1 p-4 text-[12px] text-ide-muted">
                Main workspace area (flex-1)
              </div>
            </div>
          </section>
        )}

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Sample Accessible Dialog"
          description="Traps keyboard focus and restores focus to the trigger button on close."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="primary" leftIcon={<Check className="h-4 w-4" />} onClick={() => setDialogOpen(false)}>
                Confirm
              </Button>
            </>
          }
        >
          <p className="text-[13px] text-ide-text">
            Press Tab to cycle focus inside this dialog, or press Escape to close and restore focus.
          </p>
        </Dialog>
      </div>
    </div>
  );
};
