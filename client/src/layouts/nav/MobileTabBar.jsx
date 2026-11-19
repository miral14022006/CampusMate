import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Calendar,
  History,
  Menu as MenuIcon,
  X,
  Shield,
  LogOut
} from 'lucide-react';

import { useAdminAuth } from '../../context/AuthContext';
import { EASE } from '../../lib/motion';
import { cn } from '../../lib/cn';

export function MobileTabBar({ onToggleHistory }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAdminAuth();

  // Detect virtual keyboard opening to hide bottom bar
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const isKeyboard = window.visualViewport.height < window.innerHeight - 150;
        setKeyboardVisible(isKeyboard);
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  // Close sheet on route changes
  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname]);

  if (keyboardVisible) return null;

  return (
    <>
      <nav
        aria-label="Mobile Navigation Bar"
        className="fixed bottom-0 inset-x-0 z-40 h-14 bg-surface-1/95 backdrop-blur-md border-t border-hairline flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] md:hidden shadow-lg"
      >
        {/* Chat tab */}
        <NavLink
          to="/app"
          className={({ isActive }) =>
            cn(
              'relative flex flex-col items-center justify-center flex-1 h-full py-1 text-[10.5px] font-medium transition-colors',
              isActive ? 'text-accent font-semibold' : 'text-ink-muted hover:text-ink'
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="mobile-tab-indicator"
                  className="absolute top-0 inset-x-4 h-[2px] rounded-full bg-accent"
                  transition={{ duration: 0.25, ease: EASE }}
                />
              )}
              <MessageSquare className="h-5 w-5 mb-0.5" />
              <span>Chat</span>
            </>
          )}
        </NavLink>

        {/* History trigger tab */}
        <button
          type="button"
          onClick={onToggleHistory}
          className="relative flex flex-col items-center justify-center flex-1 h-full py-1 text-[10.5px] font-medium text-ink-muted hover:text-ink transition-colors"
        >
          <History className="h-5 w-5 mb-0.5" />
          <span>History</span>
        </button>

        {/* Dates tab */}
        <NavLink
          to="/calendar"
          className={({ isActive }) =>
            cn(
              'relative flex flex-col items-center justify-center flex-1 h-full py-1 text-[10.5px] font-medium transition-colors',
              isActive ? 'text-accent font-semibold' : 'text-ink-muted hover:text-ink'
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="mobile-tab-indicator"
                  className="absolute top-0 inset-x-4 h-[2px] rounded-full bg-accent"
                  transition={{ duration: 0.25, ease: EASE }}
                />
              )}
              <div className="relative">
                <Calendar className="h-5 w-5 mb-0.5" />
                <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-accent" />
              </div>
              <span>Dates</span>
            </>
          )}
        </NavLink>

        {/* Menu sheet toggle */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(
            'relative flex flex-col items-center justify-center flex-1 h-full py-1 text-[10.5px] font-medium transition-colors',
            sheetOpen ? 'text-accent font-semibold' : 'text-ink-muted hover:text-ink'
          )}
        >
          <MenuIcon className="h-5 w-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Bottom Sheet Menu */}
      <AnimatePresence>
        {sheetOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              className="absolute inset-0 bg-[color:var(--scrim)] backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Settings and options menu"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: EASE }}
              className="absolute bottom-0 inset-x-0 rounded-t-2xl border-t border-hairline bg-surface-1 p-5 shadow-2xl safe-area-inset"
            >
              <div className="flex items-center justify-between pb-3 border-b border-hairline">
                <h3 className="text-sm font-bold text-ink">Preferences & Shortcuts</h3>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="rounded-full p-1 text-ink-muted hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                {/* Admin Access / Status */}
                {isAuthenticated ? (
                  <div className="rounded-lg border border-hairline bg-surface-2 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink flex items-center gap-1.5">
                        <Shield className="h-4 w-4 text-accent" /> Admin: {user?.username || 'Staff'}
                      </span>
                      <button
                        type="button"
                        onClick={logout}
                        className="text-xs text-[color:var(--negative)] font-medium hover:underline flex items-center gap-1"
                      >
                        <LogOut className="h-3 w-3" /> Logout
                      </button>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => navigate('/admin')}
                        className="flex-1 rounded-sm bg-accent py-1.5 text-xs font-semibold text-white text-center"
                      >
                        Admin Dashboard
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-hairline">
                    <NavLink
                      to="/admin/login"
                      className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1.5"
                    >
                      <Shield className="h-3.5 w-3.5" /> Staff / Admin Login
                    </NavLink>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default MobileTabBar;
