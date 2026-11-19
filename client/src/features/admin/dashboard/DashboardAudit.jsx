import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ScrollText, ShieldCheck } from 'lucide-react';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../components/ui/Table';
import { ErrorState } from './DashboardBits';

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function DashboardAudit() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async (nextPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.admin.audit.list({
        action: action || undefined,
        actorId: actor || undefined,
        from: from || undefined,
        to: to || undefined,
        page: nextPage,
        limit: 50
      });
      setLogs(result.logs || []);
      setTotal(result.total || 0);
      setPages(result.totalPages || 1);
      setPage(result.page || nextPage);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">Audit log</h1>
          <p className="mt-1 text-[12px] text-ink-muted">Sensitive actions by administrators. Superadmin only.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-surface-1 px-2.5 py-1.5 text-[11px] text-ink-muted">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" /> {total.toLocaleString()} entries
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="audit-action" className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Action</label>
          <select id="audit-action" value={action} onChange={(event) => setAction(event.target.value)} className="h-9 rounded-pill border border-hairline bg-surface-1 px-3 text-[11.5px] text-ink-secondary outline-none focus:border-accent">
            <option value="">All actions</option>
            {['admin_invited', 'admin_invite_revoked', 'admin_status_active', 'admin_status_disabled', 'admin_reset_link_generated', 'admin_deleted', 'chat_transcript_viewed', 'student_disabled', 'student_enabled', 'document_viewed'].map((value) => (
              <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="audit-actor" className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Actor id</label>
          <input id="audit-actor" value={actor} onChange={(event) => setActor(event.target.value)} placeholder="User ObjectId" className="h-9 w-48 rounded-pill border border-hairline bg-surface-1 px-3 text-[11.5px] text-ink outline-none focus:border-accent" />
        </div>
        <div>
          <label htmlFor="audit-from" className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">From</label>
          <input id="audit-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-9 rounded-pill border border-hairline bg-surface-1 px-3 text-[11.5px] text-ink outline-none focus:border-accent" />
        </div>
        <div>
          <label htmlFor="audit-to" className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">To</label>
          <input id="audit-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-9 rounded-pill border border-hairline bg-surface-1 px-3 text-[11.5px] text-ink outline-none focus:border-accent" />
        </div>
        <Button size="sm" variant="secondary" onClick={() => load(1)} leftIcon={<ScrollText className="h-3.5 w-3.5" />}>
          Apply filters
        </Button>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => load(page)} />
      ) : loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-md" />)}</div>
      ) : (
        <Table caption="Audit log">
          <THead>
            <TR>
              <TH>When</TH>
              <TH>Actor</TH>
              <TH>Action</TH>
              <TH>Target</TH>
              <TH>Metadata</TH>
              <TH>IP hash</TH>
            </TR>
          </THead>
          <TBody>
            {logs.length === 0 ? (
              <TR><TD colSpan={6} className="py-8 text-center text-ink-muted">No audit entries match these filters.</TD></TR>
            ) : (
              logs.map((log) => (
                <TR key={log.id}>
                  <TD className="whitespace-nowrap">{fmt(log.at)}</TD>
                  <TD>
                    <span className="text-[12px] font-medium text-ink">{log.actor?.name || 'System'}</span>
                    <span className="block text-[10px] text-ink-muted">{log.actor?.email || '—'}</span>
                  </TD>
                  <TD><span className="rounded-pill bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-ink-secondary">{log.action.replace(/_/g, ' ')}</span></TD>
                  <TD>{log.targetType || '—'}{log.targetId ? <span className="block truncate text-[9.5px] text-ink-muted" title={log.targetId}>{log.targetId}</span> : null}</TD>
                  <TD className="max-w-[260px]">
                    <pre className="overflow-hidden text-ellipsis whitespace-nowrap text-[9.5px] text-ink-muted">{JSON.stringify(log.meta || {})}</pre>
                  </TD>
                  <TD className="font-mono text-[9px] text-ink-muted">{log.ipHash ? `${log.ipHash.slice(0, 10)}…` : '—'}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => load(page - 1)} leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}>Previous</Button>
          <span className="text-[11px] text-ink-muted">Page {page} of {pages}</span>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => load(page + 1)} rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>Next</Button>
        </div>
      ) : null}
    </div>
  );
}
