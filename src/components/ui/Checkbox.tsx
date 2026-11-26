import React, { useId } from 'react';
import { Check } from 'lucide-react';
import { cn } from './cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, label, description, checked, disabled, className, ...rest }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          'inline-flex items-start gap-2.5 select-none',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className
        )}
      >
        <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...rest}
          />
          <span
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded-ide-small border transition-colors duration-150',
              'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-ide-focus peer-focus-visible:outline-offset-2',
              checked
                ? 'border-ide-focus bg-ide-focus text-ide-onAccent'
                : 'border-ide-borderStrong bg-ide-bg text-transparent hover:border-ide-muted'
            )}
            aria-hidden="true"
          >
            <Check className="h-3 w-3" strokeWidth={2.5} />
          </span>
        </span>
        <span className="min-w-0">
          <span className="block font-sans text-[13px] font-medium text-ide-text leading-tight">
            {label}
          </span>
          {description && (
            <span className="mt-0.5 block font-sans text-[12px] text-ide-muted">
              {description}
            </span>
          )}
        </span>
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';
