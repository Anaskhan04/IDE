import React, { Suspense, lazy } from 'react';
import { useIDE } from './context/IDEContext';
import { TopNav } from './components/layout/TopNav';
import { ActivityBar } from './components/layout/ActivityBar';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { WorkspaceModeTabs } from './components/layout/WorkspaceModeTabs';
import { CodeEditor } from './components/editor/CodeEditor';

const CIASimulator = lazy(() =>
  import('./components/change-impact/CIASimulator').then(m => ({ default: m.CIASimulator }))
);
const MCPDashboard = lazy(() =>
  import('./components/mcp-hub/MCPDashboard').then(m => ({ default: m.MCPDashboard }))
);
const KnowledgeGraphCanvas = lazy(() =>
  import('./components/knowledge-graph/KnowledgeGraphCanvas').then(m => ({ default: m.KnowledgeGraphCanvas }))
);
const ValidationRunner = lazy(() =>
  import('./components/validation/ValidationRunner').then(m => ({ default: m.ValidationRunner }))
);
const ModelGatewayChat = lazy(() =>
  import('./components/model-gateway/ModelGatewayChat').then(m => ({ default: m.ModelGatewayChat }))
);
const ModelSwitcherModal = lazy(() =>
  import('./components/model-gateway/ModelSwitcherModal').then(m => ({ default: m.ModelSwitcherModal }))
);
const ProblemsPanel = lazy(() =>
  import('./components/problems/ProblemsPanel').then(m => ({ default: m.ProblemsPanel }))
);
const TerminalPanel = lazy(() =>
  import('./components/terminal/TerminalPanel').then(m => ({ default: m.TerminalPanel }))
);
const GitHubAuthModal = lazy(() =>
  import('./components/github/GitHubAuthModal').then(m => ({ default: m.GitHubAuthModal }))
);

export const AppContent: React.FC = () => {
  const { activeView, isCopilotOpen, isProblemsPanelOpen, isTerminalOpen } = useIDE();

  return (
    <div className="flex h-screen w-screen select-none flex-col overflow-hidden bg-ide-bg font-sans text-[13px] text-ide-text antialiased">
      <TopNav />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ActivityBar />
        <Sidebar />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-ide-bg">
          <WorkspaceModeTabs />
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <Suspense fallback={<div className="flex flex-1 items-center justify-center text-xs text-ide-text-muted">Loading panel...</div>}>
              {activeView === 'editor' && <CodeEditor />}
              {activeView === 'cia' && <CIASimulator />}
              {activeView === 'mcp' && <MCPDashboard />}
              {activeView === 'graph' && <KnowledgeGraphCanvas />}
              {activeView === 'validation' && <ValidationRunner />}
              {!['editor', 'cia', 'mcp', 'graph', 'validation'].includes(activeView) && <CodeEditor />}
            </Suspense>
          </div>
          <Suspense fallback={null}>
            {isProblemsPanelOpen && <ProblemsPanel />}
            {isTerminalOpen && <TerminalPanel />}
          </Suspense>
        </main>

        <Suspense fallback={null}>
          {isCopilotOpen && <ModelGatewayChat />}
        </Suspense>
      </div>

      <StatusBar />
      <Suspense fallback={null}>
        <ModelSwitcherModal />
        <GitHubAuthModal />
      </Suspense>
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
