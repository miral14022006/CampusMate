import { useId, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { EASE } from '../../lib/motion';

export function Tabs({ items = [], value, onChange, className = '', label = 'Tabs', size = 'md' }) {
  const layoutId = useId().replace(/:/g, '');
  const refs = useRef([]);

  const onKeyDown = (event, index) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = items.length - 1;
    refs.current[next]?.focus();
    onChange?.(items[next].value);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('inline-flex flex-wrap items-center gap-1 rounded-pill border border-hairline bg-surface-1 p-1', className)}
    >
      {items.map((item, index) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange?.(item.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'relative rounded-pill font-semibold transition-colors duration-150 ease-premium',
              size === 'sm' ? 'px-3 py-1.5 text-[11.5px]' : 'px-4 py-2 text-[12.5px]',
              active ? 'text-white' : 'text-ink-secondary hover:text-ink'
            )}
          >
            {active ? (
              <motion.span
                layoutId={`tab-pill-${layoutId}`}
                className="absolute inset-0 rounded-pill bg-[linear-gradient(100deg,var(--accent),var(--accent-strong))] shadow-[0_8px_20px_-12px_rgba(212,103,63,.9)]"
                transition={{ duration: 0.25, ease: EASE }}
              />
            ) : null}
            <span className="relative z-10 flex items-center gap-1.5">
              {item.label}
              {item.count !== undefined ? (
                <span
                  className={cn(
                    'rounded-pill px-1.5 py-0.5 text-[10px] font-bold tabular',
                    active ? 'bg-white/20 text-white' : 'bg-surface-3 text-ink-muted'
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
