import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from './cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  className,
}) => (
  <div
    role="alert"
    className={cn(
      'flex flex-col items-start gap-3 rounded-ide-panel border border-ide-rose/40 bg-ide-rose/10 p-4 font-sans',
      className
    )}
  >
    <div className="flex items-start gap-2.5">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ide-rose" aria-hidden="true" />
      <div>
        <h3 className="text-[14px] font-semibold text-ide-strong">{title}</h3>
        <p className="mt-1 text-[12px] text-ide-text">{message}</p>
      </div>
    </div>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {retryLabel}
      </Button>
    )}
  </div>
);
