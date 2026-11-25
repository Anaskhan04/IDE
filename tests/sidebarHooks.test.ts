import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PanelErrorBoundary } from '../src/components/common/PanelErrorBoundary';

describe('Sidebar & Layout Rules of Hooks + PanelErrorBoundary', () => {
  it('ensures Sidebar.tsx places all React hooks before its !isSidebarVisible early return', () => {
    const sidebarPath = path.resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
    const source = fs.readFileSync(sidebarPath, 'utf8');
    const lines = source.split('\n');

    const earlyReturnIdx = lines.findIndex(
      (line, i) => line.includes('if (!isSidebarVisible)') && lines[i + 1]?.includes('return null')
    );
    assert.ok(earlyReturnIdx >= 0, 'Expected !isSidebarVisible return null guard in Sidebar.tsx');

    const hookCallsAfterEarlyReturn = lines
      .slice(earlyReturnIdx)
      .filter((line) => /\buse(State|Effect|Memo|Callback|Ref|Context|Reducer)\s*\(/.test(line));

    assert.deepEqual(
      hookCallsAfterEarlyReturn,
      [],
      `Found React hook calls after !isSidebarVisible early return: ${hookCallsAfterEarlyReturn.join('; ')}`
    );
  });

  it('PanelErrorBoundary catches errors via getDerivedStateFromError and resets cleanly', () => {
    const boom = new Error('Simulated panel crash');
    const errorState = PanelErrorBoundary.getDerivedStateFromError(boom);
    assert.equal(errorState.hasError, true);
    assert.equal(errorState.error?.message, 'Simulated panel crash');

    const instance = new PanelErrorBoundary({
      panelName: 'Sidebar',
      children: null,
    });
    assert.equal(instance.state.hasError, false);
    assert.equal(instance.state.error, null);
  });
});
