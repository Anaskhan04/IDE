import React, { useState } from 'react';
import { ArrowRight, ChevronRight, FileCheck, FileCode, Layers, Play, ShieldAlert } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';

const severityTone: Record<string, { label: string; text: string; marker: string }> = {
  critical: { label: 'Critical', text: 'text-ide-rose', marker: 'bg-ide-rose' },
  high: { label: 'High', text: 'text-ide-rose', marker: 'bg-ide-rose' },
  moderate: { label: 'Moderate', text: 'text-ide-amber', marker: 'bg-ide-amber' },
  low: { label: 'Low', text: 'text-ide-focus', marker: 'bg-ide-focus' },
};

export const CIASimulator: React.FC = () => {
  const {
    ciaResult,
    runChangeImpactAnalysis,
    openFile,
    setActiveView,
    runTests,
    isExecutingTests,
    files,
  } = useIDE();

  const [selectedScenario, setSelectedScenario] = useState<'payment' | 'auth'>('payment');
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);
  const hasModifiedTarget = files.some((file) => file.isModified && file.id === ciaResult.targetId);
  const hasAnalysis = hasRunAnalysis || hasModifiedTarget;
  const tone = severityTone[ciaResult.severity] || severityTone.low;

  const handleSwitchScenario = (scenario: 'payment' | 'auth') => {
    setSelectedScenario(scenario);
    setHasRunAnalysis(true);
    runChangeImpactAnalysis(scenario === 'payment' ? 'payment-service' : 'auth-service');
  };

  return (
    <section id="cia-workspace" className="flex h-full min-h-0 flex-col overflow-y-auto bg-ide-bg" data-purpose="change-impact-workspace">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-ide-border pb-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-ide-amber" aria-hidden="true" />
              <h1 className="text-base font-semibold text-ide-strong">Change impact analysis</h1>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ide-muted">Review what this change reaches before running the affected tests.</p>
          </div>
          <div className="flex items-center gap-1 border border-ide-border-strong bg-ide-panel p-1 font-mono text-[10px]">
            <span className="px-2 text-ide-subtle">Target</span>
            {(['payment', 'auth'] as const).map((scenario) => (
              <button
                key={scenario}
                type="button"
                onClick={() => handleSwitchScenario(scenario)}
                className={`ide-focus-ring px-2.5 py-1 ${selectedScenario === scenario ? 'bg-ide-selected text-ide-text' : 'text-ide-muted hover:bg-ide-hover hover:text-ide-text'}`}
                aria-pressed={selectedScenario === scenario}
              >
                {scenario === 'payment' ? 'paymentService.ts' : 'authService.ts'}
              </button>
            ))}
          </div>
        </header>

        {!hasAnalysis ? (
          <div className="mt-6 border-l-2 border-ide-border-strong bg-ide-panel px-4 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ide-subtle">Impact unavailable</div>
            <p className="mt-2 text-sm text-ide-text">Open a workspace before reviewing affected components.</p>
            <p className="mt-1 text-xs text-ide-muted">The analysis result will appear here after a file is loaded or modified.</p>
            <button type="button" onClick={() => setActiveView('editor')} className="ide-focus-ring mt-4 inline-flex items-center gap-1 border border-ide-border-strong px-3 py-1.5 text-xs text-ide-text hover:bg-ide-hover">
              Return to editor <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid border border-ide-border bg-ide-panel md:grid-cols-[1.15fr_1fr_1fr_1fr]">
              <div className="border-b border-ide-border p-4 md:border-b-0 md:border-r">
                <div className="font-mono text-[10px] text-ide-subtle">Blast radius</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-semibold tabular-nums text-ide-strong">{ciaResult.blastRadiusScore}</span>
                  <span className="font-mono text-xs text-ide-subtle">/ 100</span>
                </div>
                <div className={`mt-2 flex items-center gap-2 font-mono text-[10px] ${tone.text}`}>
                  <span className={`h-1.5 w-1.5 ${tone.marker}`} aria-hidden="true" />
                  {tone.label} attention
                </div>
              </div>
              <div className="border-b border-ide-border p-4 md:border-b-0 md:border-r">
                <div className="font-mono text-[10px] text-ide-subtle">Direct dependents</div>
                <div className="mt-3 font-mono text-2xl tabular-nums text-ide-amber">{ciaResult.directAffected.length}</div>
                <div className="mt-1 text-[11px] text-ide-muted">Immediate callers</div>
              </div>
              <div className="border-b border-ide-border p-4 md:border-b-0 md:border-r">
                <div className="font-mono text-[10px] text-ide-subtle">Downstream ripple</div>
                <div className="mt-3 font-mono text-2xl tabular-nums text-ide-cyan">{ciaResult.indirectAffected.length}</div>
                <div className="mt-1 text-[11px] text-ide-muted">Transitive nodes</div>
              </div>
              <div className="flex flex-col justify-between p-4">
                <div>
                  <div className="font-mono text-[10px] text-ide-subtle">Recommended tests</div>
                  <div className="mt-3 font-mono text-2xl tabular-nums text-ide-emerald">{ciaResult.recommendedTests.length}</div>
                </div>
                <button type="button" onClick={() => runTests()} disabled={isExecutingTests} className="ide-focus-ring mt-3 inline-flex items-center justify-center gap-1.5 bg-ide-emerald px-3 py-1.5 text-[11px] font-semibold text-ide-shell hover:bg-ide-emerald/85 disabled:cursor-not-allowed disabled:opacity-50">
                  <Play className="h-3 w-3" aria-hidden="true" />
                  {isExecutingTests ? 'Running tests' : 'Run tests'}
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 border-y border-ide-border py-3 font-mono text-[10px] md:flex-row md:items-center">
              <div className="flex items-center gap-2 text-ide-subtle">
                <FileCode className="h-3.5 w-3.5 text-ide-amber" aria-hidden="true" />
                <span>Target</span>
              </div>
              <span className="text-ide-text">{ciaResult.targetName}</span>
              <span className="text-ide-subtle">{ciaResult.targetPath}</span>
              <span className="md:ml-auto">Scenario: <span className="text-ide-text">{selectedScenario === 'payment' ? 'paymentService.ts' : 'authService.ts'}</span></span>
              <button type="button" onClick={() => { openFile(selectedScenario === 'payment' ? 'payment-service' : 'auth-service'); setActiveView('editor'); }} className="ide-focus-ring inline-flex items-center gap-1 text-ide-focus hover:text-ide-text">
                View source <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_1fr]">
              <section aria-labelledby="direct-dependencies-heading">
                <div className="mb-3 flex items-center justify-between border-b border-ide-border pb-2">
                  <h2 id="direct-dependencies-heading" className="flex items-center gap-2 text-xs font-semibold text-ide-text"><span className="h-1.5 w-1.5 bg-ide-amber" aria-hidden="true" />Directly affected components</h2>
                  <span className="font-mono text-[10px] text-ide-subtle">Level 1</span>
                </div>
                <div>
                  {ciaResult.directAffected.map((item) => (
                    <button key={item.id} type="button" onClick={() => { openFile(item.id); setActiveView('editor'); }} className="ide-focus-ring group flex w-full items-start gap-3 border-b border-ide-border py-3 text-left hover:bg-ide-hover/50">
                      <FileCode className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ide-amber" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ide-text group-hover:text-ide-strong"><span>{item.name}</span><span className="font-mono text-[10px] font-normal text-ide-subtle">{item.type}</span></span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-ide-muted">{item.reason}</span>
                        <span className="mt-1 block truncate font-mono text-[10px] text-ide-subtle">{item.path}</span>
                      </span>
                      <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-ide-subtle group-hover:text-ide-amber" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </section>

              <section aria-labelledby="ripple-heading">
                <div className="mb-3 flex items-center justify-between border-b border-ide-border pb-2">
                  <h2 id="ripple-heading" className="flex items-center gap-2 text-xs font-semibold text-ide-text"><span className="h-1.5 w-1.5 bg-ide-cyan" aria-hidden="true" />Transitive ripple</h2>
                  <span className="font-mono text-[10px] text-ide-subtle">Levels 2–3</span>
                </div>
                <div>
                  {ciaResult.indirectAffected.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 border-b border-ide-border py-3">
                      <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ide-cyan" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ide-text"><span>{item.name}</span><span className="font-mono text-[10px] font-normal text-ide-cyan">Depth {item.depth}</span></div>
                        <p className="mt-1 text-[11px] leading-relaxed text-ide-muted">{item.reason}</p>
                        <span className="mt-1 block truncate font-mono text-[10px] text-ide-subtle">{item.path}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-ide-border pt-4" aria-labelledby="recommended-tests-heading">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 id="recommended-tests-heading" className="flex items-center gap-2 text-xs font-semibold text-ide-text"><FileCheck className="h-3.5 w-3.5 text-ide-emerald" aria-hidden="true" />Recommended tests</h2>
                    <span className="font-mono text-[10px] text-ide-subtle">Verification queue</span>
                  </div>
                  {ciaResult.recommendedTests.map((test) => (
                    <div key={test.id} className="flex items-start gap-3 border-b border-ide-border py-2.5">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-ide-emerald" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-ide-text"><span className="font-mono">{test.testSuite}</span><span className="font-mono text-[10px] uppercase text-ide-emerald">{test.priority}</span></div>
                        <p className="mt-1 text-[11px] text-ide-muted">{test.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
