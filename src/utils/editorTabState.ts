import type { ProjectFile } from '../types/ide';

export interface ReconciledTabState {
  openFileIds: string[];
  activeFileId: string;
}

/**
 * Keep openFileIds and activeFileId strictly synchronized with the current files list
 * so the active tab, breadcrumb, and editor buffer always reference the same file.
 */
export function reconcileEditorTabs(
  files: Pick<ProjectFile, 'id'>[],
  openFileIds: string[],
  activeFileId: string,
  pinnedFileIds: string[] = [],
): ReconciledTabState {
  const validIds = new Set(files.map((f) => f.id));
  const seen = new Set<string>();
  const pinnedSet = new Set(pinnedFileIds);
  const pinned: string[] = [];
  const unpinned: string[] = [];

  for (const id of openFileIds) {
    if (validIds.has(id) && !seen.has(id)) {
      seen.add(id);
      if (pinnedSet.has(id)) pinned.push(id);
      else unpinned.push(id);
    }
  }

  const nextOpen = [...pinned, ...unpinned];
  let nextActive = validIds.has(activeFileId) ? activeFileId : '';
  if (nextActive && !seen.has(nextActive)) {
    nextOpen.push(nextActive);
  }
  if (!nextActive && nextOpen.length > 0) {
    nextActive = nextOpen[nextOpen.length - 1];
  }

  return {
    openFileIds: nextOpen,
    activeFileId: nextActive,
  };
}

export function openTabState(
  files: Pick<ProjectFile, 'id'>[],
  openFileIds: string[],
  fileId: string,
  pinnedFileIds: string[] = [],
): ReconciledTabState {
  const validIds = new Set(files.map((f) => f.id));
  if (!validIds.has(fileId)) {
    return reconcileEditorTabs(files, openFileIds, '', pinnedFileIds);
  }
  const nextOpen = openFileIds.includes(fileId) ? openFileIds : [...openFileIds, fileId];
  return reconcileEditorTabs(files, nextOpen, fileId, pinnedFileIds);
}

export function closeTabState(
  files: Pick<ProjectFile, 'id'>[],
  openFileIds: string[],
  activeFileId: string,
  fileIdToClose: string,
  pinnedFileIds: string[] = [],
): ReconciledTabState {
  const remaining = openFileIds.filter((id) => id !== fileIdToClose);
  const candidateActive =
    activeFileId === fileIdToClose
      ? remaining.length > 0
        ? remaining[remaining.length - 1]
        : ''
      : activeFileId;
  return reconcileEditorTabs(files, remaining, candidateActive, pinnedFileIds);
}

export function closeOtherTabsState(
  files: Pick<ProjectFile, 'id'>[],
  openFileIds: string[],
  keepFileId: string,
  pinnedFileIds: string[] = [],
): ReconciledTabState {
  const pinnedSet = new Set(pinnedFileIds);
  const remaining = openFileIds.filter((id) => id === keepFileId || pinnedSet.has(id));
  return reconcileEditorTabs(files, remaining, keepFileId, pinnedFileIds);
}

export function closeTabsToRightState(
  files: Pick<ProjectFile, 'id'>[],
  openFileIds: string[],
  activeFileId: string,
  anchorFileId: string,
  pinnedFileIds: string[] = [],
): ReconciledTabState {
  const idx = openFileIds.indexOf(anchorFileId);
  if (idx === -1) return reconcileEditorTabs(files, openFileIds, activeFileId, pinnedFileIds);
  const pinnedSet = new Set(pinnedFileIds);
  const remaining = openFileIds.filter((id, i) => i <= idx || pinnedSet.has(id));
  const nextActive = remaining.includes(activeFileId) ? activeFileId : anchorFileId;
  return reconcileEditorTabs(files, remaining, nextActive, pinnedFileIds);
}

export function closeSavedTabsState(
  files: Pick<ProjectFile, 'id' | 'isDirty'>[],
  openFileIds: string[],
  activeFileId: string,
  pinnedFileIds: string[] = [],
): ReconciledTabState {
  const dirtyIds = new Set(files.filter((f) => f.isDirty).map((f) => f.id));
  const pinnedSet = new Set(pinnedFileIds);
  const remaining = openFileIds.filter((id) => dirtyIds.has(id) || pinnedSet.has(id));
  const nextActive = remaining.includes(activeFileId) ? activeFileId : remaining[remaining.length - 1] || '';
  return reconcileEditorTabs(files, remaining, nextActive, pinnedFileIds);
}

export function closeAllTabsState(
  files: Pick<ProjectFile, 'id'>[],
  openFileIds: string[],
  pinnedFileIds: string[] = [],
  includePinned = false,
): ReconciledTabState {
  const pinnedSet = new Set(pinnedFileIds);
  const remaining = includePinned ? [] : openFileIds.filter((id) => pinnedSet.has(id));
  const nextActive = remaining[remaining.length - 1] || '';
  return reconcileEditorTabs(files, remaining, nextActive, pinnedFileIds);
}
