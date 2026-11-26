import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

export type IconButtonVariant = 'ghost' | 'secondary' | 'primary' | 'danger';
export type IconButtonSize = 'sm' | 'md';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tooltip?: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  active?: boolean;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  ghost:
    'bg-transparent text-ide-muted hover:bg-ide-hover hover:text-ide-text active:bg-ide-pressed',
  secondary:
    'bg-ide-surface text-ide-text border border-ide-borderStrong hover:bg-ide-hover active:bg-ide-pressed',
  primary:
    'bg-ide-focus text-ide-onAccent hover:bg-ide-accentHover active:bg-ide-accentPressed',
  danger:
    'bg-transparent text-ide-rose hover:bg-ide-rose/10 active:bg-ide-rose/20',
};

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      type = 'button',
      label,
      tooltip,
      variant = 'ghost',
      size = 'md',
      active = false,
      loading = false,
      disabled = false,
      className,
      children,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-label={label}
        title={tooltip || label}
        aria-pressed={active || undefined}
        aria-busy={loading || undefined}
        className={cn(
          'ide-focus-ring inline-flex shrink-0 items-center justify-center rounded-ide-control transition-colors duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          active && 'bg-ide-selected text-ide-strong',
          className
        )}
        {...rest}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          children
        )}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';
