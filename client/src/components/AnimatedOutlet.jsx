import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { routeTransition } from '../lib/motion';
import Logo from './brand/Logo';
import { Skeleton } from './ui/Skeleton';

function Splash() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 bg-page p-8" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <Logo variant="mark" size="lg" />
        <span className="text-[12.5px] font-medium tracking-wide text-ink-muted">Loading CampusMate…</span>
      </div>
      {/* Skeleton shimmer for loading states */}
      <div className="w-full max-w-md space-y-3 pt-4">
        <Skeleton variant="heading" className="mx-auto w-3/4" />
        <Skeleton variant="text" count={3} />
      </div>
    </div>
  );
}

export function AnimatedOutlet() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={routeTransition}
        className="min-h-full"
      >
        <Suspense fallback={<Splash />}>
          <Outlet />
        </Suspense>
      </m.div>
    </AnimatePresence>
  );
}

export { Splash };
export default AnimatedOutlet;
