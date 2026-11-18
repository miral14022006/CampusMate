import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { EASE } from '../../lib/motion';

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl' };
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Drawer({ open, onClose, title, description, children, footer, size = 'md', icon = null }) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef(null);
  const previous = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previous.current = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector(FOCUSABLE);
      (first || panelRef.current)?.focus?.();
    });

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      if (previous.current instanceof HTMLElement) previous.current.focus();
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'var(--scrim)', backdropFilter: 'blur(3px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: EASE }}
            className={cn(
              'absolute inset-y-0 right-0 flex w-full flex-col border-l border-hairline bg-surface-1 shadow-lift outline-none',
              SIZES[size] || SIZES.md
            )}
          >
            <div className="flex items-start gap-3 border-b border-hairline px-5 py-4">
              {icon ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent">
                  {icon}
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                {title ? (
                  <h2 id={titleId} className="text-[15px] font-semibold text-ink">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p id={descId} className="mt-0.5 text-[12px] text-ink-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="-mr-1 rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer ? (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline px-5 py-4">
                {footer}
              </div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

export default Drawer;
