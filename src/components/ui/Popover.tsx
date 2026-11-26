import React, { useEffect, useRef } from 'react';
import { cn } from './cn';

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  ariaLabel?: string;
  className?: string;
}

export const Popover: React.FC<PopoverProps> = ({
  open,
  onClose,
  trigger,
  children,
  align = 'right',
  ariaLabel = 'Popover',
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  return (
    <div ref={containerRef} className="relative inline-block">
      {trigger}
      {open && (
        <div
          role="dialog"
          aria-label={ariaLabel}
          className={cn(
            'absolute top-full z-50 mt-1.5 max-h-[80vh] overflow-y-auto rounded-ide-menu border border-ide-borderStrong bg-ide-panel p-4 shadow-lg transition-opacity duration-150',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};
