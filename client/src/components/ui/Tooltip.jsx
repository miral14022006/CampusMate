import { useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { popover } from '../../lib/motion';

export function Tooltip({ label, children, side = 'top', delay = 300, className = '' }) {
  const id = useId();
  const timer = useRef(null);
  const [open, setOpen] = useState(false);

  const show = () => {
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  const position =
    side === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      : side === 'bottom'
        ? 'top-full left-1/2 -translate-x-1/2 mt-2'
        : side === 'left'
          ? 'right-full top-1/2 -translate-y-1/2 mr-2'
          : 'left-full top-1/2 -translate-y-1/2 ml-2';

  return (
    <span className={cn('relative inline-flex', className)}>
      <span
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex w-full justify-center"
      >
        {children}
      </span>
      <AnimatePresence>
        {open && label ? (
          <motion.span
            id={id}
            role="tooltip"
            variants={popover}
            initial="hidden"
            animate="show"
            exit="exit"
            className={cn(
              'pointer-events-none absolute z-50 whitespace-nowrap rounded-sm border border-hairline bg-surface-3 px-2.5 py-1.5 text-[11.5px] font-medium text-ink shadow-lift',
              position
            )}
          >
            {label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

export default Tooltip;
