import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminTabs } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { EASE } from '../../lib/motion';
import { cn } from '../../lib/cn';

export function AdminTabsNav() {
  const location = useLocation();
  const { role } = useAuth();
  const [counts, setCounts] = useState({ documents: null, review: null, dates: null });

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
          documents: docsRes.status === 'fulfilled' ? docsRes.value?.count ?? null : null,
          review: fbRes.status === 'fulfilled' ? fbRes.value?.queue?.length ?? null : null,
          dates: calRes.status === 'fulfilled' ? calRes.value?.total ?? calRes.value?.events?.length ?? null : null
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

  const visible = adminTabs.filter((tab) => !tab.superadminOnly || role === 'superadmin');

  return (
    <nav
      aria-label="Admin sections"
      className="sticky top-14 z-30 flex items-center gap-1 overflow-x-auto border-b border-hairline bg-app/90 px-2 backdrop-blur no-scrollbar"
    >
      {visible.map((tab) => {
        const Icon = tab.icon;
        const active = tab.end ? location.pathname === tab.to : location.pathname.startsWith(tab.to);
        const badgeCount = tab.badgeKey ? counts[tab.badgeKey] : null;

        return (
          <NavLink
            key={tab.id}
            to={tab.to}
            end={tab.end}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-11 shrink-0 items-center gap-2 whitespace-nowrap px-3.5 text-xs font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-accent',
              active ? 'font-semibold text-accent' : 'text-ink-secondary hover:text-ink'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{tab.label}</span>
            {badgeCount != null && badgeCount > 0 ? (
              <span aria-live="polite" className="rounded-pill bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">
                {badgeCount}
              </span>
            ) : null}
            {active ? (
              <motion.span
                layoutId="admin-active-tab-line"
                className="absolute inset-x-0 -bottom-px h-[2px] bg-accent"
                transition={{ duration: 0.25, ease: EASE }}
              />
            ) : null}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default AdminTabsNav;
