import React, { useId } from 'react';
import { cn } from './cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      helperText,
      error,
      leftAdornment,
      rightAdornment,
      className,
      disabled,
      ...rest
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const feedbackId = `${inputId}-feedback`;
    const hasFeedback = Boolean(error || helperText);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-sans text-[12px] font-medium text-ide-text"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            'flex h-8 w-full items-center gap-2 rounded-ide-control border bg-ide-bg px-3 transition-colors duration-150',
            error
              ? 'border-ide-rose focus-within:ring-1 focus-within:ring-ide-rose'
              : 'border-ide-borderStrong focus-within:border-ide-focus focus-within:ring-1 focus-within:ring-ide-focus',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          {leftAdornment && (
            <span className="shrink-0 text-ide-subtle" aria-hidden="true">
              {leftAdornment}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={hasFeedback ? feedbackId : undefined}
            className="min-w-0 flex-1 bg-transparent font-sans text-[13px] text-ide-text outline-none placeholder:text-ide-subtle disabled:cursor-not-allowed"
            {...rest}
          />
          {rightAdornment && (
            <span className="shrink-0 text-ide-subtle">{rightAdornment}</span>
          )}
        </div>
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
  }
);
Input.displayName = 'Input';
