import React from 'react';
import { useIDE } from './context/IDEContext';
import { TopNav } from './components/layout/TopNav';
import { ActivityBar } from './components/layout/ActivityBar';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { CodeEditor } from './components/editor/CodeEditor';
import { CIASimulator } from './components/change-impact/CIASimulator';
import { MCPDashboard } from './components/mcp-hub/MCPDashboard';
// Secondary views commented out - easily uncomment when ready to re-enable:
// import { KnowledgeGraphCanvas } from './components/knowledge-graph/KnowledgeGraphCanvas';
// import { ValidationRunner } from './components/validation/ValidationRunner';
// import { BenchmarkDashboard } from './components/evaluation/BenchmarkDashboard';
// import { MasterPromptAnalyzer } from './components/analyzer/MasterPromptAnalyzer';
import { ModelGatewayChat } from './components/model-gateway/ModelGatewayChat';
import { ModelSwitcherModal } from './components/model-gateway/ModelSwitcherModal';

export const AppContent: React.FC = () => {
  const { activeView, isCopilotOpen } = useIDE();

  return (
    <div className="h-screen w-screen bg-[#080c14] text-slate-300 font-sans select-none overflow-hidden flex flex-col antialiased text-[13px]">
      {/* Top Application Header */}
      <TopNav />

      {/* Main Multi-Pane Workplace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar (Far Left vertical icon bar) */}
        <ActivityBar />

        {/* Left Explorer Sidebar */}
        <Sidebar />

        {/* Center Workspace (Active View) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0b0f19]">
          {activeView === 'editor' && <CodeEditor />}
          {activeView === 'cia' && <CIASimulator />}
          {activeView === 'mcp' && <MCPDashboard />}

          {/* Commented out views - uncomment below to restore:
          {activeView === 'graph' && <KnowledgeGraphCanvas />}
          {activeView === 'validation' && <ValidationRunner />}
          {activeView === 'evaluation' && <BenchmarkDashboard />}
          {activeView === 'analyzer' && <MasterPromptAnalyzer />}
          */}
        </div>

        {/* Right AI Copilot / Model Gateway (Collapsible) */}
        {isCopilotOpen && <ModelGatewayChat />}
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
