import React, { useEffect, useRef, useState } from 'react';
import { cn } from './cn';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  selected?: boolean;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

export interface MenuProps {
  trigger: (props: {
    open: boolean;
    toggle: () => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'menu';
  }) => React.ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
  side?: 'top' | 'bottom' | 'auto';
  menuClassName?: string;
  className?: string;
}

export const Menu: React.FC<MenuProps> = ({
  trigger,
  items,
  align = 'left',
  side = 'auto',
  menuClassName,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(side === 'top');
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return undefined;
    if (side === 'top') {
      setOpenUpward(true);
    } else if (side === 'bottom') {
      setOpenUpward(false);
    } else if (containerRef.current && typeof window !== 'undefined') {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 240 && rect.top > spaceBelow);
    }
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const focusItem = (index: number) => {
    const enabledIndices = items
      .map((item, idx) => (!item.disabled ? idx : -1))
      .filter((idx) => idx >= 0);
    if (enabledIndices.length === 0) return;
    const target = itemRefs.current[index];
    if (target && !target.disabled) target.focus();
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const enabledIndices = items
      .map((item, idx) => (!item.disabled ? idx : -1))
      .filter((idx) => idx >= 0);
    if (enabledIndices.length === 0) return;
    const pos = enabledIndices.indexOf(currentIndex);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusItem(enabledIndices[(pos + 1) % enabledIndices.length]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusItem(enabledIndices[(pos - 1 + enabledIndices.length) % enabledIndices.length]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusItem(enabledIndices[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusItem(enabledIndices[enabledIndices.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      {trigger({
        open,
        toggle: () => setOpen((v) => !v),
        'aria-expanded': open,
        'aria-haspopup': 'menu',
      })}

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 max-h-[70vh] min-w-[220px] max-w-[300px] overflow-y-auto rounded-ide-menu border border-ide-borderStrong bg-ide-panel p-1 shadow-lg transition-opacity duration-150',
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1',
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName
          )}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onKeyDown={(e) => handleMenuKeyDown(e, index)}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                'ide-focus-ring flex w-full items-center justify-between gap-3 rounded-ide-small px-3 py-1.5 text-left font-sans text-[13px] transition-colors duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                item.selected && !item.danger && 'bg-ide-selected text-ide-strong font-medium',
                item.danger
                  ? 'text-ide-rose hover:bg-ide-rose/10'
                  : 'text-ide-text hover:bg-ide-hover'
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {item.icon && <span className="shrink-0" aria-hidden="true">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </span>
              {item.shortcut && (
                <kbd className="shrink-0 font-mono text-[11px] text-ide-subtle">{item.shortcut}</kbd>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
