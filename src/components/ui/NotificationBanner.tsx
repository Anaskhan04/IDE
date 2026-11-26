import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from './cn';
import { IconButton } from './IconButton';

export type NotificationVariant = 'info' | 'success' | 'warning' | 'error';

export interface NotificationBannerProps {
  variant?: NotificationVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  action?: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<NotificationVariant, string> = {
  info: 'border-ide-cyan/35 bg-ide-cyan/10 text-ide-text',
  success: 'border-ide-emerald/35 bg-ide-emerald/10 text-ide-text',
  warning: 'border-ide-amber/35 bg-ide-amber/10 text-ide-text',
  error: 'border-ide-rose/35 bg-ide-rose/10 text-ide-text',
};

const VARIANT_ICONS: Record<NotificationVariant, React.ReactNode> = {
  info: <Info className="h-4 w-4 shrink-0 text-ide-cyan" aria-hidden="true" />,
  success: <CheckCircle2 className="h-4 w-4 shrink-0 text-ide-emerald" aria-hidden="true" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0 text-ide-amber" aria-hidden="true" />,
  error: <AlertCircle className="h-4 w-4 shrink-0 text-ide-rose" aria-hidden="true" />,
};

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  variant = 'info',
  title,
  message,
  onDismiss,
  action,
  className,
}) => (
  <div
    role={variant === 'error' ? 'alert' : 'status'}
    className={cn(
      'flex items-start justify-between gap-3 rounded-ide-control border px-3 py-2 font-sans text-[12px]',
      VARIANT_STYLES[variant],
      className
    )}
  >
    <div className="flex items-start gap-2 min-w-0">
      <span className="mt-0.5">{VARIANT_ICONS[variant]}</span>
      <div className="min-w-0">
        {title && <div className="font-semibold text-ide-strong">{title}</div>}
        <div className="text-ide-text">{message}</div>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-1.5">
      {action}
      {onDismiss && (
        <IconButton label="Dismiss notification" size="sm" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </IconButton>
      )}
    </div>
  </div>
);
