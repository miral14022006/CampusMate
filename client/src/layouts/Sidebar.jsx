import { useId } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  History,
  LogOut,
  PanelLeftClose,
  Plus,
  X,
  Shield
} from 'lucide-react';
import Logo from '../components/brand/Logo';
import { Tooltip } from '../components/ui/Tooltip';
import { useAuth } from '../context/AuthContext';
import { StudentMenu } from '../features/auth/StudentMenu';
import { appLinks } from '../config/navigation';
import { prefetchRoute } from '../lib/prefetch';
import { cn } from '../lib/cn';
import { EASE } from '../lib/motion';

function SidebarNavLink({ to, label, icon: Icon, badge, collapsed, layoutId, onNavigate }) {
  const body = (
    <NavLink
      to={to}
      onClick={onNavigate}
      onMouseEnter={() => prefetchRoute(to)}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center gap-3 rounded-pill px-3 text-[13px] font-medium transition-colors duration-150',
          isActive ? 'text-white' : 'text-ink-secondary hover:text-ink',
          collapsed ? 'h-10 w-10 mx-auto justify-center p-0 rounded-full' : 'w-full'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId={layoutId}
              className={cn(
                'absolute inset-0 bg-[linear-gradient(100deg,var(--accent),var(--accent-strong))] shadow-[0_10px_24px_-14px_rgba(212,103,63,.9)]',
                collapsed ? 'rounded-full' : 'rounded-pill'
              )}
              transition={{ duration: 0.25, ease: EASE }}
            />
          ) : (
            <span
              className={cn(
                'absolute inset-0 bg-transparent transition-colors group-hover:bg-surface-2',
                collapsed ? 'rounded-full' : 'rounded-pill'
              )}
            />
          )}
          <Icon className="relative z-10 h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
          {!collapsed ? (
            <div className="relative z-10 flex flex-1 items-center justify-between min-w-0 pr-1">
              <span className="truncate">{label}</span>
              {badge && (
                <span className="rounded-pill bg-accent px-1.5 py-0.2 text-[9.5px] font-bold text-white uppercase tracking-wider">
                  {badge}
                </span>
              )}
            </div>
          ) : null}
          {collapsed ? <span className="sr-only">{label}</span> : null}
        </>
      )}
    </NavLink>
  );

  return collapsed ? (
    <div className="flex justify-center w-full my-0.5">
      <Tooltip label={badge ? `${label} (${badge})` : label} side="right" className="w-full justify-center">
        {body}
      </Tooltip>
    </div>
  ) : (
    body
  );
}

