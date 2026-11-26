import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  label?: string;
  options?: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { value: string } }) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const Select: React.FC<SelectProps> = ({
  id,
  label,
  options = [],
  value,
  defaultValue,
  onChange,
  placeholder = 'Select an option',
  helperText,
  error,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const listboxId = `${selectId}-listbox`;
  const feedbackId = `${selectId}-feedback`;
  const hasFeedback = Boolean(error || helperText);

  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value ?? '');
  const currentValue = value !== undefined ? value : internalValue;
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(() =>
    Math.max(0, options.findIndex((o) => o.value === currentValue))
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((o) => o.value === currentValue);

  const updatePlacement = () => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setOpenUpward(spaceBelow < 240 && rect.top > spaceBelow);
  };

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  const selectOption = (opt: SelectOption) => {
    if (opt.disabled) return;
    if (value === undefined) setInternalValue(opt.value);
    onChange?.({ target: { value: opt.value } });
    closeMenu(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    updatePlacement();
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMenu(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu(true);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const moveHighlight = (delta: number) => {
    const enabled = options
      .map((o, i) => (!o.disabled ? i : -1))
      .filter((i) => i >= 0);
    if (enabled.length === 0) return;
    const curPos = enabled.indexOf(highlightedIndex);
    const nextPos =
      curPos === -1
        ? 0
        : (curPos + delta + enabled.length) % enabled.length;
    setHighlightedIndex(enabled[nextPos]);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setHighlightedIndex(Math.max(0, options.findIndex((o) => o.value === currentValue)));
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveHighlight(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveHighlight(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const first = options.findIndex((o) => !o.disabled);
      if (first >= 0) setHighlightedIndex(first);
    } else if (e.key === 'End') {
      e.preventDefault();
      for (let i = options.length - 1; i >= 0; i -= 1) {
        if (!options[i].disabled) {
          setHighlightedIndex(i);
          break;
        }
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const targetOpt = options[highlightedIndex];
      if (targetOpt) selectOption(targetOpt);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block font-sans text-[12px] font-medium text-ide-text"
        >
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        disabled={disabled}
        role="combobox"
        aria-label={!label ? ariaLabel : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={hasFeedback ? feedbackId : undefined}
        onClick={() => {
          if (disabled) return;
          if (!open) {
            setHighlightedIndex(Math.max(0, options.findIndex((o) => o.value === currentValue)));
          }
          setOpen((v) => !v);
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'ide-focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-ide-control border bg-ide-bg px-3 text-left font-sans text-[13px] transition-colors duration-150',
          error
            ? 'border-ide-rose'
            : open
              ? 'border-ide-focus ring-1 ring-ide-focus'
              : 'border-ide-borderStrong hover:bg-ide-hover/40',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', selectedOption ? 'text-ide-text' : 'text-ide-subtle')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-ide-subtle transition-transform duration-150',
            open && 'rotate-180 text-ide-text'
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className={cn(
            'absolute left-0 z-50 max-h-60 w-full overflow-y-auto rounded-ide-menu border border-ide-borderStrong bg-ide-panel p-1 shadow-lg transition-all duration-150',
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === currentValue;
            const isHighlighted = idx === highlightedIndex;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                onMouseEnter={() => !opt.disabled && setHighlightedIndex(idx)}
                onClick={() => selectOption(opt)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 rounded-ide-small px-2.5 py-1.5 font-sans text-[13px] transition-colors duration-150',
                  opt.disabled && 'opacity-40 cursor-not-allowed',
                  isSelected
                    ? 'bg-ide-selected text-ide-strong font-medium'
                    : isHighlighted
                      ? 'bg-ide-hover text-ide-text'
                      : 'text-ide-text hover:bg-ide-hover'
                )}
              >
                <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-ide-focus" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasFeedback && (
        <p
          id={feedbackId}
          role={error ? 'alert' : undefined}
          className={cn(
            'font-sans text-[12px]',
            error ? 'text-ide-rose' : 'text-ide-muted'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};
