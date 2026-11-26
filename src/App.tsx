import React, { Suspense, lazy, useState } from 'react';
import { ArrowLeft, FileCode2 } from 'lucide-react';
import { useIDE } from './context/IDEContext';
import { TopNav } from './components/layout/TopNav';
import { ActivityBar } from './components/layout/ActivityBar';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { BottomPanel } from './components/layout/BottomPanel';
import { CodeEditor } from './components/editor/CodeEditor';
import { PanelErrorBoundary } from './components/common/PanelErrorBoundary';
import { Button, ResizablePanel } from './components/ui';
import { getWorkspaceDragId, parseWorkspaceDragPayload } from './utils/workspaceDragDrop';

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
const MasterPromptAnalyzer = lazy(() =>
  import('./components/analyzer/MasterPromptAnalyzer').then(m => ({ default: m.MasterPromptAnalyzer }))
);
const BenchmarkDashboard = lazy(() =>
  import('./components/evaluation/BenchmarkDashboard').then(m => ({ default: m.BenchmarkDashboard }))
);
const ModelGatewayChat = lazy(() =>
  import('./components/model-gateway/ModelGatewayChat').then(m => ({ default: m.ModelGatewayChat }))
);
const ModelSwitcherModal = lazy(() =>
  import('./components/model-gateway/ModelSwitcherModal').then(m => ({ default: m.ModelSwitcherModal }))
);
const GitHubAuthModal = lazy(() =>
  import('./components/github/GitHubAuthModal').then(m => ({ default: m.GitHubAuthModal }))
);
const SettingsDialog = lazy(() =>
  import('./components/settings/SettingsDialog').then(m => ({ default: m.SettingsDialog }))
);
const ComponentShowcase = import.meta.env.DEV
  ? lazy(() => import('./components/ui/ComponentShowcase').then(m => ({ default: m.ComponentShowcase })))
  : null;

const VIEW_LABELS: Record<string, string> = {
  cia: 'Impact analysis',
  mcp: 'MCP Hub',
  graph: 'Knowledge graph',
  validation: 'Validation',
  analyzer: 'Prompt analyzer',
  evaluation: 'Benchmarks',
};

export const AppContent: React.FC = () => {
  const { activeView, setActiveView, isSidebarVisible, isCopilotOpen, files, openFile, workspacePath } = useIDE();
  const [isWorkspaceFileDragging, setIsWorkspaceFileDragging] = useState(false);
  const [isEditorDropActive, setIsEditorDropActive] = useState(false);
  const workspaceDragId = getWorkspaceDragId(workspacePath);

  const handleDropToEditor = (e: React.DragEvent) => {
    e.preventDefault();
    setIsWorkspaceFileDragging(false);
    setIsEditorDropActive(false);
    const parsed = parseWorkspaceDragPayload(e.dataTransfer, workspaceDragId, files);
    if (!parsed.valid) return;
    if (parsed.file) {
      openFile(parsed.file.id);
      return;
    }
    const payload = parsed.payload;
    const targetFile =
      files.find((f) => payload.fileId && f.id === payload.fileId) ||
      files.find((f) => payload.filePath && f.path === payload.filePath);
    if (targetFile) {
      openFile(targetFile.id);
    }
  };

  return (
    <div className="flex h-screen w-screen select-none flex-col overflow-hidden bg-ide-bg font-sans text-[13px] text-ide-text antialiased">
      <TopNav />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ActivityBar />

        {isSidebarVisible && (
          <ResizablePanel
            direction="horizontal"
            handlePosition="end"
            defaultSize={248}
            minSize={200}
            maxSize={420}
            ariaLabel="Resize Explorer sidebar"
            className="border-r border-ide-border bg-ide-sidebar"
          >
            <PanelErrorBoundary panelName="Sidebar">
              <Sidebar />
            </PanelErrorBoundary>
          </ResizablePanel>
        )}

        <main
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-ide-bg"
          onDragOver={(e) => {
            if (activeView === 'editor') return;
            const types = Array.from(e.dataTransfer?.types || []);
            if (types.includes('application/x-intellicode-workspace') || types.includes('text/plain')) {
              setIsWorkspaceFileDragging(true);
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setIsWorkspaceFileDragging(false);
              setIsEditorDropActive(false);
            }
          }}
          onDrop={() => {
            setIsWorkspaceFileDragging(false);
            setIsEditorDropActive(false);
          }}
        >
          {activeView !== 'editor' && (
            <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-ide-border bg-ide-shell px-3">
              <span className="font-sans text-[13px] font-semibold text-ide-strong">
                {VIEW_LABELS[activeView] || 'Workspace'}
              </span>
              {isWorkspaceFileDragging && (
                <div
                  data-testid="global-editor-drop-zone"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditorDropActive(true);
                  }}
                  onDragLeave={() => setIsEditorDropActive(false)}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleDropToEditor(e);
                  }}
                  className={`flex items-center gap-1.5 rounded-ide-control border px-3 py-1 text-xs font-medium transition-colors ${
                    isEditorDropActive
                      ? 'border-ide-focus bg-ide-selected text-ide-strong'
                      : 'border-dashed border-ide-border-strong bg-ide-panel text-ide-muted'
                  }`}
                >
                  <FileCode2 className="h-3.5 w-3.5 text-ide-focus" aria-hidden="true" />
                  <span>Drop here to open in Editor</span>
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setActiveView('editor')}
              >
                Back to editor
              </Button>
            </div>
          )}

          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <PanelErrorBoundary panelName="Workspace View">
              <Suspense fallback={<div className="flex flex-1 items-center justify-center text-[13px] text-ide-muted">Loading view…</div>}>
                {activeView === 'editor' && <CodeEditor />}
                {activeView === 'cia' && <CIASimulator />}
                {activeView === 'mcp' && <MCPDashboard />}
                {activeView === 'graph' && <KnowledgeGraphCanvas />}
                {activeView === 'validation' && <ValidationRunner />}
                {activeView === 'analyzer' && <MasterPromptAnalyzer />}
                {activeView === 'evaluation' && <BenchmarkDashboard />}
                {!['editor', 'cia', 'mcp', 'graph', 'validation', 'analyzer', 'evaluation'].includes(activeView) && <CodeEditor />}
              </Suspense>
            </PanelErrorBoundary>
          </div>

          <PanelErrorBoundary panelName="Bottom Panel">
            <BottomPanel />
          </PanelErrorBoundary>
        </main>

        {isCopilotOpen && (
          <ResizablePanel
            direction="horizontal"
            handlePosition="start"
            defaultSize={360}
            minSize={300}
            maxSize={520}
            ariaLabel="Resize AI Assistant sidebar"
            className="border-l border-ide-border bg-ide-panel"
          >
            <Suspense fallback={null}>
              <PanelErrorBoundary panelName="AI Assistant">
                <ModelGatewayChat />
              </PanelErrorBoundary>
            </Suspense>
          </ResizablePanel>
        )}
      </div>

      <StatusBar />
      <Suspense fallback={null}>
        <ModelSwitcherModal />
        <GitHubAuthModal />
        <SettingsDialog />
      </Suspense>
    </div>
  );
};

export default function App() {
  if (
    import.meta.env.DEV &&
    ComponentShowcase &&
    typeof window !== 'undefined' &&
    window.location.search.includes('showcase=1')
  ) {
    return (
      <Suspense fallback={null}>
        <ComponentShowcase />
      </Suspense>
    );
  }
  return <AppContent />;
}
