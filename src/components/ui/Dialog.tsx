import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from './cn';
import { IconButton } from './IconButton';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  hasUnsavedChanges?: boolean;
  onAttemptDismiss?: () => void;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
  );
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  hasUnsavedChanges = false,
  onAttemptDismiss,
  className,
}) => {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const requestClose = () => {
    if (hasUnsavedChanges) {
      if (onAttemptDismiss) {
        onAttemptDismiss();
        return;
      }
      if (typeof window !== 'undefined' && !window.confirm('Discard unsaved changes?')) {
        return;
      }
    }
    onClose();
  };

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = setTimeout(() => {
      const focusables = getFocusableElements(dialogRef.current);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        dialogRef.current?.focus();
      }
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key === 'Tab') {
        const focusables = getFocusableElements(dialogRef.current);
        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ide-overlay/75 p-4"
      role="presentation"
      onClick={requestClose}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'flex max-h-[90vh] w-full flex-col rounded-ide-dialog border border-ide-borderStrong bg-ide-panel shadow-xl outline-none',
          SIZE_CLASSES[size],
          className
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ide-border px-6 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="font-sans text-[18px] font-semibold leading-snug text-ide-strong">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 font-sans text-[12px] text-ide-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close dialog" onClick={requestClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 font-sans text-[13px] text-ide-text">
          {children}
        </div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-ide-border px-6 py-4">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
};
