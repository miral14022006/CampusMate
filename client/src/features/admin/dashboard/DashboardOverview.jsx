import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Activity, FileText, MessageSquare, Users } from 'lucide-react';
import { api } from '../../../services/api';
import { useDashboardFilters } from './DashboardFilters';
import {
  ChartWithTable,
  EmptyPanel,
  ErrorState,
  KpiCard,
  MiniTable,
  SERIES_COLORS,
  useDashboardData
} from './DashboardBits';
import { cn } from '../../../lib/cn';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SERIES = [
  { id: 'queries', label: 'Queries', color: SERIES_COLORS.copper }
];
const LANG_LABELS = { en: 'English', hi: 'Hindi', gu: 'Gujarati', 'hi-Latn': 'Hinglish', 'gu-Latn': 'Gujlish' };

function shortDate(value) {
  if (!value) return '';
  if (value.includes('W')) return value;
  if (value.includes('T')) return value.slice(5, 16).replace('T', ' ');
  return value.slice(5);
}

function heatColor(count, max) {
  if (!count) return 'rgba(255,255,255,0.035)';
  const intensity = Math.min(1, count / Math.max(max, 1));
  return `rgba(212, 103, 79, ${0.12 + intensity * 0.78})`;
}

export default function DashboardOverview() {
  const { query } = useDashboardFilters();
  const { data, loading, error, retry } = useDashboardData(
    () => api.dashboard.overview(query),
    [query.from, query.to, query.granularity, query.semester, query.branch, query.includeDemo, query.bust]
  );
  const [series, setSeries] = useState('queries');

  if (error) {
    return <div className="py-6"><ErrorState error={error} onRetry={retry} /></div>;
  }

  const kpis = data?.kpis || {};
  const timeSeries = data?.timeSeries || [];
  const spark = (key) => timeSeries.slice(-10).map((row) => ({ value: row[key] || 0 }));

  const heatmap = data?.heatmap || [];
  const heatMax = Math.max(1, ...heatmap.map((cell) => cell.count));
  const heatGrid = Array.from({ length: 7 }, (_, weekday) =>
    Array.from({ length: 24 }, (_, hour) => heatmap.find((cell) => cell.weekday === weekday && cell.hour === hour)?.count || 0)
  );

  const languages = (data?.languages || []).map((row) => ({
    ...row,
    label: LANG_LABELS[row.language] || row.language || 'Unknown'
  }));
  const totalLanguage = languages.reduce((sum, row) => sum + row.count, 0);

  const topIntents = data?.topIntents || [];
  const topDocs = data?.topDocuments || [];
  const breakdown = data?.semesterBreakdown || [];
  const feed = data?.recentActivity || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
        <KpiCard label="Registered students" kpi={kpis.registeredStudents} loading={loading} />
        <KpiCard label="No. of documents" kpi={kpis.documentsCount} loading={loading} />
        <KpiCard label="Guest visitors" kpi={kpis.guestVisitors} loading={loading} />
        <KpiCard label="Conversations" kpi={kpis.conversations} spark={spark('queries')} loading={loading} />
        <KpiCard label="Queries" kpi={kpis.queries} spark={spark('queries')} loading={loading} />
      </div>

      <ChartWithTable
        title="Usage over time"
        description="Choose a series. Values come from the selected date range."
        loading={loading}
        height={300}
        action={
          <div className="flex gap-1 rounded-pill border border-hairline p-0.5" role="group" aria-label="Chart series">
            {SERIES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={series === item.id}
                onClick={() => setSeries(item.id)}
                className={cn(
                  'h-7 rounded-pill px-2 text-[10.5px] font-semibold transition-colors',
                  series === item.id ? 'bg-surface-3 text-ink' : 'text-ink-muted hover:text-ink'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
        table={
          <MiniTable
            caption="Usage over time"
            columns={['Date', 'Queries']}
            rows={timeSeries.map((row) => [row.date, row.queries])}
          />
        }
      >
        {timeSeries.length === 0 ? (
          <EmptyPanel />
        ) : (
          <div className="h-[260px]" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id={`usage-${series}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES.find((item) => item.id === series)?.color} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={SERIES.find((item) => item.id === series)?.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={SERIES_COLORS.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={18} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RTooltip
                  contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Area
                  type="monotone"
                  dataKey={series}
                  stroke={SERIES.find((item) => item.id === series)?.color}
                  fill={`url(#usage-${series})`}
                  strokeWidth={2}
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartWithTable>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartWithTable
          title="Weekday × hour heatmap"
          description="All events in the selected range, local server time."
          loading={loading}
          height={260}
          table={
            <MiniTable
              caption="Weekday by hour activity counts"
              columns={['Day', 'Peak hour', 'Peak count']}
              rows={heatGrid.map((hours, index) => {
                const peak = Math.max(...hours, 0);
                const hour = hours.indexOf(peak);
                return [DAYS[index], `${String(hour).padStart(2, '0')}:00`, peak];
              })}
            />
          }
        >
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <div className="mb-1 flex gap-[3px] pl-8">
                {Array.from({ length: 24 }, (_, hour) => (
                  <span key={hour} className="w-[16px] text-center text-[8px] text-ink-muted">
                    {hour % 3 === 0 ? hour : ''}
                  </span>
                ))}
              </div>
              {heatGrid.map((hours, weekday) => (
                <div key={DAYS[weekday]} className="mb-[3px] flex items-center gap-[3px]">
                  <span className="w-8 text-[9px] text-ink-muted">{DAYS[weekday]}</span>
                  {hours.map((count, hour) => (
                    <span
                      key={hour}
                      title={`${DAYS[weekday]} ${hour}:00 — ${count} events`}
                      className="h-[16px] w-[16px] rounded-[2px]"
                      style={{ background: heatColor(count, heatMax) }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </ChartWithTable>

        <ChartWithTable
          title="Languages"
          description={`${totalLanguage.toLocaleString()} answered queries`}
          loading={loading}
          height={260}
          table={
            <MiniTable
              caption="Language distribution"
              columns={['Language', 'Queries']}
              rows={languages.map((row) => [row.label, row.count])}
            />
          }
        >
          {languages.length === 0 ? (
            <EmptyPanel />
          ) : (
            <div className="flex h-[250px] flex-col items-center gap-2 sm:flex-row">
              <div className="h-[180px] w-full flex-1" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={languages} dataKey="count" nameKey="label" innerRadius={46} outerRadius={74} paddingAngle={2} animationDuration={500}>
                      {languages.map((entry, index) => (
                        <Cell
                          key={entry.language}
                          fill={[SERIES_COLORS.copper, SERIES_COLORS.amber, SERIES_COLORS.sage, SERIES_COLORS.sky, SERIES_COLORS.slate][index % 5]}
                        />
                      ))}
                    </Pie>
                    <RTooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-1.5 sm:w-[130px]">
                {languages.slice(0, 5).map((row, index) => (
                  <li key={row.language} className="flex items-center justify-between gap-2 text-[10.5px]">
                    <span className="flex items-center gap-1.5 text-ink-secondary">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: [SERIES_COLORS.copper, SERIES_COLORS.amber, SERIES_COLORS.sage, SERIES_COLORS.sky, SERIES_COLORS.slate][index % 5] }}
                      />
                      {row.label}
                    </span>
                    <span className="tabular-nums text-ink-muted">{totalLanguage ? Math.round((row.count / totalLanguage) * 100) : 0}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartWithTable>

        <ChartWithTable
          title="Top intents"
          description="What students ask about most."
          loading={loading}
          height={260}
          table={<MiniTable caption="Top intents" columns={['Intent', 'Count']} rows={topIntents.map((row) => [row.intent, row.count])} />}
        >
          {topIntents.length === 0 ? (
            <EmptyPanel />
          ) : (
            <div className="h-[240px]" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topIntents.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 12, top: 0, bottom: 0 }}>
                  <CartesianGrid stroke={SERIES_COLORS.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="intent" type="category" width={104} tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} />
                  <Bar dataKey="count" fill={SERIES_COLORS.copper} radius={[0, 4, 4, 0]} animationDuration={500} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartWithTable>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartWithTable
          title="Top documents"
          description="Views, downloads and status."
          loading={loading}
          height={260}
          table={<MiniTable caption="Top documents" columns={['Document', 'Views', 'Downloads']} rows={topDocs.map((doc) => [doc.title, doc.views, doc.downloads])} />}
        >
          {topDocs.length === 0 ? (
            <EmptyPanel />
          ) : (
            <ul className="space-y-2.5">
              {topDocs.map((doc) => {
                const max = Math.max(...topDocs.map((item) => item.views), 1);
                return (
                  <li key={doc.id}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-1 text-[11.5px] text-ink-secondary">{doc.title}</span>
                      <span className="shrink-0 text-[10.5px] font-semibold text-ink-muted">{doc.views} views</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${(doc.views / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ChartWithTable>

        <ChartWithTable
          title="Active students by semester / branch"
          description="Distinct students with at least one event in range."
          loading={loading}
          height={260}
          table={<MiniTable caption="Active students by semester and branch" columns={['Semester', 'Branch', 'Students']} rows={breakdown.map((row) => [row.semester ?? 'Not set', row.branch ?? 'Not set', row.count])} />}
        >
          {breakdown.length === 0 ? (
            <EmptyPanel />
          ) : (
            <ul className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
              {breakdown.slice(0, 10).map((row, index) => {
                const max = Math.max(...breakdown.map((item) => item.count), 1);
                return (
                  <li key={`${row.semester}-${row.branch}-${index}`}>
                    <div className="flex items-center justify-between gap-2 text-[10.5px]">
                      <span className="truncate text-ink-secondary">
                        Sem {row.semester ?? '—'} · {row.branch || 'Not set'}
                      </span>
                      <span className="tabular-nums text-ink-muted">{row.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-[color:var(--sage,#7f9f7a)]" style={{ width: `${(row.count / max) * 100}%`, background: SERIES_COLORS.sage }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ChartWithTable>

        <section className="rounded-lg border border-hairline bg-surface-1 p-4 shadow-soft sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-ink">Recent activity</h2>
            <Activity className="h-4 w-4 text-ink-muted" aria-hidden="true" />
          </div>
          {loading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-8 animate-pulse rounded-md bg-surface-2" />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <EmptyPanel message="Activity will appear here as students use CampusMate." />
          ) : (
            <ul className="mt-3 max-h-[250px] space-y-1.5 overflow-y-auto pr-1">
              {feed.map((event) => (
                <li key={event.id} className="flex items-start gap-2 rounded-sm px-1.5 py-1.5 hover:bg-surface-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
                    {event.type === 'chat_query' ? (
                      <MessageSquare className="h-3 w-3" />
                    ) : event.type === 'document_view' || event.type === 'document_download' ? (
                      <FileText className="h-3 w-3" />
                    ) : (
                      <Users className="h-3 w-3" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-ink-secondary">
                      {event.userName || (event.actorType === 'guest' ? 'Guest' : 'Student')}{' '}
                      <span className="font-normal text-ink-muted">· {event.type.replace(/_/g, ' ')}</span>
                    </p>
                    <p className="text-[9.5px] text-ink-muted">
                      {new Date(event.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {event.meta?.intent ? ` · ${event.meta.intent}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
