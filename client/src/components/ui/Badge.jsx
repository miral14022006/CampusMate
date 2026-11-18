import { cn } from '../../lib/cn';

const VARIANTS = {
  neutral: 'bg-surface-2 text-ink-secondary border-hairline',
  accent: 'bg-accent-soft text-accent border-transparent',
  positive: 'bg-positive-soft text-[color:var(--positive)] border-transparent',
  negative: 'bg-negative-soft text-[color:var(--negative)] border-transparent',
  warning: 'bg-warn-soft text-[color:var(--warning)] border-transparent'
};

export function Badge({ children, variant = 'neutral', dot = false, className = '' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11px] font-semibold leading-none',
        VARIANTS[variant] || VARIANTS.neutral,
        className
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

const STATUS_MAP = {
  active: { variant: 'positive', label: 'Active' },
  positive: { variant: 'positive', label: 'Positive' },
  approved: { variant: 'positive', label: 'Approved' },
  completed: { variant: 'positive', label: 'Completed' },
  success: { variant: 'positive', label: 'Success' },
  negative: { variant: 'negative', label: 'Negative' },
  failed: { variant: 'negative', label: 'Failed' },
  rejected: { variant: 'negative', label: 'Rejected' },
  pending: { variant: 'warning', label: 'Needs Review' },
  'needs review': { variant: 'warning', label: 'Needs Review' },
  needs_review: { variant: 'warning', label: 'Needs Review' },
  indexing: { variant: 'warning', label: 'Indexing' },
  processing: { variant: 'warning', label: 'Indexing' },
  superseded: { variant: 'neutral', label: 'Superseded' },
  archived: { variant: 'neutral', label: 'Archived' },
  inactive: { variant: 'neutral', label: 'Inactive' }
};

export function StatusPill({ status, label, className = '' }) {
  const key = String(status || '').toLowerCase();
  const mapped = STATUS_MAP[key] || { variant: 'neutral', label: label || status || 'Unknown' };
  return (
    <Badge variant={mapped.variant} dot className={className}>
      {label || mapped.label}
    </Badge>
  );
}

export default Badge;
