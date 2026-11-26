import type { GraphNode } from '../types/ide';
import { getFolderModuleKey, type PositionedGraphNode } from './graphLayout';

export interface GraphExplorerState {
  selectedNodeId: string | null;
  expandedGroupIds: Set<string>;
  expandedFileIds: Set<string>;
  focusedNodeId: string | null;
  scopedGroupKey: string | null;
  groupRevealLimits: Map<string, number>;
}

export function createInitialGraphExplorerState(): GraphExplorerState {
  return {
    selectedNodeId: null,
    expandedGroupIds: new Set<string>(),
    expandedFileIds: new Set<string>(),
    focusedNodeId: null,
    scopedGroupKey: null,
    groupRevealLimits: new Map<string, number>(),
  };
}

/**
 * Reconciles `selectedNodeId` and `focusedNodeId` against the currently visible layout nodes
 * and full workspace graph nodes:
 * - If `selectedNodeId` is visible in `visibleNodes`, keep it.
 * - If `selectedNodeId` was a child whose parent group collapsed, promote selection to its parent group `group:<key>`.
 * - If `selectedNodeId` was deleted from `allNodes` (or no parent exists), clear selection (`null`).
 * - If `focusedNodeId` no longer exists in `allNodes`, clear `focusedNodeId` safely.
 */
export function reconcileGraphSelection(
  selectedNodeId: string | null,
  focusedNodeId: string | null,
  visibleNodes: PositionedGraphNode[],
  allNodes: GraphNode[],
): { selectedNodeId: string | null; focusedNodeId: string | null } {
  const allMap = new Map<string, GraphNode>();
  for (const n of allNodes) allMap.set(n.id, n);

  const visibleIds = new Set(visibleNodes.map((n) => n.id));

  let nextFocusedId = focusedNodeId;
  if (nextFocusedId && !allMap.has(nextFocusedId)) {
    nextFocusedId = null;
  }

  if (!selectedNodeId) {
    return { selectedNodeId: null, focusedNodeId: nextFocusedId };
  }

  if (visibleIds.has(selectedNodeId)) {
    return { selectedNodeId, focusedNodeId: nextFocusedId };
  }

  // If selectedNodeId is a group that is no longer present
  if (selectedNodeId.startsWith('group:')) {
    return { selectedNodeId: null, focusedNodeId: nextFocusedId };
  }

  // If selectedNodeId was a real node in `allNodes` whose parent group collapsed, select its nearest visible parent group
  const targetNode = allMap.get(selectedNodeId);
  if (targetNode) {
    const folder = getFolderModuleKey(targetNode.path);
    const groupKey = folder.key !== 'root' ? folder.key : targetNode.architectureArea || 'root';
    const parentGroupId = `group:${groupKey}`;
    if (visibleIds.has(parentGroupId)) {
      return { selectedNodeId: parentGroupId, focusedNodeId: nextFocusedId };
    }
  }

  // Node was deleted or hidden without visible parent
  return { selectedNodeId: null, focusedNodeId: nextFocusedId };
}

/**
 * Computes which groupKey (and optionally fileId) should be expanded to reveal a search match.
 */
export function getExpansionPathForNode(node: GraphNode): { groupKey: string; fileId?: string } {
  const folder = getFolderModuleKey(node.path);
  const groupKey = folder.key !== 'root' ? folder.key : node.architectureArea || 'root';
  return { groupKey };
}
