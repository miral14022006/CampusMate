import { cn } from '../../lib/cn';

export function Switch({ checked = false, onChange, disabled = false, label, id, className = '', size = 'md' }) {
  const sizes = {
    sm: { track: 'h-5 w-9', thumb: 'h-3.5 w-3.5', on: 'translate-x-4', off: 'translate-x-[3px]' },
    md: { track: 'h-6 w-11', thumb: 'h-4 w-4', on: 'translate-x-[22px]', off: 'translate-x-1' }
  };
  const s = sizes[size] || sizes.md;

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 ease-premium',
        'disabled:cursor-not-allowed disabled:opacity-45',
        s.track,
        checked
          ? 'bg-[linear-gradient(100deg,var(--accent),var(--accent-strong))]'
          : 'bg-surface-3 border border-hairline',
        className
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ease-premium',
          s.thumb,
          checked ? s.on : s.off
        )}
      />
    </button>
  );
}

export function SwitchRow({ label, description, checked, onChange, icon = null, id }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {icon ? <span className="text-ink-secondary">{icon}</span> : null}
        <div className="min-w-0">
          <label htmlFor={id} className="block cursor-pointer text-[13.5px] font-medium text-ink">
            {label}
          </label>
          {description ? <p className="mt-0.5 text-[12px] text-ink-muted">{description}</p> : null}
        </div>
      </div>
      <Switch id={id} checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export default Switch;
