import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/cn';

const RANGES = [
  { id: 'today', label: 'Today', days: 1, granularity: 'hour' },
  { id: '7d', label: '7d', days: 7, granularity: 'day' },
  { id: '30d', label: '30d', days: 30, granularity: 'day' },
  { id: '90d', label: '90d', days: 90, granularity: 'week' },
  { id: 'custom', label: 'Custom', days: null, granularity: 'day' }
];

const SEMESTERS = ['all', '1', '2', '3', '4', '5', '6', '7', '8'];
const BRANCHES = [
  'all',
  'Computer Engineering',
  'Information and Communication Technology',
  'Information Technology',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Electronics and Communication Engineering',
  'Electronics & Communication',
  'Civil Engineering',
  'Chemical Engineering',
  'Artificial Intelligence & Data Science',
  'Petroleum Engineering'
];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function useDashboardFilters() {
  const [params, setParams] = useSearchParams();
  const range = params.get('range') || '30d';
  const granularity = params.get('granularity') || RANGES.find((item) => item.id === range)?.granularity || 'day';
  const semester = params.get('semester') || 'all';
  const branch = params.get('branch') || 'all';
  const includeDemo = params.get('includeDemo') === 'true';
  const bust = params.get('bust') || '';

  const { from, to, queryFrom, queryTo } = useMemo(() => {
    const preset = RANGES.find((item) => item.id === range);
    if (range === 'custom') {
      const rawFrom = params.get('from') || '';
      const rawTo = params.get('to') || '';
      const start = rawFrom ? new Date(`${rawFrom}T00:00:00`) : null;
      const end = rawTo ? new Date(`${rawTo}T23:59:59.999`) : new Date();
      return {
        from: rawFrom,
        to: rawTo,
        queryFrom: start && !Number.isNaN(start.getTime()) ? start.toISOString() : '',
        queryTo: !Number.isNaN(end.getTime()) ? end.toISOString() : ''
      };
    }
    const end = new Date();
    const start = new Date(end.getTime() - (preset?.days || 30) * 86400000);
    return { from: isoDate(start), to: isoDate(end), queryFrom: start.toISOString(), queryTo: end.toISOString() };
  }, [range, params]);

  const update = useCallback(
    (patch) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '' || value === 'all') next.delete(key);
        else next.set(key, String(value));
      });
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const query = {
    from: queryFrom,
    to: queryTo,
    granularity,
    semester: semester === 'all' ? undefined : semester,
    branch: branch === 'all' ? undefined : branch,
    includeDemo: includeDemo ? 'true' : undefined,
    bust: bust || undefined
  };

  return { range, from, to, granularity, semester, branch, includeDemo, bust, query, update, params };
}

export function DashboardFilters() {
  const { range, from, to, semester, branch, includeDemo, update } = useDashboardFilters();
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const refresh = () => {
    update({ bust: Date.now() });
    setUpdatedAt(Date.now());
    setTick((value) => value + 1);
  };

  const minutes = Math.max(0, Math.floor((Date.now() - updatedAt) / 60000));

  return (
    <div className="border-b border-hairline bg-surface-1/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-2 px-3 py-2 sm:px-5">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
          Filters
        </span>

        <div className="flex items-center gap-1 rounded-pill border border-hairline bg-surface-1 p-0.5" role="group" aria-label="Date range">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => update({ range: item.id, granularity: item.granularity, from: '', to: '' })}
              aria-pressed={range === item.id}
              className={cn(
                'h-8 rounded-pill px-2.5 text-[11.5px] font-semibold transition-colors',
                range === item.id ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {range === 'custom' ? (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={from}
              onChange={(event) => update({ from: event.target.value })}
              aria-label="From date"
              className="h-8 rounded-pill border border-hairline bg-surface-1 px-2.5 text-[11px] text-ink outline-none focus:border-accent"
            />
            <span className="text-[10px] text-ink-muted">to</span>
            <input
              type="date"
              value={to}
              onChange={(event) => update({ to: event.target.value })}
              aria-label="To date"
              className="h-8 rounded-pill border border-hairline bg-surface-1 px-2.5 text-[11px] text-ink outline-none focus:border-accent"
            />
          </div>
        ) : null}

        <label className="sr-only" htmlFor="dashboard-semester">
          Semester
        </label>
        <select
          id="dashboard-semester"
          value={semester}
          onChange={(event) => update({ semester: event.target.value })}
          className="h-8 rounded-pill border border-hairline bg-surface-1 px-2.5 text-[11.5px] font-medium text-ink-secondary outline-none focus:border-accent"
        >
          {SEMESTERS.map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? 'All semesters' : `Semester ${value}`}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="dashboard-branch">
          Branch
        </label>
        <select
          id="dashboard-branch"
          value={branch}
          onChange={(event) => update({ branch: event.target.value })}
          className="h-8 max-w-[190px] rounded-pill border border-hairline bg-surface-1 px-2.5 text-[11.5px] font-medium text-ink-secondary outline-none focus:border-accent"
        >
          {BRANCHES.map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? 'All branches' : value}
            </option>
          ))}
        </select>

        <label className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-pill border border-hairline px-2.5 py-1.5 text-[11px] font-medium text-ink-secondary">
          <input
            type="checkbox"
            checked={includeDemo}
            onChange={(event) => update({ includeDemo: event.target.checked ? 'true' : undefined })}
            className="h-3 w-3 accent-[color:var(--accent)]"
          />
          <Sparkles className="h-3 w-3 text-accent" aria-hidden="true" />
          Demo data
        </label>

        <Button size="sm" variant="secondary" onClick={refresh} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
          Refresh
        </Button>
        <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted" aria-live="polite">
          <CalendarDays className="h-3 w-3" aria-hidden="true" />
          Updated {minutes < 1 ? 'just now' : `${minutes} min ago`}
        </span>
      </div>
    </div>
  );
}

export default DashboardFilters;
