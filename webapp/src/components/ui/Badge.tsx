import React from 'react';
import { cn } from './cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'amber' | 'blue' | 'indigo' | 'emerald' | 'cyan' | 'purple';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
  pulse?: boolean;
}

const variantStyles: Record<string, string> = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-sky-50 text-sky-700 border-sky-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200/90',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/90',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/90',
  cyan: 'bg-sky-50 text-sky-700 border-sky-200/90',
  purple: 'bg-violet-50 text-violet-700 border-violet-200/90',
};

const dotColors: Record<string, string> = {
  default: 'bg-slate-500',
  success: 'bg-emerald-500',
  warning: 'bg-indigo-500',
  danger: 'bg-rose-500',
  info: 'bg-blue-500',
  amber: 'bg-sky-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  cyan: 'bg-sky-500',
  purple: 'bg-violet-500',
};

const sizeStyles: Record<string, string> = {
  xs: 'px-1.5 py-0.5 text-[9px]',
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', dot, pulse, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full border',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {pulse && (
              <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', dotColors[variant])} />
            )}
            <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', dotColors[variant])} />
          </span>
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

/* Notification count badge (floating) */
export function CountBadge({
  count,
  className,
  max = 99,
}: {
  count: number;
  className?: string;
  max?: number;
}) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        'absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center',
        'px-1 text-[10px] font-black text-white bg-rose-500 rounded-full',
        'shadow-sm shadow-rose-500/30',
        className
      )}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}

export default Badge;
