import React from 'react';
import { cn } from './cn';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

const sizeStyles: Record<string, { input: string; label: string }> = {
  sm: {
    input: 'pl-3 pr-3 py-2 text-xs rounded-lg',
    label: 'text-[10px] mb-1',
  },
  md: {
    input: 'pl-3.5 pr-3.5 py-2.5 text-sm rounded-xl',
    label: 'text-xs mb-1.5',
  },
  lg: {
    input: 'pl-4 pr-4 py-3.5 text-sm rounded-2xl',
    label: 'text-xs mb-2',
  },
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, iconRight, inputSize = 'md', id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    const sizes = sizeStyles[inputSize];

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-slate-500 font-semibold uppercase tracking-wider',
              sizes.label
            )}
          >
            {label}
          </label>
        )}
        <div className="relative group/input">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/input:text-blue-600 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-white border font-medium text-slate-900',
              'placeholder:text-slate-400',
              'outline-none transition-all duration-200',
              'focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50',
              error
                ? 'border-rose-400 focus:ring-rose-500/30 focus:border-rose-500'
                : 'border-slate-200 hover:border-slate-300',
              icon && 'pl-10',
              iconRight && 'pr-10',
              sizes.input,
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {iconRight}
            </span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="flex items-center gap-1.5 mt-1.5 text-[11px] text-rose-500 font-medium">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1 text-[11px] text-slate-400 font-medium">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/* Textarea variant */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900',
            'placeholder:text-slate-400',
            'outline-none transition-all duration-200',
            'focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50',
            'resize-none',
            error && 'border-rose-400 focus:ring-rose-500/30 focus:border-rose-500',
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p className="flex items-center gap-1.5 mt-1.5 text-[11px] text-rose-500 font-medium">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-1 text-[11px] text-slate-400 font-medium">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Input;
