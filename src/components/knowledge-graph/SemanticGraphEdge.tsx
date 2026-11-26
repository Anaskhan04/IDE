import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import type { AggregatedGraphEdge } from '../../utils/graphLayout';

export interface SemanticEdgeData extends Record<string, unknown> {
  edge: AggregatedGraphEdge;
  isSelected: boolean;
  isHighlighted: boolean;
  showLabel: boolean;
  sourceLabel: string;
  targetLabel: string;
  onSelectEdge?: (edge: AggregatedGraphEdge) => void;
  onHoverEdge?: (edge: AggregatedGraphEdge | null, pos?: { x: number; y: number }) => void;
  onDoubleClickEdge?: (edge: AggregatedGraphEdge) => void;
}

function getEdgeStyle(edge: AggregatedGraphEdge, isSelected: boolean, isHighlighted: boolean): {
  stroke: string;
  strokeDasharray?: string;
  strokeWidth: number;
  opacity: number;
} {
  const isContains = edge.edgeKind === 'contains' || edge.type === 'CONTAINS';
  const isDefines = edge.edgeKind === 'defines' || edge.type === 'DEFINES';
  const isCalls = edge.edgeKind === 'calls' || edge.type === 'CALLS';
  const isTest = edge.type === 'TEST_REFERENCE' || edge.type === 'TESTS';
  const isInheritance = edge.type === 'EXTENDS' || edge.type === 'IMPLEMENTS';
  const isTypeRef = edge.type === 'TYPE_REFERENCE' || edge.type === 'REFERENCES';
  const isRenders = edge.type === 'RENDERS';

  let stroke = 'rgb(var(--graph-file))';
  let strokeDasharray: string | undefined;

  if (edge.isImpactPath) {
    stroke = 'rgb(var(--ide-rose))';
  } else if (isContains) {
    stroke = 'rgb(var(--ide-border-strong))';
    strokeDasharray = '5 4';
  } else if (isDefines) {
    stroke = 'rgb(var(--graph-function))';
    strokeDasharray = '2 3';
  } else if (isCalls) {
    stroke = 'rgb(var(--graph-class))';
  } else if (isTest) {
    stroke = 'rgb(var(--graph-test))';
    strokeDasharray = '5 3';
  } else if (isInheritance || isTypeRef || isRenders) {
    stroke = 'rgb(var(--graph-interface))';
    if (edge.type === 'IMPLEMENTS') strokeDasharray = '4 3';
  }

  if (isSelected || (isHighlighted && !isContains)) {
    stroke = 'rgb(var(--ide-focus))';
  }

  const baseWidth = isContains ? 1.4 : Math.min(3, 1.6 + Math.log2(edge.weight || 1) * 0.55);

  return {
    stroke,
    strokeDasharray,
    strokeWidth: isSelected ? baseWidth + 1.4 : isHighlighted ? baseWidth + 0.8 : baseWidth,
    opacity: isSelected ? 1 : isHighlighted ? 0.96 : isContains ? 0.62 : 0.78,
  };
}

export const SemanticGraphEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}) => {
  const edgeData = data as SemanticEdgeData | undefined;
  const edge = edgeData?.edge;
  const isSelected = Boolean(edgeData?.isSelected);
  const isHighlighted = Boolean(edgeData?.isHighlighted);
  const showLabel = Boolean(edgeData?.showLabel);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const style = edge
    ? getEdgeStyle(edge, isSelected, isHighlighted)
    : { stroke: 'rgb(var(--ide-text-subtle))', strokeWidth: 1.5, opacity: 0.7 };

  const labelText = edge ? edge.label || edge.type : '';

  return (
    <g
      data-edge-id={edge?.id || id}
      data-edge-kind={edge?.edgeKind || 'imports'}
      data-edge-source={edge?.source || ''}
      data-edge-target={edge?.target || ''}
      data-edge-selected={isSelected ? 'true' : 'false'}
      style={{ cursor: edge ? 'pointer' : 'default' }}
      onClick={(e) => {
        if (!edge || !edgeData?.onSelectEdge) return;
        e.stopPropagation();
        edgeData.onSelectEdge(edge);
      }}
      onDoubleClick={(e) => {
        if (!edge || !edgeData?.onDoubleClickEdge) return;
        e.stopPropagation();
        edgeData.onDoubleClickEdge(edge);
      }}
      onMouseEnter={(e) => {
        if (!edge || !edgeData?.onHoverEdge) return;
        edgeData.onHoverEdge(edge, { x: e.clientX, y: e.clientY });
      }}
      onMouseLeave={() => {
        edgeData?.onHoverEdge?.(null);
      }}
    >
      {/* Invisible wider hit-target for effortless edge hover & click */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={14} />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={0}
        style={{
          stroke: style.stroke,
          strokeDasharray: style.strokeDasharray,
          strokeWidth: style.strokeWidth,
          opacity: style.opacity,
          transition: 'opacity 150ms ease, stroke-width 150ms ease',
        }}
      />
      {(showLabel || isSelected) && labelText && (
        <EdgeLabelRenderer>
          <button
            type="button"
            data-edge-label-for={edge?.id || id}
            onClick={(e) => {
              if (!edge || !edgeData?.onSelectEdge) return;
              e.stopPropagation();
              edgeData.onSelectEdge(edge);
            }}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`rounded border px-1.5 py-0.5 font-mono text-[9.5px] shadow-sm transition-colors ${
              isSelected
                ? 'border-ide-focus bg-ide-focus text-ide-onAccent font-semibold'
                : isHighlighted
                  ? 'border-ide-focus bg-ide-selected text-ide-strong font-semibold'
                  : 'border-ide-border bg-ide-panel/95 text-ide-muted hover:border-ide-borderStrong hover:text-ide-strong'
            }`}
          >
            {labelText}
          </button>
        </EdgeLabelRenderer>
      )}
    </g>
  );
};
