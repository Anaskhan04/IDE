import type { GraphExplorationMode } from './graphLayout';
import type { ActiveView } from '../types/ide';

export interface GraphSessionState {
  explorationMode: GraphExplorationMode;
  expandedGroupKeys: string[];
  expandedFileIds: string[];
  groupRevealLimits: Record<string, number>;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  focusedNodeId: string | null;
  scopedGroupKey: string | null;
  focusDepth: 1 | 2 | 3;
  edgeTypeFilter: 'all' | 'IMPORTS' | 'CALLS';
  searchQuery: string;
  hideGenerated: boolean;
  isDetailsOpen: boolean;
  viewport: { x: number; y: number; zoom: number } | null;
  manualPositions: Record<string, { x: number; y: number }>;
}

export function createDefaultGraphSession(): GraphSessionState {
  return {
    explorationMode: 'overview',
    expandedGroupKeys: [],
    expandedFileIds: [],
    groupRevealLimits: {},
    selectedNodeId: null,
    selectedEdgeId: null,
    focusedNodeId: null,
    scopedGroupKey: null,
    focusDepth: 1,
    edgeTypeFilter: 'all',
    searchQuery: '',
    hideGenerated: true,
    isDetailsOpen: true,
    viewport: null,
    manualPositions: {},
  };
}

export interface NavigationEntry {
  view: ActiveView;
  fileId?: string | null;
  line?: number | null;
  graphNodeId?: string | null;
  scopedGroupKey?: string | null;
  explorationMode?: GraphExplorationMode;
  label?: string;
}

export function isSameNavigationEntry(a: NavigationEntry | undefined, b: NavigationEntry | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.view === b.view &&
    (a.fileId || '') === (b.fileId || '') &&
    (a.line || 0) === (b.line || 0) &&
    (a.graphNodeId || '') === (b.graphNodeId || '') &&
    (a.scopedGroupKey || '') === (b.scopedGroupKey || '') &&
    (a.explorationMode || '') === (b.explorationMode || '')
  );
}

export function pushNavigationHistory(
  history: NavigationEntry[],
  currentIndex: number,
  nextEntry: NavigationEntry,
  maxEntries = 40,
): { history: NavigationEntry[]; index: number } {
  const current = currentIndex >= 0 && currentIndex < history.length ? history[currentIndex] : undefined;
  if (isSameNavigationEntry(current, nextEntry)) {
    return { history, index: currentIndex };
  }
  const truncated = history.slice(0, currentIndex + 1);
  const appended = [...truncated, nextEntry];
  if (appended.length > maxEntries) {
    const trimmed = appended.slice(appended.length - maxEntries);
    return { history: trimmed, index: trimmed.length - 1 };
  }
  return { history: appended, index: appended.length - 1 };
}