export function Sidebar({
  variant = 'chat',
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  children,
  onNewChat
}) {
  const layoutId = `sidebar-pill-${useId().replace(/:/g, '')}`;
  const { isAuthenticated, isAdmin, logout, user } = useAuth();

  // Filter links: show admin tabs only if authenticated admin
  const visibleLinks = appLinks.filter((link) => {
    if (link.requiresAdmin) return isAdmin;
    if (link.requiresAuth) return isAuthenticated;
    return true;
  });

  return (
    <>
      <aside
        className={cn(
          'hidden shrink-0 border-r border-hairline transition-[width] duration-200 ease-premium lg:block',
          collapsed ? 'w-[72px]' : 'w-[280px]'
        )}
      >
        <div className="flex h-full flex-col bg-[color:var(--sidebar)]">
          {/* Header */}
          <div
            className={cn(
              'flex items-center px-4 transition-all duration-200',
              collapsed ? 'h-24 flex-col justify-center gap-2 pt-2' : 'h-[68px] justify-between'
            )}
          >
            <a
              href="/"
              aria-label="Back to CampusMate landing page"
              className={cn(
                'flex items-center rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-accent hover:opacity-85 transition-opacity',
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

          {/* Navigation Area */}
          <nav className={cn('flex-1 overflow-y-auto px-3 pb-4 no-scrollbar', collapsed && 'pt-3')} aria-label="Sidebar Navigation">
            {/* New Chat Button */}
            <div className="mb-4">
              {collapsed ? (
                <div className="flex justify-center w-full">
                  <Tooltip label="New Chat" side="right" className="w-full justify-center">
                    <button
                      type="button"
                      onClick={onNewChat}
                      className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-[linear-gradient(100deg,var(--accent),var(--accent-strong))] text-white shadow-[0_10px_24px_-14px_rgba(212,103,63,.9)] transition-all hover:brightness-105 active:scale-[0.95]"
                      aria-label="New chat"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </Tooltip>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onNewChat}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-pill bg-[linear-gradient(100deg,var(--accent),var(--accent-strong))] text-[13px] font-semibold text-white shadow-[0_10px_24px_-14px_rgba(212,103,63,.9)] transition-all hover:brightness-105 active:scale-[0.99]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New Chat
                </button>
              )}
            </div>

            {/* Main App Links */}
            <div className="space-y-1 mb-4">
              {visibleLinks.map((item) => (
                <SidebarNavLink
                  key={item.id}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  badge={item.badge}
                  collapsed={collapsed}
                  layoutId={layoutId}
                  onNavigate={onCloseMobile}
                />
              ))}
            </div>

            {/* Chat History section */}
            {variant === 'chat' && children && (
              <>
                <div
                  className={cn(
                    'mb-1 flex h-8 items-center gap-2.5 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  <History className="h-[15px] w-[15px]" strokeWidth={1.5} aria-hidden="true" />
                  {!collapsed ? <span>Chat History</span> : <span className="sr-only">Chat History</span>}
                </div>
                {children}
              </>
            )}
          </nav>

          {/* Footer Area */}
          <div className={cn('relative z-20 space-y-2 border-t border-hairline px-3 py-3', collapsed && 'px-2')}>
            {variant === 'chat' ? (
              <StudentMenu collapsed={collapsed} dropUp={true} align={collapsed ? 'start' : 'end'} />
            ) : null}
            {/* Anonymous Student Admin Link or Admin User Badge */}
            {variant === 'admin' && !collapsed && !isAdmin && (
              <div className="pt-1 text-center">
                <NavLink
                  to="/admin/login"
                  className="text-[11px] text-ink-muted hover:text-ink transition-colors flex items-center justify-center gap-1"
                >
                  <Shield className="h-3 w-3" /> Staff login
                </NavLink>
              </div>
            )}
            {variant === 'admin' && !collapsed && isAuthenticated && (
              <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-ink-muted border-t border-hairline">
                <span className="truncate">{user?.username || 'Admin'}</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await logout();
                    } catch {
                      /* ignore */
                    }
                    window.location.assign('/admin/login');
                  }}
                  className="text-[color:var(--negative)] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <LogOut className="h-3 w-3" /> Logout
                </button>
              </div>
            )}
            {variant === 'admin' && collapsed && isAuthenticated && (
              <div className="flex justify-center w-full">
                <Tooltip label={`Sign out (${user?.username || 'Admin'})`} side="right" className="w-full justify-center">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await logout();
                      } catch {
                        /* ignore */
                      }
                      window.location.assign('/admin/login');
                    }}
                    className="flex h-10 w-10 mx-auto items-center justify-center rounded-full text-ink-muted hover:bg-negative-soft hover:text-[color:var(--negative)] transition-colors cursor-pointer"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </button>
                </Tooltip>
              </div>
            )}
            {variant === 'admin' && collapsed && !isAuthenticated && (
              <div className="flex justify-center w-full">
                <Tooltip label="Staff login" side="right" className="w-full justify-center">
                  <NavLink
                    to="/admin/login"
                    className="flex h-10 w-10 mx-auto items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
                    aria-label="Staff login"
                  >
                    <Shield className="h-4 w-4" />
                  </NavLink>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (History / Menu) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[color:var(--scrim)] backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-[84%] max-w-sm bg-app p-4 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <Logo size="sm" />
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-full p-1.5 text-ink-muted hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pt-3">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
