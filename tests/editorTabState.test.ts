import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { closeTabState, openTabState, reconcileEditorTabs } from '../src/utils/editorTabState';

describe('Editor Tab, Breadcrumb & Content State Synchronization', () => {
  const sampleFiles = [
    { id: 'f1', path: 'src/a.ts', content: 'const a = 1;' },
    { id: 'f2', path: 'src/b.ts', content: 'const b = 2;' },
    { id: 'f3', path: 'src/c.ts', content: 'const c = 3;' },
  ];

  it('keeps activeFileId inside openFileIds when switching files repeatedly', () => {
    let state = openTabState(sampleFiles, [], 'f1');
    assert.deepEqual(state, { openFileIds: ['f1'], activeFileId: 'f1' });

    state = openTabState(sampleFiles, state.openFileIds, 'f2');
    assert.deepEqual(state, { openFileIds: ['f1', 'f2'], activeFileId: 'f2' });

    state = openTabState(sampleFiles, state.openFileIds, 'f1');
    assert.deepEqual(state, { openFileIds: ['f1', 'f2'], activeFileId: 'f1' });
  });

  it('selects adjacent remaining tab when closing active tab and clears when empty', () => {
    let state = closeTabState(sampleFiles, ['f1', 'f2', 'f3'], 'f3', 'f3');
    assert.deepEqual(state, { openFileIds: ['f1', 'f2'], activeFileId: 'f2' });

    state = closeTabState(sampleFiles, state.openFileIds, state.activeFileId, 'f1');
    assert.deepEqual(state, { openFileIds: ['f2'], activeFileId: 'f2' });

    state = closeTabState(sampleFiles, state.openFileIds, state.activeFileId, 'f2');
    assert.deepEqual(state, { openFileIds: [], activeFileId: '' });
  });

  it('reconciles stale IDs after deleting files, reloading from disk, or switching workspaces', () => {
    const afterDelete = sampleFiles.filter((f) => f.id !== 'f2');
    const reconciled = reconcileEditorTabs(afterDelete, ['f1', 'f2', 'f2'], 'f2');
    assert.deepEqual(reconciled, { openFileIds: ['f1'], activeFileId: 'f1' });

    // Workspace switch where previous openFileIds no longer exist
    const newWorkspaceFiles = [{ id: 'w1' }, { id: 'w2' }];
    const switched = reconcileEditorTabs(newWorkspaceFiles, ['f1', 'f3'], 'f3');
    assert.deepEqual(switched, { openFileIds: [], activeFileId: '' });

    // Ensures activeFileId missing from openFileIds is automatically added as a tab
    const repaired = reconcileEditorTabs(sampleFiles, ['f1'], 'f3');
    assert.deepEqual(reconciled.activeFileId, 'f1');
    assert.deepEqual(repaired, { openFileIds: ['f1', 'f3'], activeFileId: 'f3' });
  });
});
