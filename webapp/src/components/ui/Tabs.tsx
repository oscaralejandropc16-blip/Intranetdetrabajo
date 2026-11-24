import React, { useRef, useEffect, useState } from 'react';
import { cn } from './cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
  badgeVariant?: 'default' | 'danger' | 'success' | 'amber' | 'blue';
  hidden?: boolean;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline' | 'segmented';
  size?: 'sm' | 'md';
  className?: string;
  fullWidth?: boolean;
}

const badgeColors: Record<string, string> = {
  default: 'bg-blue-50 text-slate-700',
  danger: 'bg-rose-500 text-white',
  success: 'bg-emerald-600 text-white',
  amber: 'bg-sky-500 text-white',
  blue: 'bg-blue-600 text-white',
};

export function Tabs({ items, activeId, onChange, variant = 'segmented', size = 'md', className, fullWidth }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});

  const visibleItems = items.filter(item => !item.hidden);

  // Animated underline indicator
  useEffect(() => {
    if (variant !== 'underline') return;
    const container = containerRef.current;
    if (!container) return;
    const activeButton = container.querySelector(`[data-tab-id="${activeId}"]`) as HTMLElement;
    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      });
    }
  }, [activeId, variant, visibleItems.length]);

  if (variant === 'underline') {
    return (
      <div className={cn('relative', className)}>
        <div
          ref={containerRef}
          className="flex gap-0 overflow-x-auto scrollbar-none border-b border-slate-200"
          role="tablist"
        >
          {visibleItems.map(item => (
            <button
              key={item.id}
              role="tab"
              data-tab-id={item.id}
              aria-selected={item.id === activeId}
              disabled={item.disabled}
              onClick={() => onChange(item.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer shrink-0',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                item.id === activeId
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800',
                item.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {item.icon && <span className="shrink-0 w-4 h-4">{item.icon}</span>}
              {item.label}
              {item.badge != null && (
                <span className={cn(
                  'px-1.5 py-0.5 text-[10px] font-bold rounded-full',
                  badgeColors[item.badgeVariant || 'default']
                )}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Animated underline */}
        <div
          className="absolute bottom-0 h-[2.5px] bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300 ease-out"
          style={indicatorStyle}
        />
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div className={cn('flex gap-1.5 overflow-x-auto scrollbar-none', className)} role="tablist">
        {visibleItems.map(item => (
          <button
            key={item.id}
            role="tab"
            aria-selected={item.id === activeId}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex items-center gap-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
              size === 'sm' ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm',
              item.id === activeId
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/70',
              item.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge != null && (
              <span className={cn(
                'px-1.5 py-0.5 text-[10px] font-bold rounded-full',
                item.id === activeId ? 'bg-white/20 text-white' : badgeColors[item.badgeVariant || 'default']
              )}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Segmented (default)
  return (
    <div
      className={cn(
        'flex overflow-x-auto gap-1 p-1.5 bg-blue-100/85 backdrop-blur-xl rounded-2xl border border-blue-200 scrollbar-none shadow-2xs',
        fullWidth && 'w-full',
        className
      )}
      role="tablist"
    >
      {visibleItems.map(item => (
        <button
          key={item.id}
          role="tab"
          aria-selected={item.id === activeId}
          disabled={item.disabled}
          onClick={() => onChange(item.id)}
          className={cn(
            'flex items-center gap-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer active:scale-[0.97]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
            size === 'sm' ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-xs sm:text-sm',
            fullWidth && 'flex-1 justify-center',
            item.id === activeId
              ? 'bg-white text-[#1e3a8a] shadow-sm ring-1 ring-blue-300'
              : 'text-slate-600 hover:text-blue-900 hover:bg-white/75',
            item.disabled && 'opacity-40 cursor-not-allowed'
          )}
        >
          {item.icon && <span className="shrink-0">{item.icon}</span>}
          <span className="whitespace-nowrap">{item.label}</span>
          {item.badge != null && (
            <span className={cn(
              'px-1.5 py-0.5 text-[10px] font-bold rounded-full ml-0.5',
              item.id === activeId
                ? 'bg-[#1e3a8a] text-white'
                : badgeColors[item.badgeVariant || 'default']
            )}>
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
