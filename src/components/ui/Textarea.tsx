import React, { useId } from 'react';
import { cn } from './cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id, label, helperText, error, className, disabled, rows = 3, ...rest }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const feedbackId = `${textareaId}-feedback`;
    const hasFeedback = Boolean(error || helperText);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={textareaId}
            className="block font-sans text-[12px] font-medium text-ide-text"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={hasFeedback ? feedbackId : undefined}
          className={cn(
            'w-full rounded-ide-control border bg-ide-bg px-3 py-2 font-sans text-[13px] text-ide-text outline-none transition-colors duration-150 placeholder:text-ide-subtle',
            error
              ? 'border-ide-rose focus:ring-1 focus:ring-ide-rose'
              : 'border-ide-borderStrong focus:border-ide-focus focus:ring-1 focus:ring-ide-focus',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          {...rest}
        />
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
Textarea.displayName = 'Textarea';
