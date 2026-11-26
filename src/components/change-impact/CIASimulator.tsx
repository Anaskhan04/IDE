import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FileCheck,
  FileCode,
  Layers,
  Play,
  ShieldAlert,
} from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { Badge, Button, EmptyState, NotificationBanner, Select } from '../ui';

const severityVariant: Record<string, 'error' | 'warning' | 'accent'> = {
  critical: 'error',
  high: 'error',
  moderate: 'warning',
  low: 'accent',
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
    activeFileId,
  } = useIDE();

  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    () => activeFileId || files.find((f) => f.isModified)?.id || files[0]?.id || ''
  );
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const hasModifiedTarget = files.some((file) => file.isModified);
  const hasAnalysis = (hasRunAnalysis || hasModifiedTarget || Boolean(ciaResult.targetPath)) && files.length > 0;
  const totalDependents = ciaResult.directAffected.length + ciaResult.indirectAffected.length;

  const handleAnalyzeTarget = (targetId: string) => {
    if (!targetId) return;
    setSelectedTargetId(targetId);
    setHasRunAnalysis(true);
    runChangeImpactAnalysis(targetId);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section
      id="cia-workspace"
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-ide-bg font-sans"
      data-purpose="change-impact-workspace"
    >
      <div className="mx-auto w-full max-w-[1180px] space-y-6 px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-ide-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-ide-amber" aria-hidden="true" />
              <h1 className="text-[20px] font-semibold text-ide-strong">Impact analysis</h1>
            </div>
            <p className="mt-1 max-w-2xl text-[13px] text-ide-muted">
              Trace direct and transitive workspace dependents from the AST Knowledge Graph before making or merging changes.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="w-72">
              <Select
                label="Target file"
                value={selectedTargetId}
                onChange={(e) => handleAnalyzeTarget(e.target.value)}
                disabled={files.length === 0}
                options={
                  files.length > 0
                    ? files.map((f) => ({
                        value: f.id,
                        label: `${f.path}${f.isModified ? ' (modified)' : ''}`,
                      }))
                    : [{ value: '', label: 'No workspace files' }]
                }
              />
            </div>
            <Button
              variant="primary"
              disabled={files.length === 0}
              onClick={() => handleAnalyzeTarget(selectedTargetId || activeFileId || files[0]?.id || '')}
            >
              Analyze
            </Button>
          </div>
        </header>

        {!hasAnalysis ? (
          <EmptyState
            icon={<ShieldAlert className="h-5 w-5" />}
            title={files.length === 0 ? 'No workspace files loaded' : 'No analysis run yet'}
            description={
              files.length === 0
                ? 'Open a local folder or create a file in the editor before running dependency impact analysis.'
                : 'Select a target file above and click Analyze to inspect its direct and indirect dependents.'
            }
            action={
              <Button variant="secondary" rightIcon={<ArrowRight className="h-4 w-4" />} onClick={() => setActiveView('editor')}>
                Open editor
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4">
                <div className="text-[12px] text-ide-muted">Heuristic impact estimate</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-[24px] font-semibold tabular-nums text-ide-strong">
                    {ciaResult.blastRadiusScore}
                  </span>
                  <span className="font-mono text-[12px] text-ide-subtle">/ 100</span>
                </div>
                <div className="mt-2">
                  <Badge variant={severityVariant[ciaResult.severity] || 'accent'}>
                    {ciaResult.severity}
                  </Badge>
                </div>
              </div>

              <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4">
                <div className="text-[12px] text-ide-muted">Directly affected</div>
                <div className="mt-2 font-mono text-[24px] font-semibold tabular-nums text-ide-amber">
                  {ciaResult.directAffected.length}
                </div>
                <div className="mt-1 text-[12px] text-ide-subtle">Immediate callers &amp; importers</div>
              </div>

              <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4">
                <div className="text-[12px] text-ide-muted">Indirectly affected</div>
                <div className="mt-2 font-mono text-[24px] font-semibold tabular-nums text-ide-cyan">
                  {ciaResult.indirectAffected.length}
                </div>
                <div className="mt-1 text-[12px] text-ide-subtle">Transitive graph dependents</div>
              </div>

              <div className="flex flex-col justify-between rounded-ide-panel border border-ide-border bg-ide-panel p-4">
                <div>
                  <div className="text-[12px] text-ide-muted">Related tests</div>
                  <div className="mt-2 font-mono text-[24px] font-semibold tabular-nums text-ide-emerald">
                    {ciaResult.recommendedTests.length}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Play className="h-3.5 w-3.5" />}
                  disabled={isExecutingTests}
                  onClick={() => runTests()}
                  className="mt-3"
                >
                  {isExecutingTests ? 'Running…' : 'Open validation'}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-ide-control border border-ide-border bg-ide-surface px-4 py-2.5 text-[12px]">
              <div className="flex min-w-0 items-center gap-2">
                <FileCode className="h-4 w-4 shrink-0 text-ide-amber" aria-hidden="true" />
                <span className="font-medium text-ide-strong">{ciaResult.targetName}</span>
                <span className="truncate font-mono text-ide-muted">{ciaResult.targetPath}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  openFile(ciaResult.targetId);
                  setActiveView('editor');
                }}
              >
                Open file
              </Button>
            </div>

            {totalDependents === 0 ? (
              <NotificationBanner
                variant="info"
                title="No graph dependents detected"
                message="Static AST traversal found no direct or transitive dependents for this target. Dynamic imports, runtime reflection, or unparsed files may still depend on it."
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <section aria-labelledby="direct-dependencies-heading" className="space-y-3">
                  <div className="flex items-center justify-between border-b border-ide-border pb-2">
                    <h2 id="direct-dependencies-heading" className="text-[14px] font-semibold text-ide-strong">
                      Directly affected ({ciaResult.directAffected.length})
                    </h2>
                    <Badge variant="warning">Depth 1</Badge>
                  </div>

                  {ciaResult.directAffected.length === 0 ? (
                    <p className="text-[12px] text-ide-muted">No direct dependents detected.</p>
                  ) : (
                    <div className="space-y-2">
                      {ciaResult.directAffected.map((item) => {
                        const isExpanded = expandedIds.has(item.id);
                        return (
                          <div
                            key={item.id}
                            className="rounded-ide-control border border-ide-border bg-ide-panel p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => toggleExpand(item.id)}
                                className="ide-focus-ring flex min-w-0 flex-1 items-center gap-2 text-left"
                                aria-expanded={isExpanded}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 shrink-0 text-ide-subtle" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 shrink-0 text-ide-subtle" />
                                )}
                                <span className="truncate font-sans text-[13px] font-medium text-ide-strong">
                                  {item.name}
                                </span>
                                <Badge variant="neutral">{item.type}</Badge>
                              </button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  openFile(item.id);
                                  setActiveView('editor');
                                }}
                              >
                                Open file
                              </Button>
                            </div>
                            <div className="truncate pl-6 font-mono text-[11px] text-ide-muted">{item.path}</div>
                            {isExpanded && (
                              <div className="ml-6 rounded-ide-small border border-ide-border bg-ide-bg px-3 py-2 text-[12px] text-ide-text">
                                {item.reason}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section aria-labelledby="ripple-heading" className="space-y-4">
                  <div className="flex items-center justify-between border-b border-ide-border pb-2">
                    <h2 id="ripple-heading" className="text-[14px] font-semibold text-ide-strong">
                      Indirectly affected ({ciaResult.indirectAffected.length})
                    </h2>
                    <Badge variant="neutral">Transitive</Badge>
                  </div>

                  {ciaResult.indirectAffected.length === 0 ? (
                    <p className="text-[12px] text-ide-muted">No transitive dependents detected.</p>
                  ) : (
                    <div className="space-y-2">
                      {ciaResult.indirectAffected.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-ide-control border border-ide-border bg-ide-panel p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 truncate text-[13px] font-medium text-ide-strong">
                              <Layers className="h-4 w-4 shrink-0 text-ide-cyan" aria-hidden="true" />
                              <span className="truncate">{item.name}</span>
                            </span>
                            <Badge variant="accent">Depth {item.depth}</Badge>
                          </div>
                          <p className="text-[12px] text-ide-muted">{item.reason}</p>
                          <div className="truncate font-mono text-[11px] text-ide-subtle">{item.path}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-ide-border pt-4" aria-labelledby="recommended-tests-heading">
                    <h2 id="recommended-tests-heading" className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-ide-strong">
                      <FileCheck className="h-4 w-4 text-ide-emerald" aria-hidden="true" />
                      Related test suites
                    </h2>
                    {ciaResult.recommendedTests.length === 0 ? (
                      <p className="text-[12px] text-ide-muted">No matching test files identified in the graph.</p>
                    ) : (
                      <div className="space-y-2">
                        {ciaResult.recommendedTests.map((t) => (
                          <div
                            key={t.id}
                            className="rounded-ide-control border border-ide-border bg-ide-panel p-3 space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[12px] font-medium text-ide-strong">{t.testSuite}</span>
                              <Badge variant="success">{t.priority}</Badge>
                            </div>
                            <p className="text-[12px] text-ide-muted">{t.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
