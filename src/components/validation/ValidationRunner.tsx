import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Play, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import type { TestSuite } from '../../types/ide';
import { Badge, Button, EmptyState, NotificationBanner, Tabs } from '../ui';

type ValidationFilter = 'all' | 'affected' | 'unit' | 'e2e';

const affectedSuiteIds = ['test-payment-unit', 'test-checkout-e2e'];

export const ValidationRunner: React.FC = () => {
  const { testSuites, runTests, isExecutingTests, ciaResult, setActiveView } = useIDE();
  const [activeFilter, setActiveFilter] = useState<ValidationFilter>('affected');

  const filteredSuites = useMemo(
    () =>
      testSuites.filter((suite) => {
        if (activeFilter === 'affected') return affectedSuiteIds.includes(suite.id);
        if (activeFilter === 'unit') return suite.category === 'unit';
        if (activeFilter === 'e2e') return suite.category === 'e2e';
        return true;
      }),
    [activeFilter, testSuites]
  );

  const totalTests = testSuites.reduce((total, suite) => total + suite.testsCount, 0);
  const totalPassed = testSuites.reduce((total, suite) => total + suite.passedCount, 0);
  const totalFailed = testSuites.reduce((total, suite) => total + suite.failedCount, 0);
  const targetLabel = ciaResult.targetName || 'Workspace';

  const renderStatusBadge = (suite: TestSuite) => {
    if (suite.status === 'passed') {
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          Passed
        </Badge>
      );
    }
    if (suite.status === 'failed') {
      return (
        <Badge variant="error">
          <XCircle className="h-3 w-3" aria-hidden="true" />
          Failed
        </Badge>
      );
    }
    if (suite.status === 'running') {
      return (
        <Badge variant="warning">
          <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
          Running
        </Badge>
      );
    }
    return (
      <Badge variant="neutral">
        <Clock className="h-3 w-3" aria-hidden="true" />
        Not run
      </Badge>
    );
  };

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-ide-bg font-sans"
      data-purpose="validation-workspace"
    >
      <div className="mx-auto w-full max-w-[1180px] space-y-6 px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-ide-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-ide-emerald" aria-hidden="true" />
              <h1 className="text-[20px] font-semibold text-ide-strong">Validation</h1>
              <Badge variant="warning">Simulated suites</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-[13px] text-ide-muted">
              Targeted suite runner linked to Change Impact Analysis ({targetLabel}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => setActiveView('cia')}
            >
              Review impact
            </Button>
            <Button
              variant="primary"
              leftIcon={<Play className="h-4 w-4" />}
              loading={isExecutingTests}
              onClick={() => runTests(affectedSuiteIds)}
            >
              Run targeted ({affectedSuiteIds.length})
            </Button>
            <Button
              variant="secondary"
              disabled={isExecutingTests}
              onClick={() => runTests()}
            >
              Run all
            </Button>
          </div>
        </header>

        <NotificationBanner
          variant="info"
          title="Simulated demo test runner"
          message="These suite counters simulate targeted test execution in the UI. For live project test execution, run `npm test` in the Integrated Terminal."
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4">
            <div className="text-[12px] text-ide-muted">Total suites</div>
            <div className="mt-1 font-mono text-[22px] font-semibold text-ide-strong">{testSuites.length}</div>
          </div>
          <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4">
            <div className="text-[12px] text-ide-muted">Passed checks</div>
            <div className="mt-1 font-mono text-[22px] font-semibold text-ide-emerald">{totalPassed}</div>
          </div>
          <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4">
            <div className="text-[12px] text-ide-muted">Failed checks</div>
            <div className={`mt-1 font-mono text-[22px] font-semibold ${totalFailed ? 'text-ide-rose' : 'text-ide-strong'}`}>
              {totalFailed}
            </div>
          </div>
          <div className="rounded-ide-panel border border-ide-border bg-ide-panel p-4">
            <div className="text-[12px] text-ide-muted">Total cases</div>
            <div className="mt-1 font-mono text-[22px] font-semibold text-ide-strong">{totalTests}</div>
          </div>
        </div>

        <Tabs
          ariaLabel="Validation suite filters"
          activeId={activeFilter}
          onChange={(id) => setActiveFilter(id as ValidationFilter)}
          items={[
            { id: 'affected', label: 'Impact targeted' },
            { id: 'all', label: 'All suites', badge: testSuites.length },
            { id: 'unit', label: 'Unit' },
            { id: 'e2e', label: 'End-to-end' },
          ]}
        />

        {filteredSuites.length === 0 ? (
          <EmptyState
            title="No test suites match this filter"
            description="Switch to All suites to view every loaded test suite."
            action={<Button size="sm" variant="secondary" onClick={() => setActiveFilter('all')}>Show all suites</Button>}
          />
        ) : (
          <div className="divide-y divide-ide-border rounded-ide-panel border border-ide-border bg-ide-panel">
            {filteredSuites.map((suite) => {
              const isTargeted = affectedSuiteIds.includes(suite.id);
              return (
                <article
                  key={suite.id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[13px] font-semibold text-ide-strong">{suite.name}</h2>
                      {renderStatusBadge(suite)}
                      {isTargeted && <Badge variant="warning">Impact targeted</Badge>}
                    </div>
                    <div className="truncate font-mono text-[12px] text-ide-muted">{suite.file}</div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4 text-[12px]">
                    <div className="text-right">
                      <div className="text-ide-muted">Passed</div>
                      <div className="font-mono text-ide-emerald">
                        {suite.passedCount}/{suite.testsCount}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-ide-muted">Duration</div>
                      <div className="font-mono text-ide-text">{suite.duration || '—'}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<Play className="h-3.5 w-3.5" />}
                      disabled={isExecutingTests}
                      onClick={() => runTests([suite.id])}
                    >
                      Run
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
