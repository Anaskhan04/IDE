import React, { useState } from 'react';
import { useIDE } from '../../context/IDEContext';
import { 
  ShieldAlert, 
  Flame, 
  CheckCircle2, 
  Play, 
  ArrowRight, 
  Layers, 
  FileCode, 
  FileCheck, 
  GitFork, 
  Activity, 
  Zap, 
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

export const CIASimulator: React.FC = () => {
  const { 
    ciaResult, 
    runChangeImpactAnalysis, 
    openFile, 
    setActiveView, 
    runTests, 
    isExecutingTests 
  } = useIDE();

  const [selectedScenario, setSelectedScenario] = useState<'payment' | 'auth'>('payment');

  const handleSwitchScenario = (scenario: 'payment' | 'auth') => {
    setSelectedScenario(scenario);
    if (scenario === 'payment') {
      runChangeImpactAnalysis('payment-service');
    } else {
      runChangeImpactAnalysis('auth-service');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
      case 'high': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'moderate': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className="flex-1 bg-ide-bg h-[calc(100vh-3.5rem-1.75rem)] overflow-y-auto p-6 select-none font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-ide-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Flame className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white">Change Impact Analysis (CIA) Studio</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Autonomous AST Tracer
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              IntelliCode continuously evaluates the Project Knowledge Graph to calculate the blast radius of any code change, preventing broken downstream dependencies and proactively targeting test suites.
            </p>
          </div>

          {/* Scenario Quick Switcher */}
          <div className="flex items-center gap-2 bg-ide-panel p-1.5 rounded-xl border border-ide-border">
            <span className="text-xs text-slate-400 font-mono px-2">Simulate Change:</span>
            <button
              onClick={() => handleSwitchScenario('payment')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                selectedScenario === 'payment'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              paymentService.ts
            </button>
            <button
              onClick={() => handleSwitchScenario('auth')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                selectedScenario === 'auth'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              authService.ts
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Blast Radius Gauge */}
          <div className="p-4 rounded-xl bg-ide-panel border border-ide-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Blast Radius Score</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded uppercase font-semibold border ${getSeverityColor(ciaResult.severity)}`}>
                {ciaResult.severity}
              </span>
            </div>
            <div className="my-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">{ciaResult.blastRadiusScore}</span>
              <span className="text-slate-500 font-mono text-sm">/ 100</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  ciaResult.blastRadiusScore > 70 ? 'bg-rose-500' : 'bg-amber-500'
                }`}
                style={{ width: `${ciaResult.blastRadiusScore}%` }}
              />
            </div>
          </div>

          {/* Direct Impact Count */}
          <div className="p-4 rounded-xl bg-ide-panel border border-ide-border flex flex-col justify-between">
            <span className="text-xs font-mono text-slate-400">Directly Affected Components</span>
            <div className="my-2">
              <span className="text-3xl font-bold font-mono text-amber-400">{ciaResult.directAffected.length}</span>
              <span className="text-xs text-slate-400 ml-2">Level 1 dependents</span>
            </div>
            <p className="text-[11px] text-slate-500">Cart, Checkout, and Order modules</p>
          </div>

          {/* Indirect Ripple Count */}
          <div className="p-4 rounded-xl bg-ide-panel border border-ide-border flex flex-col justify-between">
            <span className="text-xs font-mono text-slate-400">Indirect Downstream Ripple</span>
            <div className="my-2">
              <span className="text-3xl font-bold font-mono text-cyan-400">{ciaResult.indirectAffected.length}</span>
              <span className="text-xs text-slate-400 ml-2">Transitive nodes (depth 2-3)</span>
            </div>
            <p className="text-[11px] text-slate-500">E2E tests & Admin portal</p>
          </div>

          {/* Recommended Tests */}
          <div className="p-4 rounded-xl bg-ide-panel border border-ide-border flex flex-col justify-between">
            <span className="text-xs font-mono text-slate-400">Recommended Test Suites</span>
            <div className="my-2 flex items-center justify-between">
              <span className="text-3xl font-bold font-mono text-emerald-400">{ciaResult.recommendedTests.length}</span>
              <button
                onClick={() => {
                  setActiveView('validation');
                  runTests();
                }}
                disabled={isExecutingTests}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3 h-3" />
                <span>{isExecutingTests ? 'Running...' : 'Run Tests'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">38x faster than running full test suite</p>
          </div>
        </div>

        {/* Change Target Details */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-ide-card via-ide-panel to-ide-card border border-ide-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Target Analyzed:</span>
                <span className="text-xs font-mono px-2 py-0.2 rounded bg-slate-800 text-slate-300">
                  {ciaResult.targetPath}
                </span>
              </div>
              <h2 className="text-base font-bold text-white font-mono mt-0.5">{ciaResult.targetName}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                openFile(selectedScenario === 'payment' ? 'payment-service' : 'auth-service');
                setActiveView('editor');
              }}
              className="px-3 py-1.5 rounded-lg bg-ide-card hover:bg-ide-hover border border-ide-border text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <span>View Source</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            {/* Knowledge Graph disabled:
            <button
              onClick={() => setActiveView('graph')}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <GitFork className="w-3 h-3 text-cyan-400" />
              <span>Trace in Knowledge Graph</span>
            </button>
            */}
          </div>
        </div>

        {/* Direct vs Indirect Impact Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Level 1: Direct Blast Radius */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Level 1: Directly Affected Components ({ciaResult.directAffected.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Immediate Callers</span>
            </div>

            <div className="space-y-2.5">
              {ciaResult.directAffected.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-ide-panel border border-ide-border hover:border-amber-500/50 transition-all group cursor-pointer"
                  onClick={() => {
                    openFile(item.id);
                    setActiveView('editor');
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold font-mono text-slate-200 group-hover:text-amber-300 transition-colors">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {item.type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    {item.reason}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-ide-border/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="truncate max-w-[220px]">{item.path}</span>
                    <span className="text-amber-400 flex items-center gap-1 group-hover:underline">
                      Inspect Code <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Level 2 & 3: Indirect Downstream Ripple */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Level 2 & 3: Transitive Ripple Effect ({ciaResult.indirectAffected.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Graph Propagation</span>
            </div>

            <div className="space-y-2.5">
              {ciaResult.indirectAffected.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-ide-panel border border-ide-border hover:border-cyan-500/50 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold font-mono text-slate-200 group-hover:text-cyan-300">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      Depth: {item.depth}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    {item.reason}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-ide-border/60 text-[11px] font-mono text-slate-500 truncate">
                    {item.path}
                  </div>
                </div>
              ))}
            </div>

            {/* Proactive Test Recommendations Box */}
            <div className="mt-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <FileCheck className="w-4 h-4" />
                  <span>Proactive Test Recommendations (CIA Target)</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                  2 Targeted Suites
                </span>
              </div>

              <div className="space-y-2">
                {ciaResult.recommendedTests.map((t) => (
                  <div key={t.id} className="p-2.5 rounded-lg bg-ide-card/80 border border-ide-border flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono text-slate-200 font-semibold">{t.testSuite}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{t.reason}</div>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setActiveView('validation');
                  runTests();
                }}
                disabled={isExecutingTests}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isExecutingTests ? 'Executing Affected Test Suites...' : 'Execute Recommended Tests in Validation Engine'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
