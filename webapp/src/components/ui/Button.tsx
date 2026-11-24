import React from 'react';
import { cn } from './cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#1d4ed8] hover:from-blue-600 hover:to-indigo-600 text-white font-bold shadow-md shadow-blue-700/25 hover:shadow-lg hover:shadow-blue-700/35 active:shadow-blue-700/20',
  secondary:
    'bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-200 font-bold shadow-xs',
  ghost:
    'bg-transparent hover:bg-blue-100/60 text-slate-700 hover:text-blue-900 font-semibold',
  danger:
    'bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-sm shadow-rose-500/25',
  success:
    'bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/25',
  outline:
    'bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-slate-800 font-semibold shadow-xs',
};

const sizeStyles: Record<string, string> = {
  xs: 'px-2.5 py-1.5 text-[11px] rounded-lg gap-1',
  sm: 'px-3 py-2 text-xs rounded-xl gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3.5 text-base rounded-2xl gap-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, icon, iconRight, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-200 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          'active:scale-[0.97]',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
        {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
