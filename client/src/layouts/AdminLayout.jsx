import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, ChevronRight, LogOut } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import AnimatedOutlet from '../components/AnimatedOutlet';
import DashboardFilters from '../features/admin/dashboard/DashboardFilters';
import { useAdminAuth } from '../context/AuthContext';
import { api } from '../services/api';

const CRUMBS = {
  '/admin': 'Dashboard',
  '/admin/dashboard': 'Dashboard',
  '/admin/students': 'Students',
  '/admin/documents': 'Documents',
  '/admin/chats': 'Chats',
  '/admin/activity': 'Activity',
  '/admin/review': 'Review Queue',
  '/admin/dates': 'Dates & Events',
  '/admin/team': 'Administrative Team',
  '/admin/audit': 'Security Audit Log'
};

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cm_admin_sidebar_collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [nlpStatus, setNlpStatus] = useState('checking');
  const location = useLocation();
  const { user, logout } = useAdminAuth();

  useEffect(() => {
    let mounted = true;
    const checkHealth = () => {
      fetch('/health')
        .then((res) => res.json())
        .then((data) => {
          if (mounted) {
            setNlpStatus(data.status === 'ok' ? 'operational' : (data.nlp === 'ok' ? 'operational' : 'degraded'));
          }
        })
        .catch(() => {
          if (mounted) setNlpStatus('degraded');
        });
    };
    checkHealth();
    const timer = setInterval(checkHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('cm_admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const crumb = CRUMBS[location.pathname] || 'Dashboard';
  const displayName = user?.name || user?.username || user?.email || 'Staff';
  const roleLabel = user?.role === 'superadmin' ? 'Superadmin' : 'Admin';

  return (
    <div className="flex min-h-screen bg-app">
      {/* Dedicated Left Admin Navigation Panel */}
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-hairline bg-app/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-full p-1.5 text-ink-secondary hover:bg-surface-2 hover:text-ink lg:hidden"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs">
              <Link to="/admin/dashboard" className="font-semibold text-ink-muted hover:text-ink">
                Admin
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-ink-muted" />
              <span className="font-semibold text-accent">{crumb}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Operational Status Pill */}
            {nlpStatus === 'operational' ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-pill bg-positive-soft px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--positive)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--positive)] animate-pulse" />
                Operational
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-pill bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--warning)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--warning)]" />
                Degraded
              </span>
            )}

            {/* User Profile info and logout */}
            <div className="flex items-center gap-2 border-l border-hairline pl-3 text-xs">
              <span className="hidden text-right md:block">
                <span className="block max-w-[150px] truncate text-[11.5px] font-semibold text-ink">{displayName}</span>
                <span className="block text-[9.5px] uppercase tracking-[0.08em] text-ink-muted">{roleLabel}</span>
              </span>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  window.location.assign('/admin/login');
                }}
                className="rounded-full p-1.5 text-ink-muted hover:bg-negative-soft hover:text-[color:var(--negative)] transition-colors"
                aria-label="Logout from administrative console"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Global Dashboard Filters */}
        <DashboardFilters />

        {/* Main Routed Admin Content */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8" id="main-content">
          <AnimatedOutlet />
        </main>

        {/* Footer with Version & Commit Stamp */}
        <footer className="border-t border-hairline py-3 px-6 text-center text-[10.5px] text-ink-muted">
          <span>
            CampusMate v2.0 • Commit{' '}
            <code className="font-mono font-medium text-ink" title={import.meta.env.VITE_GIT_SHA || 'unknown'}>
              {(import.meta.env.VITE_GIT_SHA || 'unknown').slice(0, 7)}
            </code>{' '}
            • Built {import.meta.env.VITE_BUILD_TIME || 'unknown'}
          </span>
        </footer>
      </div>
    </div>
  );
}

export default AdminLayout;
