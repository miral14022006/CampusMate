/**
 * Helper to prefetch route chunk components on hover/focus.
 */
const prefetchCache = new Set();

export function prefetchRoute(to) {
  if (!to || prefetchCache.has(to)) return;
  prefetchCache.add(to);

  if (to.startsWith('/calendar')) {
    import('../pages/CalendarPage');
  } else if (to.startsWith('/app') || to.startsWith('/chat')) {
    import('../pages/Chat');
  } else if (to.startsWith('/admin')) {
    import('../pages/Dashboard');
    import('../pages/Documents');
    import('../pages/Feedback');
    import('../pages/Analytics');
  }
}

export default prefetchRoute;
