import React, { useState } from 'react';
import { useIDE } from '../../context/IDEContext';
import { TestSuite } from '../../types/ide';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  RefreshCw, 
  Clock, 
  ShieldCheck, 
  Terminal, 
  FileCheck, 
  Zap, 
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';

export const ValidationRunner: React.FC = () => {
  const { testSuites, runTests, isExecutingTests, ciaResult, setActiveView } = useIDE();
  const [activeFilter, setActiveFilter] = useState<'all' | 'affected' | 'unit' | 'e2e'>('affected');

  const affectedSuiteIds = ['test-payment-unit', 'test-checkout-e2e'];

  const filteredSuites = testSuites.filter(suite => {
    if (activeFilter === 'affected') return affectedSuiteIds.includes(suite.id);
    if (activeFilter === 'unit') return suite.category === 'unit';
    if (activeFilter === 'e2e') return suite.category === 'e2e';
    return true;
  });

  const totalTests = testSuites.reduce((acc, s) => acc + s.testsCount, 0);
  const totalPassed = testSuites.reduce((acc, s) => acc + s.passedCount, 0);

  return (
    <div className="flex-1 bg-ide-bg h-[calc(100vh-3.5rem-1.75rem)] overflow-y-auto p-6 select-none font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-ide-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white">Validation Engine & Automated Test Runner</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                CIA-Targeted
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Targeted validation verifies changes specifically against downstream components identified by Change Impact Analysis, cutting test cycles from minutes to seconds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => runTests(affectedSuiteIds)}
              disabled={isExecutingTests}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isExecutingTests ? 'Validating...' : 'Run Affected Tests (2)'}</span>
            </button>
            <button
              onClick={() => runTests()}
              disabled={isExecutingTests}
              className="px-3 py-2 rounded-lg bg-ide-panel hover:bg-ide-hover border border-ide-border text-slate-300 text-xs font-mono transition-colors"
            >
              Run All Suites
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-ide-panel border border-ide-border">
            <span className="text-xs font-mono text-slate-400">Impact Confidence Score</span>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-emerald-400">98.4%</span>
              <span className="text-xs text-slate-500 font-mono">High Safety</span>
            </div>
            <p className="text-[11px] text-slate-400">AST coverage of affected paths</p>
          </div>

          <div className="p-4 rounded-xl bg-ide-panel border border-ide-border">
            <span className="text-xs font-mono text-slate-400">Proactive Cycle Time</span>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">2.54s</span>
              <span className="text-xs text-emerald-400 font-mono">vs 14m full suite</span>
            </div>
            <p className="text-[11px] text-slate-400">38x speedup via graph tracing</p>
          </div>

          <div className="p-4 rounded-xl bg-ide-panel border border-ide-border">
            <span className="text-xs font-mono text-slate-400">Regression Prevention</span>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-cyan-400">100%</span>
              <span className="text-xs text-slate-400 font-mono">0 regressions</span>
            </div>
            <p className="text-[11px] text-slate-400">Checkout & Payment interfaces intact</p>
          </div>

          <div className="p-4 rounded-xl bg-ide-panel border border-ide-border">
            <span className="text-xs font-mono text-slate-400">Total Passed Tests</span>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">{totalPassed} / {totalTests}</span>
              <span className="text-xs text-emerald-400 font-mono">All Green</span>
            </div>
            <p className="text-[11px] text-slate-400">Across 5 test suites</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between bg-ide-panel p-2 rounded-xl border border-ide-border">
          <div className="flex items-center space-x-2 text-xs font-mono">
            {(['affected', 'all', 'unit', 'e2e'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  activeFilter === filter
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter === 'affected' ? '⚡ CIA Targeted Only' : filter}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-slate-400 px-2">
            Showing {filteredSuites.length} Test Suites
          </span>
        </div>

        {/* Test Suites List */}
        <div className="space-y-3">
          {filteredSuites.map((suite) => {
            const isTargeted = affectedSuiteIds.includes(suite.id);
            const isRunning = isExecutingTests && isTargeted;

            return (
              <div
                key={suite.id}
                className={`p-4 rounded-xl border transition-all ${
                  isRunning
                    ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md'
                    : 'bg-ide-panel border-ide-border hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isRunning ? 'bg-amber-500/20 text-amber-400 animate-spin' :
                      suite.status === 'passed' || !isExecutingTests ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {isRunning ? <RefreshCw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold font-mono text-white">{suite.name}</h3>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {suite.category}
                        </span>
                        {isTargeted && (
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Recommended by CIA
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{suite.file}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 font-mono text-xs">
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">EXECUTION TIME</span>
                      <span className="text-slate-200">{suite.duration}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">TESTS PASSED</span>
                      <span className="text-emerald-400 font-bold">{suite.passedCount} / {suite.testsCount}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">IMPACT COVERAGE</span>
                      <span className="text-cyan-400 font-bold">{suite.coverage}%</span>
                    </div>

                    <button
                      onClick={() => runTests([suite.id])}
                      disabled={isExecutingTests}
                      className="p-2 rounded-lg bg-ide-card hover:bg-ide-hover border border-ide-border text-slate-300 hover:text-white transition-colors"
                      title="Rerun Suite"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Live execution mock logs */}
                <div className="mt-3 pt-3 border-t border-ide-border/60 bg-code p-3 rounded-lg font-mono text-[11px] text-slate-400 space-y-1">
                  <div className="text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>✓ processPayment() accepts valid PaymentPayload schema ({suite.duration})</span>
                  </div>
                  <div className="text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>✓ propagates authCode and transactionId to CheckoutPage.tsx</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
