import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading…',
  className,
}) => (
  <div
    role="status"
    aria-live="polite"
    className={cn(
      'flex items-center justify-center gap-2 p-4 font-sans text-[13px] text-ide-muted',
      className
    )}
  >
    <Loader2 className="h-4 w-4 animate-spin text-ide-focus" aria-hidden="true" />
    <span>{label}</span>
  </div>
);
