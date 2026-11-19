import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, RefreshCw, Table2, BarChart3 } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useCountUp } from '../../../lib/hooks';
import { cn } from '../../../lib/cn';

export const SERIES_COLORS = {
  copper: 'var(--accent)',
  copperStrong: 'var(--accent-strong)',
  amber: '#d9a441',
  sage: '#7f9f7a',
  sky: '#7ba7c9',
  slate: '#8b8f98',
  grid: 'rgba(255,255,255,0.06)'
};

export function useDashboardData(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loader();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, retry: () => setNonce((value) => value + 1), reload: load };
}

export function KpiCard({ label, kpi, spark, loading = false, suffix = '', decimals = 0 }) {
  const numeric = Number(kpi?.value) || 0;
  const animated = useCountUp(numeric, { duration: 700, enabled: !loading });
  const change = kpi?.change;
  const up = Number(change) > 0;
  const flat = Number(change) === 0 || change === null || change === undefined;
  const display = decimals > 0 ? animated.toFixed(decimals) : Math.round(animated).toLocaleString();

  if (loading) {
    return (
      <div className="rounded-lg border border-hairline bg-surface-1 p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-20" />
        <Skeleton className="mt-3 h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</p>
        {change !== null && change !== undefined ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 text-[10px] font-bold',
              flat
                ? 'bg-surface-2 text-ink-muted'
                : up
                  ? 'bg-positive-soft text-[color:var(--positive)]'
                  : 'bg-negative-soft text-[color:var(--negative)]'
            )}
            title="Compared with the previous period"
          >
            {flat ? '—' : up ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
            {flat ? '0%' : `${Math.abs(Number(change))}%`}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-ink tabular-nums">
        {display}
        {kpi?.unit === '%' ? '%' : suffix}
      </p>
      {spark?.length > 1 ? (
        <div className="mt-1 h-8" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark}>
              <Area type="monotone" dataKey="value" stroke={SERIES_COLORS.copper} fill={SERIES_COLORS.copper} fillOpacity={0.12} strokeWidth={1.5} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Could not load this view' }) {
  return (
    <div className="rounded-lg border border-[color:var(--negative)]/25 bg-surface-1 p-8 text-center">
      <AlertCircle className="mx-auto h-6 w-6 text-[color:var(--negative)]" aria-hidden="true" />
      <p className="mt-3 text-[14px] font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[12px] text-ink-muted">{error?.message || 'Please try again.'}</p>
      {onRetry ? (
        <Button className="mt-4" variant="secondary" onClick={onRetry} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyPanel({ title = 'No data for this period', message = 'Try a wider date range or include demo data.' }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center px-4 text-center">
      <BarChart3 className="h-5 w-5 text-ink-muted" aria-hidden="true" />
      <p className="mt-2 text-[13px] font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[11.5px] text-ink-muted">{message}</p>
    </div>
  );
}

/**
 * Accessible chart wrapper with a "View as table" toggle. The chart itself is
 * aria-hidden; keyboard and screen-reader users get the table equivalent.
 */
export function ChartWithTable({ title, description, action, children, table, loading = false, height = 280, className = '' }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={cn('rounded-lg border border-hairline bg-surface-1 p-4 shadow-soft sm:p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-[11.5px] text-ink-muted">{description}</p> : null}
        </div>
        <div className="flex items-center gap-1.5">
          {action}
          {table ? (
            <button
              type="button"
              onClick={() => setAsTable((value) => !value)}
              aria-pressed={asTable}
              className="inline-flex h-7 items-center gap-1 rounded-pill border border-hairline px-2 text-[10.5px] font-semibold text-ink-muted transition-colors hover:text-ink"
            >
              {asTable ? <BarChart3 className="h-3 w-3" /> : <Table2 className="h-3 w-3" />}
              {asTable ? 'View chart' : 'View as table'}
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4" style={{ minHeight: height }}>
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <div className="flex h-[220px] items-end gap-2">
              {[38, 62, 48, 80, 56, 88, 70].map((value, index) => (
                <Skeleton key={index} className="flex-1" height={`${value}%`} />
              ))}
            </div>
          </div>
        ) : asTable ? (
          <div className="max-h-[320px] overflow-auto rounded-sm border border-hairline">{table}</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function MiniTable({ columns, rows, caption }) {
  return (
    <table className="w-full min-w-[360px] border-collapse text-left text-[11.5px]">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col" className="sticky top-0 bg-surface-2 px-2.5 py-2 font-semibold text-ink-muted">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-2.5 py-4 text-center text-ink-muted">
              No rows
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr key={index} className="border-t border-hairline">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-2.5 py-1.5 text-ink-secondary">
                  {cell}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
