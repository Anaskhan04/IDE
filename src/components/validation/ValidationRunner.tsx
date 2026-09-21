import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  Filter,
  Play,
  RefreshCw,
  ShieldCheck,
  Terminal,
  XCircle,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import type { TestSuite } from '../../types/ide';

type ValidationFilter = 'all' | 'affected' | 'unit' | 'e2e';

const affectedSuiteIds = ['test-payment-unit', 'test-checkout-e2e'];

const statusMeta: Record<TestSuite['status'], { label: string; className: string; marker: string; icon: React.ComponentType<{ className?: string }> }> = {
  idle: { label: 'Not run', className: 'text-ide-muted', marker: 'bg-ide-subtle', icon: Clock },
  running: { label: 'Running', className: 'text-ide-amber', marker: 'bg-ide-amber', icon: RefreshCw },
  passed: { label: 'Passed', className: 'text-ide-emerald', marker: 'bg-ide-emerald', icon: CheckCircle2 },
  failed: { label: 'Failed', className: 'text-ide-rose', marker: 'bg-ide-rose', icon: XCircle },
};

const formatNumber = (value: number) => value.toLocaleString();

export const ValidationRunner: React.FC = () => {
  const { testSuites, runTests, isExecutingTests, ciaResult, setActiveView } = useIDE();
  const [activeFilter, setActiveFilter] = useState<ValidationFilter>('affected');

  const filteredSuites = useMemo(() => testSuites.filter((suite) => {
    if (activeFilter === 'affected') return affectedSuiteIds.includes(suite.id);
    if (activeFilter === 'unit') return suite.category === 'unit';
    if (activeFilter === 'e2e') return suite.category === 'e2e';
    return true;
  }), [activeFilter, testSuites]);

  const totalTests = testSuites.reduce((total, suite) => total + suite.testsCount, 0);
  const totalPassed = testSuites.reduce((total, suite) => total + suite.passedCount, 0);
  const totalFailed = testSuites.reduce((total, suite) => total + suite.failedCount, 0);
  const passedSuites = testSuites.filter((suite) => suite.status === 'passed').length;
  const runningSuiteCount = testSuites.filter((suite) => suite.status === 'running').length;
  const targetLabel = ciaResult.targetName || 'Unknown target';

  const renderStatus = (suite: TestSuite) => {
    const meta = statusMeta[suite.status];
    const Icon = meta.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] ${meta.className}`}>
        <Icon className={`h-3.5 w-3.5 ${suite.status === 'running' ? '' : ''}`} aria-hidden="true" />
        {meta.label}
      </span>
    );
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-y-auto bg-ide-bg" data-purpose="validation-workspace">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-ide-border pb-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-ide-emerald" aria-hidden="true" />
              <h1 className="text-base font-semibold text-ide-strong">Validation</h1>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ide-muted">Run the test suites selected by Change Impact Analysis and inspect their evidence.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] text-ide-subtle">
              <span>Target: <span className="text-ide-text">{targetLabel}</span></span>
              {ciaResult.targetId && <span>Impact score: <span className="text-ide-amber">{ciaResult.blastRadiusScore}/100</span></span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setActiveView('cia')} className="ide-focus-ring inline-flex min-h-[34px] items-center gap-1.5 border border-ide-border-strong px-3 text-xs text-ide-text hover:bg-ide-hover"><span>Review impact</span><ArrowRight className="h-3 w-3" /></button>
            <button type="button" onClick={() => runTests(affectedSuiteIds)} disabled={isExecutingTests} className="ide-focus-ring inline-flex min-h-[34px] items-center gap-2 bg-ide-emerald px-3 text-xs font-semibold text-ide-shell hover:bg-ide-emerald/85 disabled:cursor-not-allowed disabled:opacity-50"><Play className="h-3.5 w-3.5" aria-hidden="true" />{isExecutingTests ? 'Running affected tests' : `Run affected tests (${affectedSuiteIds.length})`}</button>
            <button type="button" onClick={() => runTests()} disabled={isExecutingTests} className="ide-focus-ring inline-flex min-h-[34px] items-center border border-ide-border-strong px-3 font-mono text-[10px] text-ide-text hover:bg-ide-hover disabled:cursor-not-allowed disabled:opacity-50">Run all suites</button>
          </div>
        </header>

        <div className="mt-5 grid border border-ide-border bg-ide-panel sm:grid-cols-2 2xl:grid-cols-5" aria-label="Validation summary">
          <div className="border-b border-ide-border p-4 sm:border-r 2xl:border-b-0"><div className="font-mono text-[10px] text-ide-subtle">Affected suites</div><div className="mt-3 font-mono text-2xl tabular-nums text-ide-amber">{affectedSuiteIds.filter((id) => testSuites.some((suite) => suite.id === id)).length}</div><div className="mt-1 text-[11px] text-ide-muted">CIA targeted</div></div>
          <div className="border-b border-ide-border p-4 2xl:border-b-0 2xl:border-r"><div className="font-mono text-[10px] text-ide-subtle">Total suites</div><div className="mt-3 font-mono text-2xl tabular-nums text-ide-text">{testSuites.length}</div><div className="mt-1 text-[11px] text-ide-muted">Loaded in workspace</div></div>
          <div className="border-b border-ide-border p-4 sm:border-r 2xl:border-b-0"><div className="font-mono text-[10px] text-ide-subtle">Passed tests</div><div className="mt-3 font-mono text-2xl tabular-nums text-ide-emerald">{formatNumber(totalPassed)}</div><div className="mt-1 text-[11px] text-ide-muted">of {formatNumber(totalTests)}</div></div>
          <div className="border-b border-ide-border p-4 2xl:border-b-0 2xl:border-r"><div className="font-mono text-[10px] text-ide-subtle">Failed tests</div><div className={`mt-3 font-mono text-2xl tabular-nums ${totalFailed ? 'text-ide-rose' : 'text-ide-text'}`}>{formatNumber(totalFailed)}</div><div className="mt-1 text-[11px] text-ide-muted">Recorded failures</div></div>
          <div className="p-4 sm:col-span-2 2xl:col-span-1"><div className="font-mono text-[10px] text-ide-subtle">Execution</div><div className="mt-3 font-mono text-2xl tabular-nums text-ide-text">{isExecutingTests ? runningSuiteCount : passedSuites}</div><div className="mt-1 text-[11px] text-ide-muted">{isExecutingTests ? 'suites running' : 'suites passed'}</div></div>
        </div>

        <div className="mt-5 border border-ide-border bg-ide-panel">
          <div className="flex flex-col gap-2 border-b border-ide-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-mono text-[10px] text-ide-muted"><Filter className="h-3.5 w-3.5 text-ide-subtle" aria-hidden="true" /><span>Filter suites</span></div>
            <span className="font-mono text-[10px] text-ide-subtle">Showing {filteredSuites.length} test suites</span>
          </div>
          <div className="flex min-h-[38px] items-stretch gap-1 overflow-x-auto px-3" role="tablist" aria-label="Validation filters">
            {(['affected', 'all', 'unit', 'e2e'] as ValidationFilter[]).map((filter) => {
              const isSelected = activeFilter === filter;
              return <button key={filter} type="button" role="tab" aria-selected={isSelected} onClick={() => setActiveFilter(filter)} className={`ide-focus-ring shrink-0 border-b-2 px-2.5 font-mono text-[10px] capitalize ${isSelected ? 'border-ide-emerald text-ide-emerald' : 'border-transparent text-ide-muted hover:text-ide-text'}`}>{filter === 'affected' ? 'CIA targeted only' : filter}</button>;
            })}
          </div>
        </div>

        <div className="mt-5" aria-live="polite">
          {filteredSuites.length === 0 ? (
            <div className="border-l-2 border-ide-border-strong px-4 py-5 font-mono text-[10px] text-ide-subtle">No test suites match this filter. <button type="button" onClick={() => setActiveFilter('all')} className="ide-focus-ring text-ide-focus hover:text-ide-text">Show all suites</button></div>
          ) : (
            <div className="divide-y divide-ide-border border-y border-ide-border">
              {filteredSuites.map((suite) => {
                const isTargeted = affectedSuiteIds.includes(suite.id);
                const StatusIcon = statusMeta[suite.status].icon;
                return (
                  <article key={suite.id} className="bg-ide-panel px-3 py-4 hover:bg-ide-hover/40" aria-labelledby={`suite-${suite.id}`}>
                    <div className="grid gap-4 xl:grid-cols-[minmax(260px,1.4fr)_100px_90px_110px_110px_auto] xl:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><StatusIcon className={`h-4 w-4 ${statusMeta[suite.status].className}`} aria-hidden="true" /><h2 id={`suite-${suite.id}`} className="truncate font-mono text-xs font-semibold text-ide-text">{suite.name}</h2>{isTargeted && <span className="font-mono text-[10px] text-ide-amber">CIA targeted</span>}</div>
                        <div className="mt-1 truncate font-mono text-[10px] text-ide-subtle">{suite.file}</div>
                      </div>
                      <div><span className="block font-mono text-[9px] uppercase tracking-[0.08em] text-ide-subtle">Category</span><span className="mt-1 block font-mono text-[10px] text-ide-text">{suite.category}</span></div>
                      <div><span className="block font-mono text-[9px] uppercase tracking-[0.08em] text-ide-subtle">Status</span><span className="mt-1 block">{renderStatus(suite)}</span></div>
                      <div><span className="block font-mono text-[9px] uppercase tracking-[0.08em] text-ide-subtle">Duration</span><span className="mt-1 block font-mono text-[10px] text-ide-text">{suite.duration || 'Unknown'}</span></div>
                      <div><span className="block font-mono text-[9px] uppercase tracking-[0.08em] text-ide-subtle">Tests passed</span><span className="mt-1 block font-mono text-[10px] text-ide-emerald">{suite.passedCount} / {suite.testsCount}</span></div>
                      <div className="flex items-end justify-between gap-4 xl:justify-end"><div><span className="block font-mono text-[9px] uppercase tracking-[0.08em] text-ide-subtle">Impact coverage</span><span className="mt-1 block font-mono text-[10px] text-ide-cyan">{suite.coverage != null ? `${suite.coverage}%` : 'Unknown'}</span></div><button type="button" onClick={() => runTests([suite.id])} disabled={isExecutingTests} className="ide-focus-ring flex h-8 w-8 shrink-0 items-center justify-center border border-ide-border-strong text-ide-muted hover:bg-ide-hover hover:text-ide-text disabled:cursor-not-allowed disabled:opacity-50" title={`Rerun ${suite.name}`} aria-label={`Rerun ${suite.name}`}><Play className="h-3.5 w-3.5" /></button></div>
                    </div>
                    <div className="mt-4 border-t border-ide-border pt-3" role="log" aria-label={`${suite.name} output`}>
                      <div className="flex items-center gap-2 font-mono text-[10px] text-ide-subtle"><Terminal className="h-3 w-3" aria-hidden="true" />Suite evidence</div>
                      <div className="mt-2 space-y-1 font-mono text-[10px] text-ide-muted"><div className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 shrink-0 text-ide-emerald" aria-hidden="true" /><span>processPayment() accepts valid PaymentPayload schema ({suite.duration || 'duration unavailable'})</span></div><div className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 shrink-0 text-ide-emerald" aria-hidden="true" /><span>propagates authCode and transactionId to CheckoutPage.tsx</span></div></div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
