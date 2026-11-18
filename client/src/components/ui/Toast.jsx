import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { EASE } from '../../lib/motion';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

const STYLES = {
  success: 'text-[color:var(--positive)] bg-positive-soft',
  error: 'text-[color:var(--negative)] bg-negative-soft',
  info: 'text-accent bg-accent-soft'
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((items) => items.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'info', duration = 4500, action }) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((items) => [...items, { id, title, description, variant, action }].slice(-4));
      if (duration) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6"
          role="region"
          aria-label="Notifications"
        >
          <AnimatePresence initial={false}>
            {toasts.map((item) => {
              const Icon = ICONS[item.variant] || Info;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="pointer-events-auto flex items-start gap-3 rounded-md border border-hairline bg-surface-2 p-3.5 shadow-lift"
                  role="status"
                  aria-live="polite"
                >
                  <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', STYLES[item.variant])}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {item.title ? <p className="text-[13px] font-semibold text-ink">{item.title}</p> : null}
                    {item.description ? (
                      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{item.description}</p>
                    ) : null}
                    {item.action ? (
                      <button
                        type="button"
                        onClick={() => {
                          item.action.onClick?.();
                          dismiss(item.id);
                        }}
                        className="mt-2 text-[12px] font-semibold text-accent hover:underline"
                      >
                        {item.action.label}
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(item.id)}
                    aria-label="Dismiss notification"
                    className="-mr-1 rounded-full p-1 text-ink-muted hover:bg-surface-3 hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

export default ToastProvider;
