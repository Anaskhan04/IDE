import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FlaskConical, Play, RefreshCw } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { Badge, Button, NotificationBanner } from '../ui';

export const BenchmarkDashboard: React.FC = () => {
  const { experiments, runExperiment } = useIDE();
  const [selectedExpId, setSelectedExpId] = useState<string>(experiments[0]?.id || '');
  const [showMethodology, setShowMethodology] = useState(false);

  const selectedExp = experiments.find((e) => e.id === selectedExpId) || experiments[0];

  if (!selectedExp) {
    return (
      <section className="flex h-full items-center justify-center bg-ide-bg p-6 font-sans text-[13px] text-ide-muted">
        No benchmark specifications loaded.
      </section>
    );
  }

  return (
    <section className="h-full overflow-y-auto bg-ide-bg p-6 font-sans" data-purpose="benchmark-workspace">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-ide-border pb-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-ide-purple" aria-hidden="true" />
              <h1 className="text-[20px] font-semibold text-ide-strong">Evaluation benchmarks</h1>
              <Badge variant="warning">Illustrative</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-[12px] text-ide-muted">
              Reference comparison scenarios for project-aware context vs. unindexed prompting. Values shown are illustrative simulation fixtures, not live telemetry.
            </p>
          </div>

          <Button
            variant="primary"
            leftIcon={
              selectedExp.status === 'running' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )
            }
            disabled={selectedExp.status === 'running'}
            onClick={() => runExperiment(selectedExp.id)}
          >
            {selectedExp.status === 'running' ? 'Simulating…' : 'Run simulation'}
          </Button>
        </header>

        <NotificationBanner
          variant="info"
          title="Experimental simulation view"
          message="These scenarios illustrate evaluation criteria using local fixture data. For real workspace checks, run unit tests in the Integrated Terminal."
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {experiments.map((exp, idx) => {
            const isSelected = exp.id === selectedExp.id;
            return (
              <button
                key={exp.id}
                type="button"
                onClick={() => setSelectedExpId(exp.id)}
                className={`ide-focus-ring rounded-ide-panel border p-3.5 text-left transition-colors duration-150 ${
                  isSelected
                    ? 'border-ide-focus bg-ide-selected'
                    : 'border-ide-border bg-ide-panel hover:bg-ide-hover'
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="font-medium text-ide-purple">Scenario 0{idx + 1}</span>
                  <Badge variant={exp.status === 'running' ? 'warning' : 'success'}>
                    {exp.status}
                  </Badge>
                </div>
                <div className="truncate text-[13px] font-semibold text-ide-strong">
                  {exp.title.split(':')[1]?.trim() || exp.title}
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] text-ide-muted">{exp.hypothesis}</p>
              </button>
            );
          })}
        </div>

        <div className="space-y-5 rounded-ide-panel border border-ide-border bg-ide-panel p-5">
          <div className="flex flex-col justify-between gap-3 border-b border-ide-border pb-4 md:flex-row md:items-start">
            <div>
              <h2 className="text-[16px] font-semibold text-ide-strong">{selectedExp.title}</h2>
              <p className="mt-1.5 text-[13px] text-ide-muted leading-relaxed">
                {selectedExp.description}
              </p>
            </div>
            <Badge variant="neutral" className="shrink-0">
              {selectedExp.status}
            </Badge>
          </div>

          <div className="rounded-ide-control border border-ide-border bg-ide-bg p-3.5 text-[13px] text-ide-text">
            <span className="font-semibold text-ide-strong">Hypothesis: </span>
            {selectedExp.hypothesis}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {selectedExp.metrics.map((metric, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between space-y-3 rounded-ide-control border border-ide-border bg-ide-bg p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-ide-strong">{metric.label}</span>
                  <Badge variant="success">{metric.improvement}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-ide-border pt-3 text-[12px]">
                  <div className="rounded-ide-small border border-ide-border bg-ide-surface p-2.5">
                    <div className="text-ide-muted">Baseline</div>
                    <div className="mt-1 font-mono text-[14px] font-semibold text-ide-rose">
                      {metric.conventional}
                    </div>
                  </div>
                  <div className="rounded-ide-small border border-ide-border bg-ide-surface p-2.5">
                    <div className="text-ide-muted">IntelliCode (illustrative)</div>
                    <div className="mt-1 font-mono text-[14px] font-semibold text-ide-emerald">
                      {metric.intelliCode}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-ide-control border border-ide-border bg-ide-surface">
            <button
              type="button"
              onClick={() => setShowMethodology((v) => !v)}
              className="ide-focus-ring flex w-full items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-ide-text hover:bg-ide-hover"
            >
              {showMethodology ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span>Methodology &amp; scope notes</span>
            </button>
            {showMethodology && (
              <div className="border-t border-ide-border px-4 py-3 text-[12px] text-ide-muted leading-relaxed">
                Simulations compare full-file prompting against AST-filtered context selection, dependency impact traversal, and tool-schema consolidation. Real project accuracy depends on workspace language coverage and provider model capabilities.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
