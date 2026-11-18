import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminTabs } from '../../config/navigation';
import { api } from '../../services/api';
import { EASE } from '../../lib/motion';
import { cn } from '../../lib/cn';

export function AdminTabsNav() {
  const location = useLocation();
  const [counts, setCounts] = useState({
    documents: null,
    review: null,
    dates: null
  });

  // Fetch live counts for badges
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
          review: fbRes.status === 'fulfilled' ? (fbRes.value?.queue?.length ?? null) : null,
          dates: calRes.status === 'fulfilled' ? (calRes.value?.total ?? calRes.value?.events?.length ?? null) : null
        });
      } catch (e) {
        console.warn('Failed to load admin badge counts:', e);
      }
    }

    fetchBadgeCounts();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  return (
    <nav
      aria-label="Admin Sections"
      className="sticky top-0 z-30 flex items-center gap-1 border-b border-hairline bg-app/90 backdrop-blur px-2 overflow-x-auto no-scrollbar"
    >
      {adminTabs.map((tab) => {
        const Icon = tab.icon;
        const isDatesReview = tab.id === 'dates';
        const isCurrentActive = isDatesReview
          ? location.pathname === '/admin/documents' && location.search.includes('tab=dates')
          : tab.end
          ? location.pathname === tab.to
          : location.pathname.startsWith(tab.to) && !location.search.includes('tab=dates');

        const badgeCount = tab.badgeKey ? counts[tab.badgeKey] : null;

        return (
          <NavLink
            key={tab.id}
            to={tab.to}
            end={tab.end}
            aria-current={isCurrentActive ? 'page' : undefined}
            className={cn(
              'relative flex h-11 items-center gap-2 px-3.5 text-xs font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-accent whitespace-nowrap',
              isCurrentActive ? 'text-accent font-semibold' : 'text-ink-secondary hover:text-ink'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {badgeCount != null && badgeCount > 0 && (
              <span
                aria-live="polite"
                className="rounded-pill bg-accent-soft px-1.5 py-0.2 text-[10px] font-bold text-accent"
              >
                {badgeCount}
              </span>
            )}

            {isCurrentActive && (
              <motion.span
                layoutId="admin-active-tab-line"
                className="absolute inset-x-0 -bottom-px h-[2px] bg-accent"
                transition={{ duration: 0.25, ease: EASE }}
              />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default AdminTabsNav;
