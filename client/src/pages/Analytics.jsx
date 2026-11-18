import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Download, Languages, MessageCircleQuestion, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ChartCard } from '../components/ui/ChartCard';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';
import { useDocumentTitle, usePrefersReducedMotion } from '../lib/hooks';
import {
  aggregateLanguages,

  buildIntentData,
  CHART_COLORS,
  getRangeStart
} from '../lib/chartTheme';
import { ChartTooltip, DonutChart, DonutLegend } from '../features/admin/ChartBits';
import { formatCompactNumber, formatMs, formatRelativeTime } from '../lib/format';
import { languageLabel } from '../lib/format';

const RANGE_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' }
];

export default function Analytics() {
  useDocumentTitle('Analytics Overview');
  const { toast } = useToast();
  const reduced = usePrefersReducedMotion();
  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (days) => {
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
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  const kpis = data?.kpis;
  const intentData = useMemo(() => buildIntentData(data?.topIntents || [], 4), [data]);
  const languages = useMemo(() => aggregateLanguages(data?.languageDistribution || []), [data]);
  const unanswered = data?.topUnanswered || [];

  const latencySeries = useMemo(
    () =>
      (data?.queriesOverTime || []).map((row) => ({
        ...row,
        label: new Date(`${row.date}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
      })),
    [data]
  );

  const maxLatency = Math.max(
    100,
    ...latencySeries.map((row) => Math.max(row.avgLatencyMs || 0, row.p95LatencyMs || 0))
  );
  const latencyTop = Math.ceil((maxLatency * 1.15) / 50) * 50;
  const latencyTicks = [0, Math.round(latencyTop / 2), latencyTop];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { blob } = await api.admin.analytics.exportCsv('unanswered', {
        startDate: getRangeStart(range),
        endDate: new Date().toISOString(),
        includeSeeded: 'true'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `campusmate_unanswered_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'CSV exported', description: 'Unanswered queries downloaded.', variant: 'success' });
    } catch (err) {
      toast({ title: 'Export failed', description: err.message, variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics Overview" subtitle="Insights into user queries and system performance" />
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics Overview"
        subtitle="Insights into user queries and system performance"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              loading={exporting}
              onClick={exportCsv}
              leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Export CSV
            </Button>
            <Select value={range} onChange={setRange} options={RANGE_OPTIONS} label="Date range" />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Intent Distribution"
          description="Share of classified intents"
          loading={loading}
          empty={!loading && intentData.length === 0}
          emptyTitle="No intent data"
          emptyDescription="Try a wider date range or seed analytics data."
          height={330}
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="w-full max-w-[220px]">
              <DonutChart
                data={intentData}
                height={220}
                centerLabel="Queries"
                centerValue={formatCompactNumber(kpis?.totalQueries || 0)}
              />
            </div>
            <div className="w-full flex-1">
              <DonutLegend data={intentData} />
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Language Breakdown"
          description="All five supported languages"
          loading={loading}
          empty={!loading && languages.every((row) => row.value === 0)}
          emptyTitle="No language data"
          emptyDescription="Language distribution appears once queries are logged."
          height={330}
        >
          <div className="h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={languages} margin={{ top: 18, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  interval={0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  tickFormatter={formatCompactNumber}
                  width={38}
                />
                <Tooltip
                  cursor={{ fill: 'var(--surface-2)' }}
                  content={(props) => (
                    <ChartTooltip {...props} formatter={(value) => `${formatCompactNumber(value)} queries`} />
                  )}
                />
                <Bar dataKey="value" name="Queries" radius={[6, 6, 2, 2]} isAnimationActive={!reduced}>
                  {languages.map((entry, index) => (
                    <Cell key={entry.code} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(value) => (value ? formatCompactNumber(value) : '')}
                    style={{ fill: 'var(--text-muted)', fontSize: 9.5, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Response Time Trend"
        description="Average and p95 latency per day"
        loading={loading}
        empty={!loading && latencySeries.length === 0}
        emptyTitle="No latency data"
        emptyDescription="Latency metrics are recorded on every chat request."
        height={320}
        action={
          <div className="flex items-center gap-2">
            <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
              Avg: {formatMs(kpis?.avgLatencyMs || 0)}
            </span>
            <span className="hidden rounded-pill bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-muted sm:inline">
              p95: {formatMs(kpis?.p95LatencyMs || 0)}
            </span>
          </div>
        }
      >
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={latencySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                interval={Math.max(0, Math.ceil(latencySeries.length / 8) - 1)}
                dy={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                ticks={latencyTicks}
                tickFormatter={(value) => formatMs(value)}
                width={48}
                domain={[0, latencyTop]}
              />
              <Tooltip
                cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 4' }}
                content={(props) => (
                  <ChartTooltip
                    {...props}
                    formatter={(value) => formatMs(value)}
                  />
                )}
              />
              <Area
                type="monotone"
                dataKey="avgLatencyMs"
                name="Avg"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#latencyFill)"
                dot={{ r: 2.5, fill: 'var(--accent)', strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                isAnimationActive={!reduced}
                animationDuration={800}
              />
              <Line
                type="monotone"
                dataKey="p95LatencyMs"
                name="p95"
                stroke="var(--chart-4)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={!reduced}
                animationDuration={800}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent-soft text-accent">
              <MessageCircleQuestion className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Unanswered queries</h2>
              <p className="mt-0.5 text-[12px] text-ink-muted">
                Fallback and out-of-scope questions from students — useful for new documents.
              </p>
            </div>
          </div>
          {!loading ? (
            <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-[10.5px] font-semibold text-ink-muted">
              {unanswered.length} unique
            </span>
          ) : null}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton variant="circle" className="h-7 w-7" />
                  <Skeleton variant="text" className="h-3 flex-1" />
                  <Skeleton variant="text" className="h-3 w-12" />
                </div>
              ))}
            </div>
          ) : unanswered.length === 0 ? (
            <EmptyState
              compact
              icon={<MessageCircleQuestion className="h-5 w-5" aria-hidden="true" />}
              title="No unanswered queries"
              description="Every query in this period found a grounded answer."
            />
          ) : (
            <ul className="divide-y divide-[color:var(--border)]">
              {unanswered.slice(0, 10).map((item) => (
                <li key={item.normalizedQuery || item.sampleQuery} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
                    <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-ink">{item.sampleQuery}</p>
                    <p className="mt-0.5 text-[10.5px] text-ink-muted">
                      {languageLabel(item.language)} · {item.decision} · last seen {formatRelativeTime(item.lastSeen)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-pill bg-warn-soft px-2 py-1 text-[10px] font-semibold tabular text-[color:var(--warning)]">
                    {formatCompactNumber(item.count)}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!loading && unanswered.length > 0 ? (
          <p className="mt-4 border-t border-hairline pt-3 text-[10.5px] text-ink-muted">
            Adding these to the review queue requires a backend endpoint that is not exposed yet. Use “Export CSV” to
            hand them to the content team.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
