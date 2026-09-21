import React from 'react';
import { useIDE } from './context/IDEContext';
import { TopNav } from './components/layout/TopNav';
import { ActivityBar } from './components/layout/ActivityBar';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { WorkspaceModeTabs } from './components/layout/WorkspaceModeTabs';
import { CodeEditor } from './components/editor/CodeEditor';
import { CIASimulator } from './components/change-impact/CIASimulator';
import { MCPDashboard } from './components/mcp-hub/MCPDashboard';
import { KnowledgeGraphCanvas } from './components/knowledge-graph/KnowledgeGraphCanvas';
import { ValidationRunner } from './components/validation/ValidationRunner';
import { ModelGatewayChat } from './components/model-gateway/ModelGatewayChat';
import { ModelSwitcherModal } from './components/model-gateway/ModelSwitcherModal';

export const AppContent: React.FC = () => {
  const { activeView, isCopilotOpen } = useIDE();

  return (
    <div className="flex h-screen w-screen select-none flex-col overflow-hidden bg-ide-bg font-sans text-[13px] text-ide-text antialiased">
      <TopNav />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ActivityBar />
        <Sidebar />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-ide-bg">
          <WorkspaceModeTabs />
          <div className="min-h-0 flex-1 overflow-hidden">
            {activeView === 'editor' && <CodeEditor />}
            {activeView === 'cia' && <CIASimulator />}
            {activeView === 'mcp' && <MCPDashboard />}
            {activeView === 'graph' && <KnowledgeGraphCanvas />}
            {activeView === 'validation' && <ValidationRunner />}
            {!['editor', 'cia', 'mcp', 'graph', 'validation'].includes(activeView) && <CodeEditor />}
          </div>
        </main>

        {isCopilotOpen && <ModelGatewayChat />}
      </div>

      <StatusBar />
      <ModelSwitcherModal />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
