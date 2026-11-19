/**
 * CampusMate Unified Motion System.
 * Only transform + opacity are animated.
 * Durations: 150 / 250 / 400 / 700ms
 * Easing: cubic-bezier(0.22, 1, 0.36, 1)
 * Stagger: 60ms
 */

export const EASE = [0.22, 1, 0.36, 1];
export const EASE_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';

export const DURATION = {
  fast: 0.15,   // 150ms
  base: 0.25,   // 250ms
  medium: 0.4,  // 400ms
  slow: 0.7     // 700ms
};

export const STAGGER = 0.06; // 60ms

export const fade = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE } }
};

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.medium, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.fast, ease: EASE } }
};

export const fadeUpSmall = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, y: -4, transition: { duration: DURATION.fast, ease: EASE } }
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: DURATION.fast, ease: EASE } }
};

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: STAGGER, delayChildren: 0.04 }
  }
};

export const routeTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: DURATION.fast, ease: EASE } }
};

export const hoverLift = {
  y: -4,
  transition: { duration: DURATION.base, ease: EASE }
};

export const hoverPress = {
  scale: 0.98,
  transition: { duration: DURATION.fast, ease: EASE }
};

export const messageEntrance = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } }
};

export const popover = {
  hidden: { opacity: 0, scale: 0.97, y: -4 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.fast, ease: EASE } },
  exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: DURATION.fast, ease: EASE } }
};

export const drawerSlideLeft = {
  hidden: { x: '-100%' },
  show: { x: 0, transition: { duration: DURATION.base, ease: EASE } },
  exit: { x: '-100%', transition: { duration: DURATION.fast, ease: EASE } }
};

export const drawerSlideRight = {
  hidden: { x: '100%' },
  show: { x: 0, transition: { duration: DURATION.base, ease: EASE } },
  exit: { x: '100%', transition: { duration: DURATION.fast, ease: EASE } }
};

export const viewportOnce = { once: true, margin: '-80px' };
