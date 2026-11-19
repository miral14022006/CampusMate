import { forwardRef } from 'react';
import { m } from 'framer-motion';
import { cn } from '../../../lib/cn';
import { EASE } from '../../../lib/motion';

/**
 * Scene component providing generous breathing room and readable component scale.
 *
 * Typography:
 * - H2 clamp(2.25rem, 4.5vw, 3.75rem)
 * - Eyebrow uppercase
 * - Subtitle 18px to 20px (text-[18px] sm:text-[20px])
 * - Max container: 1280px (1440px on >= 1536px)
 */
export const Scene = forwardRef(function Scene(
  {
    id,
    eyebrow,
    title,
    subtitle,
    children,
    className,
    contentClassName,
    glowPosition = 'center',
    divider = true,
    fullWidth = false,
    headerRight = null
  },
  ref
) {
  const headingId = `${id}-heading`;

  return (
    <m.section
      ref={ref}
      id={id}
      aria-labelledby={title ? headingId : undefined}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className={cn(
        'scene relative w-full overflow-x-clip bg-[#161616] text-ink',
        'min-h-[100svh] flex flex-col justify-center',
        'py-20 sm:py-24 lg:py-28',
        'lg:pt-[calc(var(--nav-h,64px)+40px)] lg:pb-20',
        className
      )}
    >
      {/* Soft radial glow */}
      <m.div
        variants={{
          hidden: { opacity: 0, scale: 0.8 },
          show: { opacity: 0.22, scale: 1, transition: { duration: 1.2, ease: EASE } }
        }}
        className={cn(
          'cm-ambient-pulse pointer-events-none absolute h-[640px] w-[640px] rounded-full blur-[160px]',
          glowPosition === 'top-left' && '-left-40 top-12',
          glowPosition === 'top-right' && '-right-40 top-12',
          glowPosition === 'bottom-right' && '-right-32 bottom-8',
          glowPosition === 'center' && 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
        )}
        style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Container: generous 1280px / 1440px width */}
      <div
        className={cn(
          'relative z-10 mx-auto w-full px-5 sm:px-8 lg:px-12 flex flex-col justify-center',
          fullWidth ? 'max-w-none' : 'max-w-[1280px] 2xl:max-w-[1440px]'
        )}
      >
        {(eyebrow || title || subtitle || headerRight) && (
          <div className="mb-8 sm:mb-10 shrink-0 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="max-w-[68ch]">
              {eyebrow && (
                <m.p
                  variants={{
                    hidden: { opacity: 0, x: -16 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } }
                  }}
                  className="text-[12px] font-semibold uppercase tracking-[0.2em] text-accent"
                >
                  {eyebrow}
                </m.p>
              )}
              {title && (
                <div className="overflow-hidden">
                  <m.h2
                    id={headingId}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.05 } }
                    }}
                    className="mt-2 text-[clamp(2.25rem,4.5vw,3.75rem)] font-bold leading-[1.08] tracking-[-0.035em] text-ink"
                  >
                    {title}
                  </m.h2>
                </div>
              )}
              {subtitle && (
                <m.p
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: 0.12 } }
                  }}
                  className="mt-3.5 text-[17.5px] sm:text-[19px] leading-relaxed text-ink-secondary max-w-[65ch]"
                >
                  {subtitle}
                </m.p>
              )}
            </div>
            {headerRight && (
              <m.div
                variants={{
                  hidden: { opacity: 0, scale: 0.96 },
                  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: EASE, delay: 0.15 } }
                }}
                className="shrink-0"
              >
                {headerRight}
              </m.div>
            )}
          </div>
        )}

        {/* Content Block */}
        <m.div
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.06,
                delayChildren: 0.16
              }
            }
          }}
          className={cn('relative w-full', contentClassName)}
        >
          {children}
        </m.div>
      </div>

      {/* Hairline gradient divider */}
      {divider && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08)_20%,rgba(212,103,63,0.2)_50%,rgba(255,255,255,0.08)_80%,transparent)]"
          aria-hidden="true"
        />
      )}
    </m.section>
  );
});

export default Scene;
