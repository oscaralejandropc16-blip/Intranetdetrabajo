import React, { useState, useEffect } from 'react';
import { cn } from './cn';
import { ChevronLeft, ChevronRight, MoreHorizontal, X } from 'lucide-react';

/* ─── Types ─────────────────────────────────────────── */

export interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeColor?: 'blue' | 'indigo' | 'rose' | 'emerald' | 'cyan';
  hidden?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface AppShellProps {
  /** Grouped navigation items for the sidebar */
  navigation: NavGroup[];
  /** Currently active view ID */
  activeView: string;
  /** Called when user clicks a nav item */
  onNavigate: (id: string) => void;
  /** Main content */
  children: React.ReactNode;
  /** Items to show in the mobile bottom nav (max 4-5, rest go to "more" sheet) */
  bottomNavIds?: string[];
  /** Optional custom title or indicator above sidebar items */
  sidebarHeader?: React.ReactNode;
}

const badgeClasses: Record<string, string> = {
  blue: 'bg-blue-600 text-white',
  indigo: 'bg-indigo-600 text-white',
  rose: 'bg-rose-500 text-white',
  emerald: 'bg-emerald-500 text-white',
  cyan: 'bg-cyan-500 text-white',
};

/* ─── Desktop Sidebar ───────────────────────────────── */

