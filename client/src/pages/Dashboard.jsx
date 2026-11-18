import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Activity, Database, Gauge, MessageSquare, RefreshCw, Smile } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/ui/Card';
import { ChartCard } from '../components/ui/ChartCard';
import { Select } from '../components/ui/Select';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { useDocumentTitle, usePrefersReducedMotion } from '../lib/hooks';
import {
  aggregateLanguages,
  average,
  buildIntentData,
  getRangeStart,
  splitSeries
} from '../lib/chartTheme';
import { ChartTooltip, DonutChart, DonutLegend } from '../features/admin/ChartBits';
import { seriesDelta } from '../lib/format';
import { formatCompactNumber, formatMs, formatPercent, formatShortDate } from '../lib/format';
import { useToast } from '../components/ui/Toast';

const RANGE_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' }
];

function sum(rows, key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

export default function Dashboard() {
  useDocumentTitle('Admin Dashboard');
  const { toast } = useToast();
  const reduced = usePrefersReducedMotion();
  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (days = range) => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.admin.analytics.overview({
          startDate: getRangeStart(days),
          endDate: new Date().toISOString(),
          includeSeeded: 'true'
        });
        setData(result);
      } catch (err) {
        if (err.code !== 'ABORTED') setError(err);
      } finally {
        setLoading(false);
      }
    },
    [range]
  );

  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const kpis = data?.kpis;
  const series = useMemo(() => data?.queriesOverTime || [], [data]);
  const [firstHalf, secondHalf] = splitSeries(series);

  const totalDelta = useMemo(
    () => seriesDelta(sum(secondHalf, 'count'), sum(firstHalf, 'count')),
    [firstHalf, secondHalf]
  );
  const cacheDelta = useMemo(() => {
    const rate = (rows) => (sum(rows, 'count') ? (sum(rows, 'cached') / sum(rows, 'count')) * 100 : null);
    return seriesDelta(rate(secondHalf), rate(firstHalf));
  }, [firstHalf, secondHalf]);
  const latencyDelta = useMemo(() => {
    if (!secondHalf.length || !firstHalf.length) return null;
    return seriesDelta(
      average(secondHalf.map((row) => row.avgLatencyMs)),
      average(firstHalf.map((row) => row.avgLatencyMs))
    );
  }, [firstHalf, secondHalf]);

  const chartData = useMemo(
    () =>
      series.map((row) => ({
        ...row,
        label:
          range <= 7
            ? new Date(`${row.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
            : formatShortDate(`${row.date}T00:00:00`)
      })),
    [series, range]
  );

  const intentData = useMemo(() => buildIntentData(data?.topIntents || [], 4), [data]);
  const languageData = useMemo(() => aggregateLanguages(data?.languageDistribution || []), [data]);
  const isEmpty = !loading && data && (kpis?.totalQueries || 0) === 0;

  const onRefresh = () => {
    load(range);
    toast({ title: 'Refreshing dashboard…', variant: 'info', duration: 1800 });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Overview of CampusMate performance"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={onRefresh} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
              Refresh
            </Button>
            <Select value={range} onChange={setRange} options={RANGE_OPTIONS} label="Date range" />
          </>
        }
      />

      {error ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-negative-soft text-[color:var(--negative)]">
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Could not load analytics</h2>
            <p className="mt-1 max-w-md text-[12.5px] text-ink-muted">{error.message}</p>
          </div>
          <Button onClick={() => load(range)}>Retry</Button>
        </Card>
      ) : (
        <>
          {isEmpty ? (
            <Card className="flex flex-col items-start gap-3 border-[color:var(--accent-ring)] sm:flex-row sm:items-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Database className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-ink">No analytics data for this period</p>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  Seed realistic demo data with{' '}
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-secondary">
                    node server/scripts/seedAnalytics.js
                  </code>
                </p>
              </div>
            </Card>
          ) : null}

          <section aria-label="Key performance indicators" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />}
              label="Total Queries"
              value={kpis?.totalQueries ?? 0}
              format={formatCompactNumber}
              delta={totalDelta}
              loading={loading}
            />
            <StatCard
              icon={<Gauge className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />}
              label="Cache Hit Rate"
              value={kpis?.cacheHitRate ?? 0}
              format={(value) => formatPercent(value, 1)}
              delta={cacheDelta}
              loading={loading}
            />
            <StatCard
              icon={<Activity className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />}
              label="Avg Response"
              value={kpis?.avgLatencyMs ?? 0}
              format={formatMs}
              delta={latencyDelta}
              positiveIsGood={false}
              loading={loading}
              hint={kpis ? `p95 ${formatMs(kpis.p95LatencyMs)}` : undefined}
            />
            <StatCard
              icon={<Smile className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />}
              label="User Satisfaction"
              value={kpis?.satisfactionRate ?? 0}
              format={(value) => formatPercent(value, 1)}
              delta={null}
              loading={loading}
              hint="Based on thumbs ratings"
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
            <ChartCard
              title="Query Trend"
              description="Queries per day across the selected period"
              loading={loading}
              empty={!loading && chartData.length === 0}
              emptyTitle="No queries in this period"
              emptyDescription="Try another date range or seed analytics data."
              height={300}
              action={
                <Select
                  value={range}
                  onChange={setRange}
                  options={RANGE_OPTIONS}
                  size="sm"
                  label="Chart range"
                />
              }
            >
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="queryTrendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--text-muted)', fontSize: 10.5 }}
                      interval={range <= 7 ? 0 : Math.ceil(chartData.length / 7)}
                      dy={6}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--text-muted)', fontSize: 10.5 }}
                      tickFormatter={(value) => formatCompactNumber(value)}
                      width={46}
                      tickCount={4}
                    />
                    <Tooltip
                      cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 4' }}
                      content={(props) => (
                        <ChartTooltip {...props} formatter={(value) => `${formatCompactNumber(value)} queries`} />
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Queries"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      fill="url(#queryTrendFill)"
                      dot={{ r: 2.5, fill: 'var(--accent)', strokeWidth: 0 }}
                      activeDot={{ r: 4.5, stroke: 'var(--surface-1)', strokeWidth: 2 }}
                      isAnimationActive={!reduced}
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Top Intents"
              description="What students ask about most"
              loading={loading}
              empty={!loading && intentData.length === 0}
              emptyTitle="No intents yet"
              emptyDescription="Intent data appears once queries are logged."
              height={300}
            >
              <DonutChart
                data={intentData}
                height={188}
                centerLabel="Queries"
                centerValue={formatCompactNumber(kpis?.totalQueries || 0)}
              />
              <div className="mt-4">
                <DonutLegend data={intentData} />
              </div>
            </ChartCard>
          </div>

          {!loading && languageData.some((row) => row.value > 0) ? (
            <p className="text-[10.5px] text-ink-muted">
              Languages this period:{' '}
              {languageData
                .filter((row) => row.value > 0)
                .map((row) => `${row.name} (${formatCompactNumber(row.value)})`)
                .join(' · ')}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
