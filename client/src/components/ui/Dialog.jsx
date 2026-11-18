import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { EASE } from '../../lib/motion';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  icon = null,
  className = '',
  closeLabel = 'Close dialog',
  hideClose = false
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef(null);
  const previousFocus = useRef(null);

  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null
      );
      if (nodes.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (nodes && nodes.length > 0) nodes[0].focus();
      else panelRef.current?.focus();
    });

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = originalOverflow;
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus();
    };
  }, [open, onKeyDown]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.25, ease: EASE }}
            className={cn(
              'relative z-10 max-h-[90vh] w-full overflow-hidden rounded-lg border border-hairline bg-surface-1 shadow-lift outline-none',
              SIZES[size],
              className
            )}
          >
            <div className="flex items-start gap-3 border-b border-hairline px-5 py-4 sm:px-6">
              {icon ? (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent">
                  {icon}
                </span>
              ) : null}
              <div className="min-w-0 flex-1 pt-0.5">
                {title ? (
                  <h2 id={titleId} className="text-[15px] font-semibold text-ink">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p id={descId} className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              {!hideClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={closeLabel}
                  className="-mr-1 rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="max-h-[calc(90vh-9rem)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

            {footer ? (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline bg-surface-1 px-5 py-4 sm:px-6">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

export default Dialog;