function DesktopSidebar({
  navigation,
  activeView,
  onNavigate,
  collapsed,
  onToggle,
  sidebarHeader,
}: {
  navigation: NavGroup[];
  activeView: string;
  onNavigate: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  sidebarHeader?: React.ReactNode;
}) {
  return (
    <aside
      className={cn(
        'hidden md:flex flex-col fixed top-[56px] sm:top-[60px] left-0 h-[calc(100vh-56px)] sm:h-[calc(100vh-60px)] z-30',
        'bg-gradient-to-b from-[#172554] via-[#1b3276] to-[#1e3a8a] border-r border-blue-900/60 shadow-xl shadow-blue-950/20 text-white',
        'transition-all duration-300 ease-out select-none',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Optional sidebar header / context indicator */}
      {sidebarHeader && !collapsed && (
        <div className="px-4 py-3 border-b border-white/10 bg-white/5">
          {sidebarHeader}
        </div>
      )}

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4 scrollbar-none">
        {navigation.map(group => {
          const visibleItems = group.items.filter(i => !i.hidden);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-bold text-sky-200/75 uppercase tracking-widest px-2.5 mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {visibleItems.map(item => {
                  const isActive = item.id === activeView;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'w-full flex items-center gap-2.5 rounded-xl transition-all duration-180 cursor-pointer group/nav relative',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60',
                        collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                        isActive
                          ? 'bg-white text-[#1e3a8a] font-bold border border-white shadow-md shadow-blue-950/25'
                          : 'text-blue-100/90 hover:text-white hover:bg-white/12 font-medium border border-transparent'
                      )}
                    >
                      <span className={cn(
                        'shrink-0 w-5 h-5 flex items-center justify-center transition-colors',
                        isActive ? '[&_svg]:!text-blue-700 text-blue-700' : 'text-sky-300 group-hover/nav:text-white'
                      )}>
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <>
                          <span className={cn(
                            'text-xs truncate tracking-tight',
                            isActive ? 'text-[#1e3a8a] font-extrabold' : 'text-blue-50 group-hover/nav:text-white'
                          )}>
                            {item.label}
                          </span>
                          {item.badge != null && (
                            <span className={cn(
                              'ml-auto px-1.5 py-0.5 text-[10px] font-extrabold rounded-full shrink-0 shadow-2xs',
                              badgeClasses[item.badgeColor || 'blue']
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && item.badge != null && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-[#172554]" />
                      )}
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 bg-sky-500 rounded-r-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/10 p-2.5 shrink-0 bg-black/15">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-100">
              <ChevronLeft className="w-4 h-4" />
              <span>Colapsar Menú</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}

/* ─── Mobile Bottom Navigation ──────────────────────── */

function MobileBottomNav({
  navigation,
  activeView,
  onNavigate,
  bottomNavIds,
}: {
  navigation: NavGroup[];
  activeView: string;
  onNavigate: (id: string) => void;
  bottomNavIds?: string[];
}) {
  const [showMore, setShowMore] = useState(false);

  const allItems = navigation.flatMap(g => g.items).filter(i => !i.hidden);

  // Bottom bar shows up to 4 pinned items + "Más" button
  const pinnedIds = bottomNavIds || allItems.slice(0, 4).map(i => i.id);
  const pinnedItems = pinnedIds.map(id => allItems.find(i => i.id === id)).filter(Boolean) as NavItem[];
  const overflowItems = allItems.filter(i => !pinnedIds.includes(i.id));
  const hasOverflow = overflowItems.length > 0;
  const isActiveInOverflow = overflowItems.some(i => i.id === activeView);

  return (
    <>
      {/* Bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/92 backdrop-blur-2xl border-t border-blue-100/90 safe-area-pb shadow-xl shadow-blue-950/10">
        <div className="flex items-stretch h-[60px]">
          {pinnedItems.map(item => {
            const isActive = item.id === activeView;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setShowMore(false); }}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer relative py-1',
                  'active:bg-blue-50',
                  isActive ? 'text-blue-600' : 'text-slate-400'
                )}
              >
                <span className={cn('w-5 h-5 flex items-center justify-center', isActive && 'text-blue-600')}>
                  {item.icon}
                </span>
                <span className={cn('text-[10px] font-bold leading-none', isActive ? 'text-blue-700' : 'text-slate-500')}>
                  {item.shortLabel || item.label.split(' ')[0]}
                </span>
                {item.badge != null && (
                  <span className="absolute top-1 right-1/4 min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-black text-white bg-rose-500 rounded-full">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2.5px] bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" />
                )}
              </button>
            );
          })}

          {/* More button */}
          {hasOverflow && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer relative py-1',
                'active:bg-slate-100',
                isActiveInOverflow || showMore ? 'text-blue-600' : 'text-slate-400'
              )}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                {showMore ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
              </span>
              <span className={cn('text-[10px] font-bold leading-none', (isActiveInOverflow || showMore) ? 'text-blue-600' : 'text-slate-500')}>
                Más
              </span>
              {isActiveInOverflow && !showMore && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2.5px] bg-blue-600 rounded-full" />
              )}
            </button>
          )}
        </div>
      </nav>

      {/* More sheet (mobile) */}
      {showMore && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setShowMore(false)}
          />
          <div className="md:hidden fixed bottom-[60px] left-0 right-0 z-50 bg-white/98 rounded-t-3xl shadow-2xl border-t border-blue-100 animate-in slide-in-from-bottom duration-200 safe-area-pb max-h-[65vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center pt-1 pb-2">
              Más Opciones y Módulos
            </p>
            <div className="grid grid-cols-3 gap-2 p-3 pb-4">
              {overflowItems.map(item => {
                const isActive = item.id === activeView;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setShowMore(false); }}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl transition-all cursor-pointer text-center',
                      'active:scale-95',
                      isActive
                        ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-500/40 shadow-xs'
                        : 'text-slate-700 hover:bg-slate-50 border border-slate-100'
                    )}
                  >
                    <span className={cn('w-5 h-5 flex items-center justify-center', isActive ? 'text-blue-600' : 'text-slate-500')}>
                      {item.icon}
                    </span>
                    <span className="text-[11px] font-bold leading-tight">
                      {item.shortLabel || item.label}
                    </span>
                    {item.badge != null && (
                      <span className={cn(
                        'px-1.5 py-0.5 text-[9px] font-black rounded-full',
                        badgeClasses[item.badgeColor || 'blue']
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ─── App Shell (Main Layout) ───────────────────────── */

export function AppShell({
  navigation,
  activeView,
  onNavigate,
  children,
  bottomNavIds,
  sidebarHeader,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('rd_sidebar_collapsed') === 'true';
    } catch { return false; }
  });

  useEffect(() => {
    try {
      localStorage.setItem('rd_sidebar_collapsed', sidebarCollapsed ? 'true' : 'false');
    } catch { }
  }, [sidebarCollapsed]);

  return (
    <div className="w-full relative min-h-[calc(100vh-60px)]">
      {/* Desktop Sidebar */}
      <DesktopSidebar
        navigation={navigation}
        activeView={activeView}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        sidebarHeader={sidebarHeader}
      />

      {/* Main content area */}
      <div className={cn(
        'transition-all duration-300 w-full',
        sidebarCollapsed ? 'md:pl-[68px]' : 'md:pl-[240px]'
      )}>
        <div className="p-3 sm:p-5 lg:p-7 max-w-[1440px] mx-auto w-full pb-24 md:pb-12">
          {children}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        navigation={navigation}
        activeView={activeView}
        onNavigate={onNavigate}
        bottomNavIds={bottomNavIds}
      />
    </div>
  );
}

export default AppShell;
