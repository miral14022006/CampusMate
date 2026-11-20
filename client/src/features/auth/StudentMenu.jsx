import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LogIn, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { useOnClickOutside } from '../../lib/hooks';
import { popover } from '../../lib/motion';
import { cn } from '../../lib/cn';

export function StudentMenu({ collapsed = false, align = 'end', className = '', dropUp = false }) {
  const { user, isAuthenticated, isGuest, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false), open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!isAuthenticated) {
    if (collapsed) {
      return (
        <Link
          to="/login"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink"
          aria-label={isGuest ? 'Sign in to CampusMate' : 'Sign in'}
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
        </Link>
      );
    }
    return (
      <Link
        to="/login"
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-pill border border-hairline px-3 text-[11.5px] font-semibold text-ink-secondary transition-colors hover:border-accent hover:text-accent',
          className
        )}
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
        {isGuest ? 'Sign in to save chats' : 'Sign in'}
      </Link>
    );
  }

  const name = user?.name || user?.email || 'Student';

  const handleLogout = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpen(false);
    try {
      await logout();
    } catch {
      /* ignore */
    }
    window.location.href = '/login';
  };

  const handleProfileClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpen(false);
    navigate('/profile');
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-pill border border-transparent text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent',
          collapsed ? 'h-10 w-10 justify-center' : 'h-10 w-full px-2'
        )}
      >
        <Avatar name={name} size="sm" />
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold text-ink">{user?.name || 'Student'}</span>
              <span className="block truncate text-[10px] text-ink-muted">{user?.email}</span>
            </span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-ink-muted transition-transform', open && 'rotate-180')} aria-hidden="true" />
          </>
        ) : (
          <span className="sr-only">{name} menu</span>
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            aria-label="Student menu"
            variants={popover}
            initial="hidden"
            animate="show"
            exit="exit"
            className={cn(
              'absolute z-50 w-56 overflow-hidden rounded-md border border-hairline bg-surface-1 p-1.5 shadow-lift',
              dropUp ? 'bottom-full mb-2' : 'mt-2',
              align === 'end' ? 'right-0' : 'left-0'
            )}
          >
            <div className="px-2.5 py-2">
              <p className="truncate text-[12px] font-semibold text-ink">{user?.name || 'Student'}</p>
              <p className="truncate text-[10.5px] text-ink-muted">{user?.email}</p>
            </div>
            <Link
              role="menuitem"
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-[12px] text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink cursor-pointer"
            >
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              Profile
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-[12px] text-ink-secondary transition-colors hover:bg-negative-soft hover:text-[color:var(--negative)] cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default StudentMenu;
