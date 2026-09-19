import React, { useState } from 'react';
import { useIDE } from '../../context/IDEContext';
import { 
  FlaskConical, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  Layers, 
  Clock, 
  Award,
  BarChart3,
  ArrowRight
} from 'lucide-react';

export const BenchmarkDashboard: React.FC = () => {
  const { experiments, runExperiment } = useIDE();
  const [selectedExpId, setSelectedExpId] = useState<string>(experiments[0].id);

  const selectedExp = experiments.find(e => e.id === selectedExpId) || experiments[0];

  return (
    <div className="flex-1 bg-ide-bg h-[calc(100vh-3.5rem-1.75rem)] overflow-y-auto p-6 select-none font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-ide-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <FlaskConical className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white">Evaluation Plan & Empirical Benchmarks</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Section 5 Specification
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Quantitative comparison of IntelliCode Persistent Intelligence against conventional AI coding approaches across 4 rigorous experimental setups.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => runExperiment(selectedExp.id)}
              disabled={selectedExp.status === 'running'}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              {selectedExp.status === 'running' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>{selectedExp.status === 'running' ? 'Simulating Experiment...' : 'Run Benchmark Test'}</span>
            </button>
          </div>
        </div>

        {/* Experiment Navigation Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {experiments.map((exp, idx) => {
            const isSelected = exp.id === selectedExpId;
            return (
              <button
                key={exp.id}
                onClick={() => setSelectedExpId(exp.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-ide-panel border-purple-500 shadow-md shadow-purple-500/10 ring-1 ring-purple-500/30'
                    : 'bg-ide-panel/60 border-ide-border hover:bg-ide-panel hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-purple-400 font-bold">Experiment 0{idx + 1}</span>
                  <span className={`w-2 h-2 rounded-full ${
                    exp.status === 'running' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                  }`} />
                </div>
                <h3 className="text-xs font-semibold text-slate-200 line-clamp-1">{exp.title.split(':')[1] || exp.title}</h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{exp.hypothesis}</p>
              </button>
            );
          })}
        </div>

        {/* Active Experiment Detail Card */}
        <div className="p-6 rounded-2xl bg-ide-panel border border-ide-border space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-ide-border">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-purple-400 mb-1">
                <span>SCIENTIFIC EVALUATION</span>
                <span>•</span>
                <span>STATUS: {selectedExp.status.toUpperCase()}</span>
              </div>
              <h2 className="text-lg font-bold text-white font-mono">{selectedExp.title}</h2>
              <div className="mt-2 text-xs text-slate-300 bg-ide-card p-3 rounded-xl border border-ide-border/80 leading-relaxed font-sans">
                <strong className="text-cyan-300 font-mono">Hypothesis: </strong>
                {selectedExp.hypothesis}
              </div>
            </div>

            <div className="shrink-0 font-mono text-xs bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl text-purple-300 text-right">
              <span className="text-slate-400 block text-[10px]">EVALUATION PROTOCOL</span>
              <span className="font-bold">Controlled A/B Benchmark</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            {selectedExp.description}
          </p>

          {/* Comparative Metrics Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">
              Empirical Results & Differential Analysis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedExp.metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-ide-card border border-ide-border flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-semibold">{metric.label}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      {metric.improvement}
                    </span>
                  </div>

                  {/* Visual Comparison Bar */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ide-border/60 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-ide-bg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">Conventional</span>
                      <span className="text-rose-400 font-bold text-sm block mt-1">{metric.conventional}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-400 block uppercase">IntelliCode</span>
                      <span className="text-emerald-300 font-bold text-sm block mt-1">{metric.intelliCode}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Conclusions from PDF */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/20 via-purple-950/20 to-ide-card border border-purple-500/30 flex items-start gap-3">
            <Award className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold text-slate-200 block font-mono mb-1">
                Conclusion & Practical Advantage (Section 6)
              </span>
              <p className="text-slate-400">
                Persistent Project Context eliminates redundant file reads across models, Change Impact Analysis prevents downstream regressions before deployment, and Centralized MCP dramatically reduces tooling integration friction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
