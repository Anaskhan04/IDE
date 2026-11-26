import React from 'react';
import { cn } from './cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-ide-panel border border-ide-border bg-ide-surface p-6 text-center',
      className
    )}
  >
    {icon && (
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-ide-panel border border-ide-border bg-ide-bg text-ide-muted">
        {icon}
      </div>
    )}
    <h3 className="font-sans text-[14px] font-semibold text-ide-strong">{title}</h3>
    {description && (
      <p className="mt-1 max-w-sm font-sans text-[12px] text-ide-muted">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
