import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Box,
  ChevronDown,
  ChevronRight,
  Code2,
  FileCode2,
  FlaskConical,
  Folder,
  FolderOpen,
  Globe,
  Package,
  Shapes,
} from 'lucide-react';
import type { PositionedGraphNode } from '../../utils/graphLayout';

export interface SemanticNodeData extends Record<string, unknown> {
  node: PositionedGraphNode;
  isSelected: boolean;
  isExpanded: boolean;
  isRelated: boolean;
  isDimmedByFocus: boolean;
  showFileExpandToggle: boolean;
  onSelect: (node: PositionedGraphNode) => void;
  onDoubleClickNode: (node: PositionedGraphNode) => void;
  onHoverNode?: (node: PositionedGraphNode | null, pos?: { x: number; y: number }) => void;
  onToggleGroup: (groupKey: string) => void;
  onToggleFile: (fileId: string) => void;
  onShowMore: (groupKey: string) => void;
}

function getSemanticAccent(node: PositionedGraphNode): string {
  if (node.isGroup) return 'rgb(var(--graph-module))';
  switch (node.type) {
    case 'Function':
      return 'rgb(var(--graph-function))';
    case 'Class':
      return 'rgb(var(--graph-class))';
    case 'Interface':
    case 'Type':
      return 'rgb(var(--graph-interface))';
    case 'Test':
      return 'rgb(var(--graph-test))';
    case 'Package':
      return 'rgb(var(--graph-package))';
    case 'Route':
      return 'rgb(var(--graph-route))';
    default:
      return 'rgb(var(--graph-file))';
  }
}

function renderNodeIcon(node: PositionedGraphNode, isExpanded: boolean, color: string) {
  if (node.isGroup) {
    return isExpanded ? (
      <FolderOpen className="h-4 w-4 shrink-0" style={{ color }} aria-hidden="true" />
    ) : (
      <Folder className="h-4 w-4 shrink-0" style={{ color }} aria-hidden="true" />
    );
  }
  switch (node.type) {
    case 'Function':
      return <Code2 className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden="true" />;
    case 'Class':
      return <Box className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden="true" />;
    case 'Interface':
    case 'Type':
      return <Shapes className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden="true" />;
    case 'Test':
      return <FlaskConical className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden="true" />;
    case 'Package':
      return <Package className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden="true" />;
    case 'Route':
      return <Globe className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden="true" />;
    default:
      return <FileCode2 className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden="true" />;
  }
}

export const SemanticGraphNode: React.FC<NodeProps> = ({ data }) => {
  const {
    node,
    isSelected,
    isExpanded,
    isRelated,
    isDimmedByFocus,
    showFileExpandToggle,
    onSelect,
    onDoubleClickNode,
    onHoverNode,
    onToggleGroup,
    onToggleFile,
    onShowMore,
  } = data as SemanticNodeData;

  const accent = getSemanticAccent(node);
  const isImpacted = node.impactStatus && node.impactStatus !== 'none';

  return (
    <div
      data-node-id={node.id}
      data-node-type={node.isGroup ? 'ModuleGroup' : node.type}
      data-selected={isSelected ? 'true' : 'false'}
      data-expanded={isExpanded ? 'true' : 'false'}
      title={
        node.isGroup
          ? `${node.label} (${node.fileCount || 0} files, ${node.symbolCount || 0} symbols)`
          : `${node.label} (${node.type})\n${node.path}${node.line ? `:${node.line}` : ''}`
      }
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClickNode(node);
      }}
      onMouseEnter={(e) => {
        onHoverNode?.(node, { x: e.clientX, y: e.clientY });
      }}
      onMouseLeave={() => {
        onHoverNode?.(null);
      }}
      className={`group relative flex flex-col justify-center rounded-ide-panel font-sans transition-all duration-150 select-none ${
        isSelected
          ? 'bg-ide-selected shadow-md'
          : isRelated
            ? 'bg-ide-panel shadow-sm'
            : 'bg-ide-panel hover:bg-ide-hover'
      }`}
      style={{
        width: node.width || (node.isGroup ? 240 : 220),
        minHeight: node.height || (node.isGroup ? 74 : 56),
        opacity: isDimmedByFocus ? 0.52 : 1,
        border: isSelected
          ? '2.5px solid rgb(var(--ide-focus))'
          : isRelated
            ? `1.5px solid ${accent}`
            : isImpacted
              ? '1.5px solid rgb(var(--ide-amber))'
              : '1px solid rgb(var(--ide-border-strong))',
        padding: '8px 10px 8px 13px',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-ide-borderStrong opacity-0 group-hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-ide-borderStrong opacity-0 group-hover:opacity-100"
      />

      {/* Semantic left accent indicator */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1.5 left-0 w-1 rounded-r"
        style={{ backgroundColor: accent }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {renderNodeIcon(node, isExpanded, accent)}
          <span className="truncate text-[12px] font-semibold text-ide-strong">{node.label}</span>
        </div>

        {node.isGroup && node.isExpandable && node.groupKey && (
          <button
            type="button"
            data-expand-toggle="true"
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.label}`}
            title={`${isExpanded ? 'Collapse' : 'Expand'} ${node.label}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node);
              onToggleGroup(node.groupKey!);
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            className="ide-focus-ring flex h-5 w-5 shrink-0 items-center justify-center rounded-ide-small text-ide-muted hover:bg-ide-hover hover:text-ide-strong"
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}

        {!node.isGroup && node.isExpandable && showFileExpandToggle && (
          <button
            type="button"
            data-expand-toggle="true"
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} symbols in ${node.label}`}
            title={`${isExpanded ? 'Collapse' : 'Expand'} symbols`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node);
              onToggleFile(node.id);
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            className="ide-focus-ring flex h-5 w-5 shrink-0 items-center justify-center rounded-ide-small text-ide-muted hover:bg-ide-hover hover:text-ide-strong"
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Subtitle / Metadata row */}
      {node.isGroup ? (
        <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-ide-muted">
          <span>
            {node.fileCount || 0} {node.fileCount === 1 ? 'file' : 'files'} · {node.symbolCount || 0} symbols
          </span>
          {isSelected && (
            <span className="rounded bg-ide-focus px-1.5 py-0.5 font-sans text-[9px] font-semibold text-ide-onAccent">
              Selected
            </span>
          )}
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[10px] text-ide-subtle" title={node.path}>
            {node.path}
          </span>
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold"
            style={{
              backgroundColor: isSelected ? 'rgb(var(--ide-focus))' : 'rgb(var(--ide-surface))',
              color: isSelected ? 'rgb(var(--ide-on-accent))' : accent,
            }}
          >
            {node.type}
          </span>
        </div>
      )}

      {/* Large-group incremental Show more */}
      {node.isGroup && isExpanded && (node.hiddenChildCount ?? 0) > 0 && node.groupKey && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShowMore(node.groupKey!);
          }}
          className="ide-focus-ring mt-1.5 self-start rounded-ide-small border border-ide-borderStrong bg-ide-surface px-2 py-0.5 text-[10px] font-semibold text-ide-focus hover:bg-ide-hover"
        >
          Show more (+{node.hiddenChildCount})
        </button>
      )}
    </div>
  );
};
