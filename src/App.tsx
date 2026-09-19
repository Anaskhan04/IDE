import React from 'react';
import { useIDE } from './context/IDEContext';
import { TopNav } from './components/layout/TopNav';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { CodeEditor } from './components/editor/CodeEditor';
import { KnowledgeGraphCanvas } from './components/knowledge-graph/KnowledgeGraphCanvas';
import { CIASimulator } from './components/change-impact/CIASimulator';
import { MCPDashboard } from './components/mcp-hub/MCPDashboard';
import { ValidationRunner } from './components/validation/ValidationRunner';
import { BenchmarkDashboard } from './components/evaluation/BenchmarkDashboard';
import { MasterPromptAnalyzer } from './components/analyzer/MasterPromptAnalyzer';
import { ModelGatewayChat } from './components/model-gateway/ModelGatewayChat';
import { ModelSwitcherModal } from './components/model-gateway/ModelSwitcherModal';

export const AppContent: React.FC = () => {
  const { activeView } = useIDE();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ide-bg text-slate-200">
      {/* Top Application Header */}
      <TopNav />

      {/* Main Multi-Pane Workplace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Explorer & Symbol Sidebar */}
        <Sidebar />

        {/* Center Workspace (Active View) */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-ide-panel/30">
          {activeView === 'editor' && <CodeEditor />}
          {/* Knowledge Graph disabled as requested: {activeView === 'graph' && <KnowledgeGraphCanvas />} */}
          {activeView === 'cia' && <CIASimulator />}
          {activeView === 'mcp' && <MCPDashboard />}
          {activeView === 'validation' && <ValidationRunner />}
          {activeView === 'evaluation' && <BenchmarkDashboard />}
          {activeView === 'analyzer' && <MasterPromptAnalyzer />}
        </main>

        {/* Right AI Assistant / Persistent Context Gateway */}
        <ModelGatewayChat />
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Model Switcher Modal */}
      <ModelSwitcherModal />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
