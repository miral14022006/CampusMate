import { useEffect, useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import LogoMark from './LogoMark';
import { EASE } from '../../lib/motion';

/**
 * IntroOverlay:
 * - First visit per browser session only (sessionStorage "cm_intro_seen")
 * - Skipped immediately when prefers-reduced-motion is active
 * - Max duration ~1.4s; skippable by click or any keypress
 * - Full-screen charcoal overlay (#161616)
 * - Concentric arcs draw in (stroke-dashoffset), wordmark fades up
 * - Overlay lifts away with clip-path reveal (600ms) to reveal the hero
 * - Never blocks rendering; hero is in DOM underneath; overlay unmounts completely
 */
export function IntroOverlay({ onComplete }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Check reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return false;
    // Check sessionStorage
    try {
      return !sessionStorage.getItem('cm_intro_seen');
    } catch (e) {
      return false;
    }
  });

  const [phase, setPhase] = useState('drawing'); // 'drawing' -> 'lifting' -> 'done'

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem('cm_intro_seen', 'true');
    } catch (e) {}
    setPhase('lifting');
    setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 600); // 600ms clip-path lift
  }, [onComplete]);

  useEffect(() => {
    if (!visible) {
      if (onComplete) onComplete();
      return;
    }

    // Auto complete sequence:
    // 0ms - 800ms: arcs draw and wordmark appears
    // 800ms: trigger lift
    const timer = setTimeout(() => {
      finish();
    }, 850);

    const handleKey = () => finish();
    const handleClick = () => finish();

    window.addEventListener('keydown', handleKey, { once: true });
    window.addEventListener('pointerdown', handleClick, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('pointerdown', handleClick);
    };
  }, [visible, finish, onComplete]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <m.div
          key="intro-overlay"
          initial={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
          animate={
            phase === 'lifting'
              ? { clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)' }
              : { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }
          }
          transition={{ duration: 0.6, ease: EASE }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#161616] text-[#FFF7F1] cursor-pointer select-none"
          role="status"
          aria-live="polite"
          aria-label="CampusMate is loading"
        >
          {/* Subtle warm center glow */}
          <div
            className="pointer-events-none absolute h-[320px] w-[320px] rounded-full opacity-20 blur-[100px]"
            style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col items-center">
            {/* Concentric arcs draw in */}
            <div className="rounded-[28%] bg-[#222222] p-3 shadow-2xl border border-[rgba(255,255,255,0.06)]">
              <LogoMark size={64} animate={true} />
            </div>

            {/* Wordmark and subtitle fade up */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.25 }}
              className="mt-4 text-center"
            >
              <h1 className="text-[26px] font-bold tracking-[-0.03em] text-[#FFF7F1]">
                Campus<span className="text-accent">Mate</span>
              </h1>
              <p className="mt-1 text-[12px] font-medium text-ink-muted tracking-wide">
                Department of Computer Science & Engineering · PDEU
              </p>
            </m.div>

            {/* Skip hint */}
            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="mt-8 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted"
            >
              Click or press any key to skip
            </m.p>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export default IntroOverlay;
