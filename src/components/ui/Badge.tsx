import React from 'react';
import { cn } from './cn';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'intelligence';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-ide-surface text-ide-muted border-ide-border',
  accent: 'bg-ide-focus/15 text-ide-focus border-ide-focus/30',
  success: 'bg-ide-emerald/15 text-ide-emerald border-ide-emerald/30',
  warning: 'bg-ide-amber/15 text-ide-amber border-ide-amber/30',
  error: 'bg-ide-rose/15 text-ide-rose border-ide-rose/30',
  intelligence: 'bg-ide-purple/15 text-ide-purple border-ide-purple/30',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  className,
  children,
  ...rest
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-ide-small border px-2 py-0.5 font-sans text-[11px] font-medium leading-tight',
      VARIANT_CLASSES[variant],
      className
    )}
    {...rest}
  >
    {children}
  </span>
);
