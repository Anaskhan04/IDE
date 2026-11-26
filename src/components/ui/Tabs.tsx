import React, { useRef } from 'react';
import { cn } from './cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  ariaLabel = 'Tabs',
  className,
}) => {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const enabled = items
      .map((t, idx) => (!t.disabled ? idx : -1))
      .filter((idx) => idx >= 0);
    if (enabled.length === 0) return;
    const pos = enabled.indexOf(currentIndex);

    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') {
      nextIdx = enabled[(pos + 1) % enabled.length];
    } else if (e.key === 'ArrowLeft') {
      nextIdx = enabled[(pos - 1 + enabled.length) % enabled.length];
    } else if (e.key === 'Home') {
      nextIdx = enabled[0];
    } else if (e.key === 'End') {
      nextIdx = enabled[enabled.length - 1];
    }

    if (nextIdx !== null) {
      e.preventDefault();
      tabRefs.current[nextIdx]?.focus();
      onChange(items[nextIdx].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex h-9 items-stretch gap-1 border-b border-ide-border bg-ide-shell px-2',
        className
      )}
    >
      {items.map((item, index) => {
        const isSelected = item.id === activeId;
        return (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'ide-focus-ring flex h-full items-center gap-2 whitespace-nowrap border-b-2 px-3 font-sans text-[13px] font-medium transition-colors duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isSelected
                ? 'border-ide-focus text-ide-strong'
                : 'border-transparent text-ide-muted hover:bg-ide-hover hover:text-ide-text'
            )}
          >
            {item.icon && <span className="shrink-0" aria-hidden="true">{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span className="rounded-ide-small bg-ide-surface px-1.5 py-0.5 font-sans text-[11px] text-ide-muted">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
