import { forwardRef, useId, useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/cn';

export const AuthField = forwardRef(function AuthField(
  {
    label,
    error,
    hint,
    icon: Icon,
    type = 'text',
    className = '',
    inputClassName = '',
    autoComplete,
    showPasswordToggle = false,
    onPasswordVisibleChange,
    ...props
  },
  ref
) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [visible, setVisible] = useState(false);
  const resolvedType = showPasswordToggle ? (visible ? 'text' : 'password') : type;

  const toggle = () => {
    setVisible((value) => {
      onPasswordVisibleChange?.(!value);
      return !value;
    });
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13.5px] font-semibold text-zinc-100">
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
        ) : null}
        <input
          ref={ref}
          id={id}
          type={resolvedType}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
          className={cn(
            'h-11 w-full rounded-xl border bg-[#141414]/90 pr-4 text-[14.5px] text-white outline-none transition-all placeholder:text-zinc-500 focus:border-accent focus:bg-[#1a1a1a] focus:ring-2 focus:ring-accent/30 backdrop-blur-md',
            Icon ? 'pl-11' : 'pl-3.5',
            showPasswordToggle && 'pr-11',
            error ? 'border-[#ef4444]' : 'border-white/15 hover:border-white/30',
            inputClassName
          )}
          {...props}
        />
        {showPasswordToggle ? (
          <button
            type="button"
            onClick={toggle}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-accent"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? <EyeOff className="h-4.5 w-4.5" aria-hidden="true" /> : <Eye className="h-4.5 w-4.5" aria-hidden="true" />}
          </button>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={hintId} className="mt-1 text-[12px] leading-tight text-zinc-300">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium text-[#f87171]" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
});

const RULES = [
  { id: 'length', label: '8+ chars', test: (value) => value.length >= 8 },
  { id: 'letter', label: '1 letter', test: (value) => /[a-zA-Z]/.test(value) },
  { id: 'number', label: '1 number', test: (value) => /\d/.test(value) }
];

export function PasswordStrength({ value = '', showRules = true }) {
  const passed = RULES.filter((rule) => rule.test(value));
  const score = passed.length;
  const label = ['Too weak', 'Weak', 'Fair', 'Strong'][score] || 'Too weak';
  const color = ['#ef4444', '#ef4444', '#f59e0b', '#22c55e'][score];

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center gap-2.5">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {RULES.map((rule, index) => (
            <span
              key={rule.id}
              className="h-2 flex-1 rounded-full transition-colors"
              style={{ background: index < score ? color : 'rgba(255, 255, 255, 0.15)' }}
            />
          ))}
        </div>
        <span className="text-[12px] font-bold" style={{ color }}>
          {label}
        </span>
      </div>
      {showRules ? (
        <div className="mt-1.5 flex items-center gap-3.5">
          {RULES.map((rule) => {
            const ok = rule.test(value);
            return (
              <span key={rule.id} className={cn('inline-flex items-center gap-1 text-[11.5px] font-medium', ok ? 'text-[#4ade80]' : 'text-zinc-400')}>
                <Check className={cn('h-3.5 w-3.5', ok ? 'opacity-100' : 'opacity-40')} aria-hidden="true" />
                {rule.label}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function FormMessage({ children, variant = 'error' }) {
  if (!children) return null;
  const isError = variant === 'error';
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border p-3.5 text-[13px] leading-snug font-medium backdrop-blur-md',
        isError
          ? 'border-red-500/40 bg-red-950/50 text-red-200'
          : 'border-emerald-500/40 bg-emerald-950/50 text-emerald-200'
      )}
    >
      <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
