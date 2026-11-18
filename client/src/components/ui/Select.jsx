import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { popover } from '../../lib/motion';

export function Select({
  value,
  onChange,
  options = [],
  label,
  placeholder = 'Select…',
  className = '',
  size = 'md',
  disabled = false,
  align = 'right'
}) {
  const id = useId();
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.findIndex((option) => option.value === value))
  );

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const index = options.findIndex((option) => option.value === value);
    setActiveIndex(index >= 0 ? index : 0);
    requestAnimationFrame(() => listRef.current?.focus());
  }, [open, options, value]);

  const commit = (index) => {
    const option = options[index];
    if (!option) return;
    onChange?.(option.value);
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(options.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      commit(activeIndex);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        aria-controls={`${id}-listbox`}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={cn(
          'inline-flex items-center justify-between gap-2 rounded-pill border border-hairline bg-surface-1 font-medium text-ink-secondary transition-colors duration-150 ease-premium',
          'hover:border-[color:var(--border-strong)] hover:text-ink disabled:cursor-not-allowed disabled:opacity-45',
          size === 'sm' ? 'h-9 px-3 text-[12.5px]' : 'h-10 px-4 text-[13px]',
          open && 'border-accent text-ink'
        )}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            variants={popover}
            initial="hidden"
            animate="show"
            exit="exit"
            className={cn(
              'absolute top-[calc(100%+6px)] z-50 min-w-[180px] overflow-hidden rounded-md border border-hairline bg-surface-2 p-1.5 shadow-lift outline-none',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commit(index)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-[8px] px-2.5 py-2 text-left text-[12.5px] transition-colors',
                      index === activeIndex ? 'bg-surface-3 text-ink' : 'text-ink-secondary',
                      isSelected && 'text-accent'
                    )}
                  >
                    {option.label}
                    {isSelected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default Select;
