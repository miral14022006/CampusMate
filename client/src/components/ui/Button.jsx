import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  primary:
    'text-white bg-[linear-gradient(100deg,var(--accent),var(--accent-strong))] hover:brightness-[1.06] active:brightness-95 shadow-[0_10px_28px_-14px_rgba(212,103,63,.8)]',
  secondary:
    'bg-surface-2 text-ink border border-hairline hover:bg-surface-3 hover:border-[color:var(--border-strong)]',
  ghost: 'bg-transparent text-ink-secondary hover:text-ink hover:bg-surface-2',
  outline:
    'bg-transparent text-accent border border-accent hover:bg-accent-soft hover:text-accent',
  danger: 'text-white bg-[color:var(--negative)] hover:brightness-110 active:brightness-95'
};

const SIZES = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-pill',
  md: 'h-11 px-5 text-sm gap-2 rounded-pill',
  lg: 'h-12 px-7 text-[15px] gap-2.5 rounded-pill',
  icon: 'h-10 w-10 p-0 rounded-pill'
};

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon = null,
    rightIcon = null,
    className,
    type = 'button',
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold tracking-[-0.01em] transition-all duration-150 ease-premium outline-none focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
        'cm-btn-press active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export default Button;
