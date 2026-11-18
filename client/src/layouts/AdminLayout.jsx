import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, ChevronRight, LogOut, Shield } from 'lucide-react';
import Sidebar from './Sidebar';
import Logo from '../components/brand/Logo';
import AnimatedOutlet from '../components/AnimatedOutlet';
import AdminTabsNav from './nav/AdminTabsNav';
import { useAdminAuth } from '../context/AuthContext';

const CRUMBS = {
  '/admin': 'Dashboard',
  '/admin/documents': 'Documents',
  '/admin/analytics': 'Analytics',
  '/admin/feedback': 'Review Queue',
  '/admin/cache': 'Cache & Latency',
  '/admin/settings': 'Settings'
};

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cm_admin_sidebar_collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAdminAuth();

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('cm_admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const crumb = CRUMBS[location.pathname] || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-app">
      <Sidebar
        variant="admin"
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar with Breadcrumbs, Live Status pill, Theme & User Menu */}
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
              <Link to="/admin" className="font-semibold text-ink-muted hover:text-ink">
                Admin
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-ink-muted" />
              <span className="font-semibold text-accent">{crumb}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Operational Status Pill */}
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-pill bg-positive-soft px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--positive)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--positive)] animate-pulse" />
              Operational
            </span>

            {/* User Profile info and logout */}
            <div className="flex items-center gap-2 border-l border-hairline pl-3 text-xs">
              <span className="hidden md:inline font-medium text-ink truncate max-w-[120px]">
                {user?.username || 'Staff'}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-full p-1.5 text-ink-muted hover:bg-negative-soft hover:text-[color:var(--negative)] transition-colors"
                aria-label="Logout from administrative console"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Admin Tabs Bar */}
        <AdminTabsNav />

        {/* Content View */}
        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8" id="main-content">
          <AnimatedOutlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
