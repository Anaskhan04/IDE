import React, { useState } from 'react';
import { Cpu, Network, RefreshCw, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { Badge, Button, EmptyState, Input, Textarea } from '../ui';

export const MasterPromptAnalyzer: React.FC = () => {
  const {
    masterPrompt,
    setMasterPrompt,
    files,
    rebuildAST,
    isAnalyzingAST,
    setActiveView,
  } = useIDE();

  const [projectName, setProjectName] = useState(masterPrompt.projectName);
  const [requirements, setRequirements] = useState(masterPrompt.requirements);
  const [architecture, setArchitecture] = useState(masterPrompt.architecture);
  const [savedStatus, setSavedStatus] = useState(false);

  const handleSave = () => {
    setMasterPrompt((prev) => ({
      ...prev,
      projectName,
      requirements,
      architecture,
    }));
    setSavedStatus(true);
    rebuildAST();
    setTimeout(() => setSavedStatus(false), 2500);
  };

  const allSymbols = files.flatMap((f) =>
    (f.symbols || []).map((s) => ({ ...s, filePath: f.path, fileName: f.name }))
  );

  return (
    <section className="h-full overflow-y-auto bg-ide-bg p-6 font-sans" data-purpose="prompt-analyzer-workspace">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-ide-border pb-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-ide-purple" aria-hidden="true" />
              <h1 className="text-[20px] font-semibold text-ide-strong">Prompt analyzer</h1>
              <Badge variant="neutral">Project context</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-[12px] text-ide-muted">
              Define project requirements and architectural invariants included in AST indexing and AI project context.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              leftIcon={<RefreshCw className={`h-4 w-4 ${isAnalyzingAST ? 'animate-spin' : ''}`} />}
              onClick={() => rebuildAST()}
              disabled={isAnalyzingAST}
            >
              {isAnalyzingAST ? 'Indexing…' : 'Re-index AST'}
            </Button>
            <Button
              variant="primary"
              leftIcon={<Save className="h-4 w-4" />}
              onClick={handleSave}
            >
              {savedStatus ? 'Saved' : 'Save specification'}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4">
            <div className="text-[12px] text-ide-muted">AST fingerprint</div>
            <div className="mt-1 font-mono text-[16px] font-semibold text-ide-strong">
              {masterPrompt.astVersion}
            </div>
            <p className="mt-1 text-[12px] text-ide-subtle">Current workspace symbol hash</p>
          </div>

          <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4">
            <div className="text-[12px] text-ide-muted">Indexed symbols</div>
            <div className="mt-1 font-mono text-[16px] font-semibold text-ide-emerald">
              {allSymbols.length}
            </div>
            <p className="mt-1 text-[12px] text-ide-subtle">Extracted across {files.length} file(s)</p>
          </div>

          <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4">
            <div className="text-[12px] text-ide-muted">Workspace files</div>
            <div className="mt-1 font-mono text-[16px] font-semibold text-ide-strong">
              {files.length}
            </div>
            <p className="mt-1 text-[12px] text-ide-subtle">Live in-memory AST &amp; symbol index</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 rounded-ide-panel border border-ide-border bg-ide-panel p-5 lg:col-span-7">
            <h2 className="text-[14px] font-semibold text-ide-strong">Project specification</h2>

            <Input
              label="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />

            <Textarea
              label="Requirements"
              rows={4}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />

            <Textarea
              label="Architecture notes"
              rows={5}
              value={architecture}
              onChange={(e) => setArchitecture(e.target.value)}
              className="font-mono text-[12px]"
            />

            <div className="space-y-2 pt-1">
              <h3 className="text-[12px] font-semibold text-ide-muted">Architectural invariants</h3>
              <div className="space-y-1.5">
                {masterPrompt.invariants.map((inv, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-ide-control border border-ide-border bg-ide-bg px-3 py-2 text-[12px] text-ide-text"
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0 text-ide-emerald" aria-hidden="true" />
                    <span>{inv}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-ide-panel border border-ide-border bg-ide-panel p-5 lg:col-span-5">
            <div className="flex items-center justify-between border-b border-ide-border pb-3">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ide-strong">
                <Cpu className="h-4 w-4 text-ide-cyan" aria-hidden="true" />
                <span>Extracted symbols ({allSymbols.length})</span>
              </h2>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Network className="h-3.5 w-3.5" />}
                onClick={() => setActiveView('graph')}
              >
                Open graph
              </Button>
            </div>

            {allSymbols.length === 0 ? (
              <EmptyState
                icon={<Cpu className="h-5 w-5" />}
                title="No symbols extracted"
                description="Open or create TypeScript, JavaScript, Python, or C files to index symbols."
              />
            ) : (
              <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                {allSymbols.map((sym) => (
                  <div
                    key={sym.id}
                    className="rounded-ide-control border border-ide-border bg-ide-bg p-3 text-[12px] space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono font-medium text-ide-strong">{sym.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-ide-subtle">Ln {sym.line}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-ide-muted">
                      <span className="truncate font-mono">{sym.fileName}</span>
                      <Badge variant="neutral">{sym.kind}</Badge>
                    </div>
                    {sym.calledBy && sym.calledBy.length > 0 && (
                      <div className="pt-0.5 font-mono text-[11px] text-ide-amber">
                        Callers: {sym.calledBy.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
