import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useCountUp } from '../../lib/hooks';
import { formatPercent } from '../../lib/format';
import { Skeleton } from './Skeleton';

export function StatCard({
  icon,
  label,
  value,
  format = (v) => Math.round(v).toLocaleString('en-IN'),
  delta = null,
  positiveIsGood = true,
  suffix = '',
  hint,
  loading = false,
  animate = true,
  className = ''
}) {
  const numeric = typeof value === 'number' && Number.isFinite(value);
  const animated = useCountUp(numeric ? value : 0, { enabled: numeric && animate });

  const display = loading ? null : numeric ? `${format(animated)}${suffix}` : value ?? '—';

  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(Number(delta));
  const deltaValue = Number(delta);
  const up = deltaValue >= 0;
  const good = up === positiveIsGood;

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-hairline bg-surface-1 p-5 shadow-soft transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:border-[color:var(--border-strong)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-accent">
          {icon}
        </span>
        {hasDelta ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-pill px-2 py-1 text-[11px] font-semibold tabular',
              good
                ? 'bg-positive-soft text-[color:var(--positive)]'
                : 'bg-negative-soft text-[color:var(--negative)]'
            )}
            title={`${up ? 'Up' : 'Down'} ${formatPercent(Math.abs(deltaValue))} vs previous period`}
          >
            {deltaValue === 0 ? (
              <Minus className="h-3 w-3" aria-hidden="true" />
            ) : up ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
            )}
            {formatPercent(Math.abs(deltaValue))}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        {loading ? (
          <Skeleton variant="text" className="h-8 w-28" />
        ) : (
          <p className="tabular text-[28px] font-semibold leading-none tracking-[-0.03em] text-ink">
            {display}
          </p>
        )}
        <p className="mt-2 text-[12.5px] font-medium text-ink-muted">{label}</p>
        {hint ? <p className="mt-1 text-[11px] text-ink-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

export default StatCard;
