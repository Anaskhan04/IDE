import React, { useEffect, useState } from 'react';
import { AlertCircle, Maximize2, Minimize2, Terminal as TerminalIcon, X } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { IconButton, ResizablePanel, Tabs } from '../ui';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { ProblemsPanel } from '../problems/ProblemsPanel';

export const BottomPanel: React.FC = () => {
  const {
    isTerminalOpen,
    setIsTerminalOpen,
    isProblemsPanelOpen,
    setIsProblemsPanelOpen,
    diagnosticsSummary,
  } = useIDE();

  const [activeTab, setActiveTab] = useState<'terminal' | 'problems'>(() =>
    isProblemsPanelOpen && !isTerminalOpen ? 'problems' : 'terminal'
  );
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (isTerminalOpen && !isProblemsPanelOpen) {
      setActiveTab('terminal');
    } else if (isProblemsPanelOpen && !isTerminalOpen) {
      setActiveTab('problems');
    }
  }, [isTerminalOpen, isProblemsPanelOpen]);

  if (!isTerminalOpen && !isProblemsPanelOpen) {
    return null;
  }

  const issueCount = diagnosticsSummary.errorCount + diagnosticsSummary.warningCount;

  const handleTabChange = (id: string) => {
    if (id === 'terminal') {
      setActiveTab('terminal');
      if (!isTerminalOpen) setIsTerminalOpen(true);
    } else if (id === 'problems') {
      setActiveTab('problems');
      if (!isProblemsPanelOpen) setIsProblemsPanelOpen(true);
    }
  };

  const handleClose = () => {
    setIsTerminalOpen(false);
    setIsProblemsPanelOpen(false);
    setIsMaximized(false);
  };

  const content = (
    <div className="flex h-full min-h-0 flex-col bg-ide-shell">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-ide-border bg-ide-shell pr-2">
        <Tabs
          ariaLabel="Bottom panel views"
          activeId={activeTab}
          onChange={handleTabChange}
          className="border-b-0"
          items={[
            {
              id: 'terminal',
              label: 'Terminal',
              icon: <TerminalIcon className="h-3.5 w-3.5" aria-hidden="true" />,
            },
            {
              id: 'problems',
              label: 'Problems',
              icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />,
              badge: issueCount > 0 ? issueCount : undefined,
            },
          ]}
        />
        <div className="flex items-center gap-1">
          <IconButton
            size="sm"
            label={isMaximized ? 'Restore panel size' : 'Maximize panel'}
            onClick={() => setIsMaximized((v) => !v)}
          >
            {isMaximized ? (
              <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </IconButton>
          <IconButton size="sm" label="Close bottom panel" onClick={handleClose}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-ide-bg">
        {activeTab === 'terminal' ? <TerminalPanel embedded /> : <ProblemsPanel embedded />}
      </div>
    </div>
  );

  if (isMaximized) {
    return (
      <section
        aria-label="Bottom panel"
        className="h-[60vh] shrink-0 border-t border-ide-border bg-ide-shell"
      >
        {content}
      </section>
    );
  }

  return (
    <ResizablePanel
      direction="vertical"
      handlePosition="start"
      defaultSize={240}
      minSize={140}
      maxSize={520}
      ariaLabel="Resize bottom panel"
      className="border-t border-ide-border bg-ide-shell"
    >
      {content}
    </ResizablePanel>
  );
};
