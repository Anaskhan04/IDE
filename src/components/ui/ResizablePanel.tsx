import React, { useRef, useState } from 'react';
import { cn } from './cn';

export interface ResizablePanelProps {
  direction: 'horizontal' | 'vertical';
  handlePosition: 'start' | 'end';
  defaultSize: number;
  minSize: number;
  maxSize: number;
  step?: number;
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  direction,
  handlePosition,
  defaultSize,
  minSize,
  maxSize,
  step = 16,
  ariaLabel,
  children,
  className,
}) => {
  const [size, setSize] = useState(defaultSize);
  const draggingRef = useRef(false);

  const clamp = (val: number) => Math.max(minSize, Math.min(maxSize, val));

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const startSize = size;

    const handleMove = (moveEvent: PointerEvent) => {
      if (!draggingRef.current) return;
      const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPos - startPos;
      const signedDelta = handlePosition === 'end' ? delta : -delta;
      setSize(clamp(startSize + signedDelta));
    };

    const handleUp = () => {
      draggingRef.current = false;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const growKey = direction === 'horizontal'
      ? (handlePosition === 'end' ? 'ArrowRight' : 'ArrowLeft')
      : (handlePosition === 'end' ? 'ArrowDown' : 'ArrowUp');
    const shrinkKey = direction === 'horizontal'
      ? (handlePosition === 'end' ? 'ArrowLeft' : 'ArrowRight')
      : (handlePosition === 'end' ? 'ArrowUp' : 'ArrowDown');

    if (e.key === growKey) {
      e.preventDefault();
      setSize((s) => clamp(s + step));
    } else if (e.key === shrinkKey) {
      e.preventDefault();
      setSize((s) => clamp(s - step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSize(minSize);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSize(maxSize);
    }
  };

  const handleEl = (
    <div
      role="separator"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
      aria-valuenow={size}
      aria-valuemin={minSize}
      aria-valuemax={maxSize}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      className={cn(
        'ide-focus-ring shrink-0 bg-ide-border transition-colors hover:bg-ide-focus focus-visible:bg-ide-focus',
        direction === 'horizontal'
          ? 'w-1 cursor-col-resize'
          : 'h-1 cursor-row-resize'
      )}
    />
  );

  return (
    <div
      style={direction === 'horizontal' ? { width: size } : { height: size }}
      className={cn(
        'relative flex shrink-0 overflow-hidden',
        direction === 'horizontal' ? 'flex-row h-full' : 'flex-col w-full',
        className
      )}
    >
      {handlePosition === 'start' && handleEl}
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
      {handlePosition === 'end' && handleEl}
    </div>
  );
};
