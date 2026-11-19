import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  LogOut,
  PanelLeftClose,
  X,
  LayoutDashboard,
  Users,
  FileText,
  MessagesSquare,
  Activity,
  ClipboardCheck,
  CalendarDays,
  UsersRound,
  ScrollText
} from 'lucide-react';
import Logo from '../components/brand/Logo';
import { Tooltip } from '../components/ui/Tooltip';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { cn } from '../lib/cn';
import { EASE } from '../lib/motion';

export const ADMIN_SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', to: '/admin/dashboard', end: true, icon: LayoutDashboard },
  { id: 'students', label: 'Students', to: '/admin/students', icon: Users },
  { id: 'documents', label: 'Documents', to: '/admin/documents', icon: FileText, badgeKey: 'documents' },
  { id: 'chats', label: 'Chats', to: '/admin/chats', icon: MessagesSquare },
  { id: 'activity', label: 'Activity', to: '/admin/activity', icon: Activity },
  { id: 'review', label: 'Review', to: '/admin/review', icon: ClipboardCheck, badgeKey: 'review' },
  { id: 'dates', label: 'Dates', to: '/admin/dates', icon: CalendarDays, badgeKey: 'dates' },
  { id: 'team', label: 'Team', to: '/admin/team', icon: UsersRound, superadminOnly: true },
  { id: 'audit', label: 'Audit', to: '/admin/audit', icon: ScrollText, superadminOnly: true }
];

export function AdminSidebar({
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile
}) {
  const location = useLocation();
  const { user, role, logout } = useAuth();
  const [counts, setCounts] = useState({ documents: 0, review: 0, dates: 0 });

  useEffect(() => {
    let cancelled = false;

    async function fetchBadgeCounts() {
      try {
        const [docsRes, fbRes, calRes] = await Promise.allSettled([
          api.admin.documents.list(),
          api.admin.feedback.queue({ status: 'pending' }),
          api.admin.calendar.listPending({ status: 'pending' })
        ]);
        if (cancelled) return;
        setCounts({
          documents: docsRes.status === 'fulfilled' ? (docsRes.value?.total ?? docsRes.value?.count ?? docsRes.value?.documents?.length ?? 0) : 0,
          review: fbRes.status === 'fulfilled' ? (fbRes.value?.total ?? fbRes.value?.queue?.length ?? fbRes.value?.items?.length ?? 0) : 0,
          dates: calRes.status === 'fulfilled' ? (calRes.value?.total ?? calRes.value?.events?.length ?? 0) : 0
        });
      } catch (err) {
        console.warn('Failed to load admin badge counts:', err);
      }
    }

    fetchBadgeCounts();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const visibleItems = ADMIN_SIDEBAR_ITEMS.filter((item) => !item.superadminOnly || role === 'superadmin');

  return (
    <>
      <aside
        className={cn(
          'hidden shrink-0 border-r border-hairline transition-[width] duration-200 ease-premium lg:block',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        <div className="flex h-full flex-col bg-[color:var(--sidebar)]">
          {/* Header */}
          <div
            className={cn(
              'flex items-center px-4 transition-all duration-200 border-b border-hairline',
              collapsed ? 'h-20 flex-col justify-center gap-1.5' : 'h-[64px] justify-between'
            )}
          >
            <a
              href="/admin/dashboard"
              aria-label="CampusMate Admin Console"
              className={cn(
                'flex items-center rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-accent hover:opacity-90 transition-opacity',
                collapsed && 'h-10 w-10 justify-center p-0'
              )}
            >
              <Logo variant={collapsed ? 'mark' : 'full'} size={collapsed ? 36 : 'md'} />
            </a>
            {!collapsed ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Expand sidebar"
              >
                <ChevronLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Navigation Links on Left Panel */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 no-scrollbar" aria-label="Admin Navigation Panel">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
              const badgeCount = item.badgeKey ? counts[item.badgeKey] : null;

              const linkContent = (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end={item.end}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex h-11 items-center gap-3 rounded-xl px-3.5 text-[13.5px] font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    active ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white hover:bg-surface-2',
                    collapsed ? 'h-11 w-11 mx-auto justify-center p-0 rounded-xl' : 'w-full'
                  )}
                >
                  {active ? (
                    <motion.div
                      layoutId="admin-sidebar-active-pill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent to-accent-strong shadow-md"
                      transition={{ duration: 0.25, ease: EASE }}
                    />
                  ) : null}

                  <Icon className="relative z-10 h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />

                  {!collapsed ? (
                    <div className="relative z-10 flex flex-1 items-center justify-between min-w-0 pr-1">
                      <span className="truncate">{item.label}</span>
                      {badgeCount != null && badgeCount > 0 ? (
                        <span className={cn(
                          'rounded-pill px-2 py-0.5 text-[11px] font-bold shadow-xs',
                          active ? 'bg-black/35 text-white' : 'bg-accent/20 text-accent'
                        )}>
                          {badgeCount}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </NavLink>
              );

              return collapsed ? (
                <div key={item.id} className="flex justify-center w-full my-1">
                  <Tooltip label={badgeCount != null && badgeCount > 0 ? `${item.label} (${badgeCount})` : item.label} side="right">
                    {linkContent}
                  </Tooltip>
                </div>
              ) : (
                linkContent
              );
            })}
          </nav>

          {/* Footer with Admin User Profile & Sign Out */}
          <div className={cn('border-t border-hairline p-3', collapsed && 'px-2')}>
            {!collapsed ? (
              <div className="rounded-xl border border-white/10 bg-surface-1/70 p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-white">
                      {user?.name || user?.email || 'Admin'}
                    </p>
                    <span className="inline-block text-[10.5px] font-medium uppercase tracking-wider text-accent">
                      {role === 'superadmin' ? 'Superadmin' : 'Staff Admin'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      window.location.assign('/admin/login');
                    }}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-negative-soft hover:text-[color:var(--negative)] transition-colors"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center w-full">
                <Tooltip label={`Sign out (${user?.email || 'Admin'})`} side="right">
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      window.location.assign('/admin/login');
                    }}
                    className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl text-zinc-400 hover:bg-negative-soft hover:text-[color:var(--negative)] transition-colors"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-[84%] max-w-sm bg-[color:var(--sidebar)] p-4 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <Logo size="sm" />
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-full p-1.5 text-zinc-400 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto pt-4 space-y-1.5" aria-label="Mobile Admin Navigation">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
                const badgeCount = item.badgeKey ? counts[item.badgeKey] : null;

                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.end}
                    onClick={onCloseMobile}
                    className={cn(
                      'flex h-11 items-center justify-between rounded-xl px-3.5 text-[14px] font-medium transition-colors',
                      active ? 'bg-accent text-white font-semibold' : 'text-zinc-400 hover:text-white hover:bg-surface-2'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                    {badgeCount != null && badgeCount > 0 ? (
                      <span className={cn(
                        'rounded-pill px-2 py-0.5 text-[11px] font-bold',
                        active ? 'bg-black/30 text-white' : 'bg-accent/20 text-accent'
                      )}>
                        {badgeCount}
                      </span>
                    ) : null}
                  </NavLink>
                );
              })}
            </nav>
            <div className="pt-3 border-t border-hairline">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  window.location.assign('/admin/login');
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-negative-soft text-[13.5px] font-semibold text-[color:var(--negative)]"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminSidebar;
