import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity as ActivityIcon, Download, FileText, MessageSquare, RefreshCw, Search } from 'lucide-react';
import { api } from '../../../services/api';
import { useDashboardFilters } from './DashboardFilters';
import { Button } from '../../../components/ui/Button';
import { ErrorState } from './DashboardBits';
import { cn } from '../../../lib/cn';

const TYPES = [
  'all', 'chat_query', 'document_view', 'document_download', 'calendar_add', 'signup', 'login', 'logout', 'feedback', 'page_view'
];
const ACTORS = ['all', 'student', 'guest', 'admin'];

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

function eventIcon(type) {
  if (type === 'chat_query') return MessageSquare;
  if (type === 'document_view' || type === 'document_download') return FileText;
  return ActivityIcon;
}

export default function DashboardActivity() {
  const { query } = useDashboardFilters();
  const [type, setType] = useState('all');
  const [actorType, setActorType] = useState('all');
  const [student, setStudent] = useState('');
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const sentinel = useRef(null);

  const load = useCallback(
    async (nextPage = 1, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await api.dashboard.activity({
          ...query,
          type: type === 'all' ? undefined : type,
          actorType: actorType === 'all' ? undefined : actorType,
          student: student || undefined,
          page: nextPage,
          limit: 30
        });
        setEvents((current) => (append ? [...current, ...result.events] : result.events));
        setPage(result.page);
        setPages(result.pages);
        setTotal(result.total);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query.from, query.to, query.includeDemo, query.bust, type, actorType, student]
  );

  useEffect(() => {
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, actorType, student, query.from, query.to, query.includeDemo, query.bust]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || loading || loadingMore || page >= pages) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) load(page + 1, true);
      },
      { rootMargin: '240px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pages, loading, loadingMore, load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const result = await api.dashboard.exportCsv('activity', {
        ...query,
        type: type === 'all' ? undefined : type,
        actorType: actorType === 'all' ? undefined : actorType,
        student: student || undefined
      });
      download(result.blob, 'activity.csv');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">Activity</h1>
          <p className="mt-1 text-[12px] text-ink-muted">
            Raw event stream · {total.toLocaleString()} events in range. Raw IP addresses are never stored or shown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => load(1, false)} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
          <Button size="sm" variant="secondary" onClick={exportCsv} loading={exporting} leftIcon={<Download className="h-3.5 w-3.5" />}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Event type filter">
        {TYPES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={type === item}
            onClick={() => {
              setType(item);
              setPage(1);
            }}
            className={cn(
              'h-7 rounded-pill border px-2.5 text-[10.5px] font-semibold capitalize transition-colors',
              type === item ? 'border-accent bg-accent-soft text-accent' : 'border-hairline text-ink-muted hover:text-ink'
            )}
          >
            {item === 'all' ? 'All events' : item.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={actorType} onChange={(event) => { setActorType(event.target.value); setPage(1); }} aria-label="Actor type" className="h-8 rounded-pill border border-hairline bg-surface-1 px-2.5 text-[11px] text-ink-secondary outline-none focus:border-accent">
          {ACTORS.map((value) => <option key={value} value={value}>{value === 'all' ? 'All actors' : value}</option>)}
        </select>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            value={student}
            onChange={(event) => {
              setStudent(event.target.value);
              setPage(1);
            }}
            placeholder="Filter by student user id…"
            aria-label="Student id"
            className="h-8 w-full rounded-pill border border-hairline bg-surface-1 pl-9 pr-3 text-[11px] text-ink outline-none focus:border-accent"
          />
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => load(1, false)} />
      ) : loading && events.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-md bg-surface-2" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-surface-1 p-10 text-center">
          <ActivityIcon className="mx-auto h-6 w-6 text-ink-muted" aria-hidden="true" />
          <p className="mt-3 text-[13px] font-semibold text-ink">No events yet</p>
          <p className="mt-1 text-[11.5px] text-ink-muted">Try a wider date range or include demo data.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1">
          <ul className="divide-y divide-[color:var(--border)]">
            {events.map((event) => {
              const Icon = eventIcon(event.type);
              return (
                <li key={event.id} className="flex items-start gap-3 px-3.5 py-2.5 hover:bg-surface-2">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11.5px] font-semibold capitalize text-ink">{event.type.replace(/_/g, ' ')}</span>
                      <span className="rounded-pill bg-surface-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-muted">{event.actorType}</span>
                      {event.meta?.intent ? <span className="text-[9.5px] text-ink-muted">{event.meta.intent}</span> : null}
                      {event.meta?.language ? <span className="text-[9.5px] text-ink-muted">· {event.meta.language}</span> : null}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-ink-muted">
                      {event.userId ? `user ${event.userId}` : event.clientId ? `client ${event.clientId}` : 'anonymous'}
                      {event.meta?.docId ? ` · doc ${event.meta.docId}` : ''}
                      {event.meta?.page ? ` · p.${event.meta.page}` : ''}
                      {event.meta?.conversationId ? ` · ${event.meta.conversationId}` : ''}
                      {event.userAgentFamily ? ` · ${event.userAgentFamily}` : ''}
                    </p>
                  </div>
                  <time className="shrink-0 text-[9.5px] text-ink-muted" dateTime={event.createdAt}>
                    {new Date(event.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </time>
                </li>
              );
            })}
          </ul>
          <div ref={sentinel} className="flex min-h-10 items-center justify-center border-t border-hairline px-3 py-2 text-[10.5px] text-ink-muted">
            {loadingMore ? 'Loading more…' : page >= pages ? `All ${total.toLocaleString()} events loaded` : 'Scroll for more'}
          </div>
        </div>
      )}
    </div>
  );
}
