import { useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { m, useScroll, useTransform } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  Building2,
  Calendar,
  Languages,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SplitHeadline, CountUp } from '../../../components/motion/MotionKit';
import { usePrefersReducedMotion } from '../../../lib/hooks';
import { EASE, staggerContainer } from '../../../lib/motion';

const TRUST = [
  { icon: Zap, label: 'Instant Answers' },
  { icon: ShieldCheck, label: 'Verified Information' },
  { icon: Building2, label: 'Built for PDEU' }
];

const HERO_PATH =
  'M18 700V286C18 168 96 74 208 64C254 18 348 18 394 64C506 74 584 168 584 286V700H18Z';

export function Hero({ introFinished = true }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const uid = useId().replace(/:/g, '');

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 36]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.02]);

  return (
    <section
      ref={ref}
      id="home"
      className="scene relative w-full overflow-hidden bg-[#161616] text-ink scroll-mt-24 min-h-[100svh] flex flex-col justify-center py-24 lg:py-28 lg:pt-[calc(var(--nav-h,64px)+48px)] lg:pb-20"
    >
      {/* Background Soft Glows */}
      <div
        className="pointer-events-none absolute -left-56 top-24 h-[600px] w-[600px] rounded-full opacity-20 blur-[150px]"
        style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-48 bottom-12 h-[560px] w-[560px] rounded-full opacity-18 blur-[150px]"
        style={{ background: 'radial-gradient(circle, var(--accent-strong), transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-[1280px] 2xl:max-w-[1440px] px-5 sm:px-8 lg:px-12 flex flex-col justify-between">
        {/* Main 2-column grid */}
        <div className="grid w-full items-center gap-10 lg:grid-cols-12 lg:gap-12 my-auto">
          {/* Left Text Column: 7/12 */}
          <m.div
            variants={staggerContainer}
            initial="hidden"
            animate={introFinished ? 'show' : 'hidden'}
            className="lg:col-span-7 relative z-10 max-w-[720px]"
          >
            {/* Eyebrow pill */}
            <m.p
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE, delay: 0.1 } }
              }}
              className="cm-badge-shimmer mb-4 inline-flex items-center gap-2.5 rounded-pill border border-hairline px-4 py-1.5 text-[12.5px] font-semibold text-ink shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
              Your AI campus assistant
            </m.p>

            {/* Headline */}
            <h1 className="text-[clamp(3.2rem,6.2vw,6.4rem)] font-bold leading-[0.98] tracking-[-0.05em]">
              <span className="block text-ink">
                <SplitHeadline text="Your campus," delay={0.15} />
              </span>
              <span className="mt-1.5 block text-accent">
                <SplitHeadline text="your way." delay={0.25} />
              </span>
            </h1>

            {/* Subtitle */}
            <m.p
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: 0.4 } }
              }}
              className="mt-6 max-w-[600px] text-[18.5px] leading-relaxed text-ink-secondary sm:text-[21px]"
            >
              Ask, explore and get verified answers about notices, exams, fees and more — all in one place.
            </m.p>

            {/* CTAs */}
            <m.div
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: 0.52 } }
              }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Link to="/app" className="group inline-flex min-h-[52px]">
                <Button
                  className="h-14 min-h-[52px] px-8 text-[16px]"
                  rightIcon={<ArrowRight className="cm-btn-arrow h-4.5 w-4.5" aria-hidden="true" />}
                >
                  Start Chatting
                </Button>
              </Link>

              <a
                href="#how"
                className="group inline-flex h-14 min-h-[52px] items-center gap-2.5 rounded-pill border border-[color:var(--border-strong)] bg-surface-1/80 px-6 text-[15px] font-semibold text-ink-secondary transition-colors hover:text-ink hover:border-accent outline-none focus-visible:outline-2 focus-visible:outline-accent"
              >
                <ArrowDown className="h-4.5 w-4.5 text-accent transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
                See how it works
              </a>
            </m.div>

            {/* Trust Chips */}
            <m.ul
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: 0.65 } }
              }}
              className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3"
            >
              {TRUST.map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-muted">
                  <Icon className="h-4 w-4 text-accent" strokeWidth={1.5} aria-hidden="true" />
                  {label}
                </li>
              ))}
            </m.ul>
          </m.div>

          {/* Right Column: Hero Illustration with Architectural Arch Outline */}
          <m.div
            initial={{ opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' }}
            animate={
              introFinished
                ? { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' }
                : { opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' }
            }
            transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
            className="lg:col-span-5 relative mx-auto w-full max-w-[520px] 2xl:max-w-[560px]"
          >
            <m.div style={{ y, scale }} className="relative mx-auto w-full">
              <svg
                viewBox="0 0 600 700"
                className="h-auto w-full shadow-2xl max-h-[500px] lg:max-h-[560px] object-contain"
                role="img"
                aria-label="PDEU School of Petroleum Technology in 3D anime architectural style framed by an architectural arch"
              >
                <defs>
                  {/* Original Arch Path */}
                  <clipPath id={`hero-clip-${uid}`}>
                    <path d={HERO_PATH} />
                  </clipPath>

                  {/* Bottom-up atmospheric dark fade */}
                  <linearGradient id={`hero-fade-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0.45" stopColor="#161616" stopOpacity="0" />
                    <stop offset="1" stopColor="#161616" stopOpacity="0.94" />
                  </linearGradient>

                  {/* Radial vignette to mute perimeter glare */}
                  <radialGradient id={`hero-vig-${uid}`} cx="0.5" cy="0.4" r="0.75">
                    <stop offset="0.45" stopColor="#161616" stopOpacity="0" />
                    <stop offset="1" stopColor="#161616" stopOpacity="0.75" />
                  </radialGradient>
                </defs>

                {/* Inner Image with Original Arch Clip */}
                <image
                  href="/images/pdeu-anime-3d.jpg"
                  width="600"
                  height="700"
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#hero-clip-${uid})`}
                  style={{ filter: 'brightness(0.84) contrast(1.08) saturate(0.92)' }}
                />

                {/* Lighting & Vignette Overlays with Original Arch Clip */}
                <rect width="600" height="700" fill="rgba(18, 18, 18, 0.2)" clipPath={`url(#hero-clip-${uid})`} />
                <rect width="600" height="700" fill={`url(#hero-vig-${uid})`} clipPath={`url(#hero-clip-${uid})`} />
                <rect width="600" height="700" fill={`url(#hero-fade-${uid})`} clipPath={`url(#hero-clip-${uid})`} />
              </svg>
            </m.div>

            {/* Floating Chip 1 */}
            <m.div
              initial={{ opacity: 0, scale: 0.8, y: 16 }}
              animate={
                introFinished
                  ? { opacity: 1, scale: 1, y: 0 }
                  : { opacity: 0, scale: 0.8, y: 16 }
              }
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.8 }}
              className="absolute bottom-[10%] left-0 sm:-left-3 z-20 pointer-events-none"
            >
              <div className="glass cm-drift-1 inline-flex items-center gap-2.5 rounded-pill border border-hairline px-4 py-2 shadow-lift">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Languages className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-[12.5px] font-medium text-ink">
                  Answers in <span className="text-accent font-semibold">5 Languages</span>
                </span>
              </div>
            </m.div>

            {/* Floating Chip 2 */}
            <m.div
              initial={{ opacity: 0, scale: 0.8, y: -16 }}
              animate={
                introFinished
                  ? { opacity: 1, scale: 1, y: 0 }
                  : { opacity: 0, scale: 0.8, y: -16 }
              }
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.95 }}
              className="absolute top-[12%] right-0 sm:-right-4 z-20 pointer-events-none"
            >
              <div className="glass cm-drift-2 inline-flex items-center gap-2.5 rounded-pill border border-hairline px-4 py-2 shadow-lift">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-[12.5px] font-medium text-ink">
                  Exam form · <span className="text-amber-500 font-semibold">last date</span>
                </span>
              </div>
            </m.div>
          </m.div>
        </div>

        {/* Bottom slim glass stats strip */}
        <m.div
          variants={{
            hidden: { opacity: 0, y: 16 },
            show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.75 } }
          }}
          initial="hidden"
          animate={introFinished ? 'show' : 'hidden'}
          className="mt-8 shrink-0 rounded-2xl sm:rounded-pill border border-hairline bg-surface-1/80 backdrop-blur-md px-8 py-3.5 shadow-sm"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center items-center divide-y md:divide-y-0 md:divide-x divide-hairline">
            <div className="px-3">
              <span className="text-[22px] font-bold text-accent">
                <CountUp target={5} />
              </span>
              <p className="text-[12.5px] font-medium text-ink-muted mt-0.5">Languages Supported</p>
            </div>
            <div className="px-3 pt-3 md:pt-0">
              <span className="text-[22px] font-bold text-accent">
                <CountUp target={20} />
              </span>
              <p className="text-[12.5px] font-medium text-ink-muted mt-0.5">Campus Intents</p>
            </div>
            <div className="px-3 pt-3 md:pt-0">
              <span className="text-[22px] font-bold text-accent">
                <CountUp target={3} />
              </span>
              <p className="text-[12.5px] font-medium text-ink-muted mt-0.5">Formats (PDF/DOCX/OCR)</p>
            </div>
            <div className="px-3 pt-3 md:pt-0">
              <span className="text-[22px] font-bold text-accent">
                <CountUp target={95} suffix=".3%" />
              </span>
              <p className="text-[12.5px] font-medium text-ink-muted mt-0.5">Intent Accuracy (MuRIL)</p>
            </div>
          </div>
        </m.div>
      </div>

      {/* Hairline gradient divider */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08)_20%,rgba(212,103,63,0.2)_50%,rgba(255,255,255,0.08)_80%,transparent)]"
        aria-hidden="true"
      />
    </section>
  );
}

export default Hero;
