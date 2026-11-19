import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/brand/Logo';

export function AuthSkeleton({ label = 'Restoring your session…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-6" role="status" aria-live="polite">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <Logo variant="mark" size="lg" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded-full bg-surface-2" />
            <div className="h-2.5 w-48 animate-pulse rounded-full bg-surface-2" />
          </div>
        </div>
        <div className="mt-8 space-y-3" aria-hidden="true">
          <div className="h-12 animate-pulse rounded-md bg-surface-1" />
          <div className="h-12 animate-pulse rounded-md bg-surface-1" />
          <div className="h-11 w-32 animate-pulse rounded-pill bg-surface-2" />
        </div>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

export function nextFromLocation(location) {
  const params = new URLSearchParams(location.search);
  const next = params.get('next') || location.state?.from?.pathname;
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return null;
}

/**
 * Public student surface: guests are welcome when GUEST_MODE is on, students are
 * always welcome. Administrators can also use the student app.
 */
export function ProtectedRoute({ children, allowGuest = true }) {
  const { status, isAuthenticated, isGuest } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <AuthSkeleton />;
  if (isAuthenticated) return children;
  if (allowGuest && isGuest) return children;

  return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
}

/**
 * Role-aware gate for admin screens. `roles` defaults to admin + superadmin.
 * Guests and students never see an admin surface.
 */
export function RoleGate({ children, roles = ['admin', 'superadmin'], superadminOnly = false, fallback = null }) {
  const { status, isAuthenticated, isAdmin, isSuperadmin, role } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <AuthSkeleton label="Checking permissions…" />;
  if (!isAuthenticated) {
    return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (superadminOnly && !isSuperadmin) {
    return fallback || <Navigate to="/admin/dashboard?denied=superadmin" replace />;
  }
  if (!isAdmin || (roles.length && !roles.includes(role))) {
    return fallback || <Navigate to="/app?denied=admin" replace />;
  }
  return children;
}

export function hasRole(user, roles = []) {
  return Boolean(user && roles.includes(user.role));
}
