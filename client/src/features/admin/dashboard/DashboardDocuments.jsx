import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { Download, FileText, MousePointerClick } from 'lucide-react';
import { api } from '../../../services/api';
import { useDashboardFilters } from './DashboardFilters';
import { Button } from '../../../components/ui/Button';
import { StatusPill } from '../../../components/ui/Badge';
import { Table, TBody, TD, TH, THead, TR } from '../../../components/ui/Table';
import { ErrorState, EmptyPanel, SERIES_COLORS, useDashboardData } from './DashboardBits';
import { cn } from '../../../lib/cn';

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function DashboardDocuments() {
  const { query } = useDashboardFilters();
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);

  const { data, loading, error, retry } = useDashboardData(
    () => api.dashboard.documents({ ...query, id: selected || undefined }),
    [query.from, query.to, query.granularity, query.includeDemo, query.bust, selected]
  );

  const documents = data?.documents || [];
  const selectedDoc = documents.find((doc) => doc.id === selected);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const result = await api.dashboard.exportCsv('documents', query);
      download(result.blob, 'documents-usage.csv');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">Document usage</h1>
          <p className="mt-1 text-[12px] text-ink-muted">Views, unique viewers, downloads and citations for the selected period.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={exportCsv} loading={exporting} leftIcon={<Download className="h-3.5 w-3.5" />}>
          Export CSV
        </Button>
      </div>

      {error ? <ErrorState error={error} onRetry={retry} /> : null}

      {selected ? (
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <section className="rounded-lg border border-hairline bg-surface-1 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Selected document</p>
                <h2 className="mt-1 truncate text-[14px] font-semibold text-ink">{selectedDoc?.title || 'Document'}</h2>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                Back to table
              </Button>
            </div>
            <div className="mt-2 h-[220px]" aria-hidden="true">
              {data?.series?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.series} margin={{ left: -24, right: 4, top: 4, bottom: 0 }}>
                    <CartesianGrid stroke={SERIES_COLORS.grid} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RTooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} />
                    <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                      {data.series.map((_, index) => (
                        <Cell key={index} fill={index % 2 ? SERIES_COLORS.amber : SERIES_COLORS.copper} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyPanel message="No views for this document in the selected range." />
              )}
            </div>
            <table className="sr-only">
              <caption>Views over time for {selectedDoc?.title}</caption>
              <thead><tr><th>Date</th><th>Views</th></tr></thead>
              <tbody>
                {(data?.series || []).map((row) => <tr key={row.date}><td>{row.date}</td><td>{row.views}</td></tr>)}
              </tbody>
            </table>
          </section>

          <section className="rounded-lg border border-hairline bg-surface-1 p-4">
            <h2 className="text-[14px] font-semibold text-ink">Top pages</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">Which pages are opened or cited most.</p>
            <ul className="mt-3 space-y-2">
              {(data?.topPages || []).length ? (
                data.topPages.map((page) => (
                  <li key={page.page} className="flex items-center justify-between rounded-sm border border-hairline px-3 py-2 text-[11.5px]">
                    <span className="text-ink-secondary">Page {page.page}</span>
                    <span className="font-semibold text-ink-muted">{page.count} views</span>
                  </li>
                ))
              ) : (
                <li className="text-[11.5px] text-ink-muted">No page-level data yet.</li>
              )}
            </ul>
          </section>
        </div>
      ) : null}

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-md bg-surface-2" />
          ))}
        </div>
      ) : (
        <Table caption="Document usage">
          <THead>
            <TR>
              <TH>Document</TH>
              <TH>Version</TH>
              <TH>Status</TH>
              <TH align="right">Views</TH>
              <TH align="right">Unique viewers</TH>
              <TH align="right">Downloads</TH>
              <TH align="right">Citations</TH>
              <TH>Last viewed</TH>
              <TH align="right">Details</TH>
            </TR>
          </THead>
          <TBody>
            {documents.length === 0 ? (
              <TR>
                <TD colSpan={9} className="py-8 text-center text-ink-muted">
                  No document activity in this period.
                </TD>
              </TR>
            ) : (
              documents.map((doc) => (
                <TR key={doc.id} onClick={() => setSelected(doc.id)} className={cn(selected === doc.id && 'bg-accent-soft/40')}>
                  <TD>
                    <span className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                      <span className="line-clamp-1 font-medium text-ink">{doc.title}</span>
                    </span>
                    <span className="mt-0.5 block pl-5 text-[10px] text-ink-muted">{doc.department}</span>
                  </TD>
                  <TD>v{doc.version}</TD>
                  <TD><StatusPill status={doc.status} /></TD>
                  <TD align="right" className="tabular-nums">{doc.views}</TD>
                  <TD align="right" className="tabular-nums">{doc.uniqueViewers}</TD>
                  <TD align="right" className="tabular-nums">{doc.downloads}</TD>
                  <TD align="right" className="tabular-nums">{doc.citations}</TD>
                  <TD className="whitespace-nowrap">{fmt(doc.lastViewed)}</TD>
                  <TD align="right">
                    <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); setSelected(doc.id); }} leftIcon={<MousePointerClick className="h-3 w-3" />}>
                      Open
                    </Button>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      )}
    </div>
  );
}
