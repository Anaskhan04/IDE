import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultGraphSession,
  isSameNavigationEntry,
  pushNavigationHistory,
  type NavigationEntry,
} from '../src/utils/workspaceNavigation';
import {
  closeAllTabsState,
  closeOtherTabsState,
  closeSavedTabsState,
  closeTabsToRightState,
  openTabState,
} from '../src/utils/editorTabState';

describe('Workspace Navigation History & Graph Session Defaults', () => {
  it('creates clean default GraphSessionState', () => {
    const session = createDefaultGraphSession();
    assert.equal(session.explorationMode, 'overview');
    assert.deepEqual(session.expandedGroupKeys, []);
    assert.deepEqual(session.expandedFileIds, []);
    assert.equal(session.selectedNodeId, null);
    assert.equal(session.selectedEdgeId, null);
    assert.equal(session.viewport, null);
    assert.equal(session.hideGenerated, true);
  });

  it('deduplicates consecutive identical navigation entries and truncates forward stack on new branch', () => {
    let state = { history: [{ view: 'editor' } as NavigationEntry], index: 0 };

    // Duplicate entry does not grow history
    state = pushNavigationHistory(state.history, state.index, { view: 'editor' });
    assert.equal(state.history.length, 1);
    assert.equal(state.index, 0);

    // Navigate to file f1, then graph, then file f2
    state = pushNavigationHistory(state.history, state.index, { view: 'editor', fileId: 'f1' });
    state = pushNavigationHistory(state.history, state.index, { view: 'graph', graphNodeId: 'n1' });
    state = pushNavigationHistory(state.history, state.index, { view: 'editor', fileId: 'f2' });
    assert.equal(state.history.length, 4);
    assert.equal(state.index, 3);

    // Go back twice (to f1), then push f3 -> drops graph & f2 forward entries
    state = pushNavigationHistory(state.history, 1, { view: 'editor', fileId: 'f3' });
    assert.equal(state.history.length, 3);
    assert.equal(state.index, 2);
    assert.equal(state.history[2].fileId, 'f3');
    assert.equal(isSameNavigationEntry(state.history[1], { view: 'editor', fileId: 'f1' }), true);
  });

  it('caps navigation history at maxEntries', () => {
    let history: NavigationEntry[] = [{ view: 'editor', fileId: 'f0' }];
    let index = 0;
    for (let i = 1; i <= 50; i += 1) {
      const next = pushNavigationHistory(history, index, { view: 'editor', fileId: `f${i}` }, 40);
      history = next.history;
      index = next.index;
    }
    assert.equal(history.length, 40);
    assert.equal(index, 39);
    assert.equal(history[0].fileId, 'f11');
    assert.equal(history[39].fileId, 'f50');
  });
});

describe('Editor Tab Pinning & Bulk Close Helpers', () => {
  const files = [
    { id: 'f1', isDirty: false },
    { id: 'f2', isDirty: true },
    { id: 'f3', isDirty: false },
    { id: 'f4', isDirty: false },
  ];

  it('keeps pinned tabs ordered first and preserves them during bulk close', () => {
    const opened = openTabState(files, ['f1', 'f2', 'f3', 'f4'], 'f4', ['f3']);
    assert.deepEqual(opened.openFileIds, ['f3', 'f1', 'f2', 'f4']);

    const afterCloseOthers = closeOtherTabsState(files, opened.openFileIds, 'f2', ['f3']);
    assert.deepEqual(afterCloseOthers.openFileIds, ['f3', 'f2']);
    assert.equal(afterCloseOthers.activeFileId, 'f2');

    const afterCloseRight = closeTabsToRightState(files, ['f3', 'f1', 'f2', 'f4'], 'f4', 'f1', ['f3']);
    assert.deepEqual(afterCloseRight.openFileIds, ['f3', 'f1']);
    assert.equal(afterCloseRight.activeFileId, 'f1');

    const afterCloseSaved = closeSavedTabsState(files, ['f3', 'f1', 'f2', 'f4'], 'f1', ['f3']);
    assert.deepEqual(afterCloseSaved.openFileIds, ['f3', 'f2']);
    assert.equal(afterCloseSaved.activeFileId, 'f2');

    const afterCloseAll = closeAllTabsState(files, ['f3', 'f1', 'f2'], ['f3'], false);
    assert.deepEqual(afterCloseAll.openFileIds, ['f3']);
    assert.equal(afterCloseAll.activeFileId, 'f3');
  });
});
