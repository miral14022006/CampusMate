import { useEffect, useRef, useState } from 'react';
import { m, useInView } from 'framer-motion';
import { DURATION, EASE, STAGGER, fadeUp, staggerContainer, viewportOnce } from '../../lib/motion';

/**
 * <Reveal>
 * Fade-up on scroll, once, margin -80px.
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
  y = 16,
  duration = DURATION.medium
}) {
  return (
    <m.div
      variants={{
        hidden: { opacity: 0, y },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration, ease: EASE, delay }
        }
      }}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      className={className}
    >
      {children}
    </m.div>
  );
}

/**
 * <Stagger>
 * Staggers children reveal by 60ms.
 */
export function Stagger({ children, className = '', delay = 0 }) {
  return (
    <m.div
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: STAGGER,
            delayChildren: delay
          }
        }
      }}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      className={className}
    >
      {children}
    </m.div>
  );
}

/**
 * <SplitHeadline>
 * Word-by-word mask reveal using transform Y and opacity.
 */
export function SplitHeadline({
  text,
  className = '',
  wordClassName = '',
  delay = 0
}) {
  const words = text.split(' ');

  return (
    <m.span
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: STAGGER,
            delayChildren: delay
          }
        }
      }}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      className={`inline-block ${className}`}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-1 align-top">
          <m.span
            variants={{
              hidden: { y: '105%', opacity: 0 },
              show: {
                y: 0,
                opacity: 1,
                transition: { duration: DURATION.slow, ease: EASE }
              }
            }}
            className={`inline-block mr-[0.25em] ${wordClassName}`}
          >
            {word}
          </m.span>
        </span>
      ))}
    </m.span>
  );
}

/**
 * <CountUp>
 * Smooth numerical count up on viewport entry.
 */
export function CountUp({ target, suffix = '', duration = 1200 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let startTime;

    const frame = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrent(Math.floor(eased * target));
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        setCurrent(target);
      }
    };

    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [inView, target, duration]);

  return (
    <span ref={ref} className="font-bold tabular-nums">
      {current}
      {suffix}
    </span>
  );
}

/**
 * <Magnetic>
 * Subtle magnetic attraction on hover (desktop only).
 */
export function Magnetic({ children, strength = 0.25, className = '' }) {
  const ref = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMouseMove = (e) => {
    // Only apply on fine pointers (desktop mouse)
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const dx = (clientX - centerX) * strength;
    const dy = (clientY - centerY) * strength;
    setOffset({ x: dx, y: dy });
  };

  const onMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  return (
    <m.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: 'spring', stiffness: 220, damping: 18, mass: 0.1 }}
      className={`inline-block ${className}`}
    >
      {children}
    </m.div>
  );
}
