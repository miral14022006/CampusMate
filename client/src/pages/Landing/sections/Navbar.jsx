import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Menu,
  X,
  UserRound,
  LogOut
} from 'lucide-react';
import Logo from '../../../components/brand/Logo';
import { Button } from '../../../components/ui/Button';
import { StudentMenu } from '../../../features/auth/StudentMenu';
import { useAuth } from '../../../context/AuthContext';
import { landingLinks } from '../../../config/navigation';
import { prefetchRoute } from '../../../lib/prefetch';
import { DURATION, EASE } from '../../../lib/motion';
import { cn } from '../../../lib/cn';

/**
 * Floating Navbar:
 * - Drops in from -24px as hero/overlay sequence initiates
 * - Glass pill with theme toggle and dropdown inside
 */
export function Navbar({ activeLinkId = 'home', introFinished = true }) {
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState(null);
  const { isAuthenticated, user, logout } = useAuth();

  const navRef = useRef(null);
  const dropdownRef = useRef(null);

  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleNavClick = (e, item) => {
    if (location.pathname === '/' || location.pathname === '') {
      let targetId = null;

      if (item.id === 'calendar') {
        targetId = 'dates';
      } else if (item.to && item.to.startsWith('/#')) {
        targetId = item.to.replace('/#', '');
      }

      if (targetId) {
        e.preventDefault();
        const el = document.getElementById(targetId);
        if (el) {
          // If scrolling to the top hero section
          if (targetId === 'home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            // For sections, scroll element exactly to viewport top (scenes already have top padding for the floating nav)
            const targetTop = el.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({ top: targetTop, behavior: 'smooth' });
          }
          window.history.pushState(null, '', `#${targetId}`);
        }
        setMobileOpen(false);
        return;
      }
    }
    setMobileOpen(false);
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to content
      </a>

      {/* Floating Navbar Container */}
      <header className="fixed top-4 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
        <motion.nav
          ref={navRef}
          aria-label="Primary"
          initial={{ y: -24, opacity: 0 }}
          animate={{
            y: introFinished ? 0 : -24,
            opacity: introFinished ? 1 : 0,
            scale: scrolled ? 0.97 : 1,
            backgroundColor: scrolled ? 'rgba(20, 20, 20, 0.88)' : 'rgba(22, 22, 22, 0.72)',
            boxShadow: scrolled
              ? '0 12px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
              : '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
          }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{ originY: 0 }}
          className={cn(
            'pointer-events-auto relative flex h-16 w-full max-w-[1120px] 2xl:max-w-[1280px] items-center justify-between rounded-full border border-[rgba(255,255,255,0.08)] px-4 sm:px-6 backdrop-blur-[18px] backdrop-saturate-[1.2]'
          )}
        >
          {/* Logo (left) */}
          <Link
            to="/#home"
            onClick={(e) => handleNavClick(e, { id: 'home', to: '/#home' })}
            className="flex items-center gap-2 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-accent"
            aria-label="CampusMate home"
          >
            <Logo size="sm" />
          </Link>

          {/* Right-aligned Navigation Links & CTA (Vertically Centered) */}
          <div className="hidden lg:flex items-center gap-1.5 ml-auto">
            {landingLinks.map((item) => {
              const isActive = activeLinkId === item.id;
              const isHovered = hoveredLink === item.id;

              return (
                <a
                  key={item.id}
                  href={item.to}
                  onClick={(e) => handleNavClick(e, item)}
                  onMouseEnter={() => {
                    setHoveredLink(item.id);
                    if (item.to.startsWith('/')) prefetchRoute(item.to);
                  }}
                  onMouseLeave={() => setHoveredLink(null)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3.5 py-1.5 text-[13.5px] font-medium transition-colors rounded-full outline-none focus-visible:outline-2 focus-visible:outline-accent',
                    isActive ? 'text-white' : 'text-ink-secondary hover:text-ink'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-full bg-surface-2 border border-hairline"
                      transition={{ duration: DURATION.base, ease: EASE }}
                    />
                  )}
                  {isHovered && !isActive && (
                    <motion.div
                      layoutId="nav-hover-pill"
                      className="absolute inset-0 rounded-full bg-surface-2/50"
                      transition={{ duration: DURATION.fast, ease: EASE }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                  {item.badge && (
                    <span className="relative z-10 rounded-pill bg-accent px-1.5 py-0.2 text-[9.5px] font-bold text-white uppercase tracking-wider">
                      {item.badge}
                    </span>
                  )}
                </a>
              );
            })}

            {/* Start Chatting CTA & Student Profile on the far right */}
            <div className="flex items-center gap-3 pl-2">
              <Link to="/app" className="inline-flex min-h-[44px] items-center">
                <Button
                  size="sm"
                  className="h-9 px-4 text-[13px] font-semibold"
                  rightIcon={<ArrowRight className="cm-btn-arrow h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Start Chatting
                </Button>
              </Link>
              {isAuthenticated ? (
                <StudentMenu />
              ) : (
                <Link
                  to="/login"
                  className="text-[13px] font-semibold text-ink-secondary hover:text-accent transition-colors"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>

          {/* Right Mobile Actions */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link to="/app" className="inline-flex min-h-[44px] items-center">
              <Button
                size="sm"
                className="h-8 px-3 text-[12px]"
                rightIcon={<ArrowRight className="cm-btn-arrow h-3 w-3" aria-hidden="true" />}
              >
                Chat
              </Button>
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-surface-2 text-ink hover:text-accent transition-colors outline-none focus-visible:outline-2 focus-visible:outline-accent"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </motion.nav>
      </header>

      {/* Mobile Navigation Sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: DURATION.base, ease: EASE }}
            className="fixed inset-x-4 top-24 z-50 rounded-3xl border border-hairline bg-[#181818]/98 p-6 shadow-2xl backdrop-blur-2xl lg:hidden max-h-[calc(100svh-120px)] overflow-y-auto"
          >
            <div className="space-y-4">
              {isAuthenticated ? (
                <div className="rounded-2xl border border-hairline bg-surface-2 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink flex items-center gap-1.5 truncate">
                      <UserRound className="h-4 w-4 text-accent shrink-0" />
                      <span className="truncate">{user?.name || user?.email || 'Student'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        setMobileOpen(false);
                        try {
                          await logout();
                        } catch {
                          /* ignore */
                        }
                        window.location.assign('/login');
                      }}
                      className="text-xs text-[color:var(--negative)] font-medium hover:underline flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                    >
                      <LogOut className="h-3 w-3" /> Logout
                    </button>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Link
                      to="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 rounded-pill bg-surface-1 border border-hairline py-1.5 text-xs font-semibold text-ink text-center hover:bg-surface-3 transition-colors"
                    >
                      My Profile
                    </Link>
                  </div>
                </div>
              ) : null}

              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                Navigation
              </p>
              <div className="space-y-1">
                {landingLinks.map((item) => (
                  <a
                    key={item.id}
                    href={item.to}
                    onClick={(e) => handleNavClick(e, item)}
                    className="flex min-h-[48px] items-center justify-between rounded-xl px-4 py-2.5 text-[15px] font-semibold text-ink hover:bg-surface-2 hover:text-accent transition-colors"
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="rounded-pill bg-accent px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                        {item.badge}
                      </span>
                    )}
                  </a>
                ))}
              </div>

              <div className="pt-4 border-t border-hairline space-y-3">
                <Link to="/app" onClick={() => setMobileOpen(false)} className="w-full block">
                  <Button className="w-full h-12 text-[14.5px]">
                    Start Chatting
                  </Button>
                </Link>
                {!isAuthenticated && (
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="w-full block">
                    <Button variant="secondary" className="w-full h-12 text-[14.5px]">
                      Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
