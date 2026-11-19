import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { ChevronLeft, ChevronRight, Lock, Search, ShieldCheck, UserCog, UserX } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useDashboardFilters } from './DashboardFilters';
import { Badge, StatusPill } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { Drawer } from '../../../components/ui/Drawer';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../components/ui/Table';
import { Tooltip } from '../../../components/ui/Tooltip';
import { ErrorState, SERIES_COLORS, useDashboardData } from './DashboardBits';


function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });
}

const SORTS = [
  { id: 'lastActive', label: 'Last active' },
  { id: 'joined', label: 'Joined' },
  { id: 'queries', label: 'Queries' },
  { id: 'views', label: 'Document views' },
  { id: 'conversations', label: 'Conversations' },
  { id: 'name', label: 'Name' }
];

function StudentDrawer({ student, open, onClose, filters, onStatusChange }) {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timelinePage, setTimelinePage] = useState(1);
  const [confirmStatus, setConfirmStatus] = useState(null);

  useEffect(() => {
    if (!open || !student) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.dashboard
      .studentUsage(student.id, { ...filters.query, page: timelinePage, limit: 20 })
      .then((data) => {
        if (!cancelled) setUsage(data);
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
  }, [open, student, timelinePage, filters.query]);

  useEffect(() => {
    setTimelinePage(1);
  }, [student?.id]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={student?.name || 'Student'}
      description={student ? `${student.email} · ${student.role}` : ''}
      size="lg"
      icon={<UserCog className="h-4 w-4" />}
      footer={
        student ? (
          <Button
            variant={student.status === 'active' ? 'danger' : 'primary'}
            onClick={() => setConfirmStatus(student.status === 'active' ? 'disabled' : 'active')}
            leftIcon={student.status === 'active' ? <UserX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          >
            {student.status === 'active' ? 'Disable student' : 'Enable student'}
          </Button>
        ) : null
      }
    >
      {error ? (
        <ErrorState error={error} />
      ) : loading && !usage ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      ) : usage ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: 'Queries', value: usage.timelinePage?.total ?? 0 },
              { label: 'Documents', value: usage.documents?.length ?? 0 },
              { label: 'Intents', value: usage.intents?.length ?? 0 },
              { label: 'Status', value: <StatusPill status={usage.student.status} /> }
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-hairline bg-surface-2 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{item.label}</p>
                <div className="mt-1 text-[15px] font-semibold text-ink">{item.value}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-ink">Per-day activity</h3>
              <span className="text-[10.5px] text-ink-muted">
                Joined {fmt(usage.student.joined)} · last active {fmt(usage.student.lastActive)}
              </span>
            </div>
            {usage.daily?.length ? (
              <div className="mt-2 h-[180px]" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usage.daily} margin={{ left: -24, right: 4, top: 4, bottom: 0 }}>
                    <CartesianGrid stroke={SERIES_COLORS.grid} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RTooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }} />
                    <Area type="monotone" dataKey="queries" stroke={SERIES_COLORS.copper} fill={SERIES_COLORS.copper} fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="documentViews" stroke={SERIES_COLORS.sky} fill="transparent" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-2 rounded-sm border border-hairline bg-surface-2 p-4 text-[12px] text-ink-muted">No activity in this range.</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-[13px] font-semibold text-ink">Documents viewed</h3>
              <ul className="mt-2 space-y-1.5">
                {usage.documents?.length ? (
                  usage.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-2 rounded-sm border border-hairline px-2.5 py-2 text-[11.5px]">
                      <span className="truncate text-ink-secondary">{doc.title}</span>
                      <span className="shrink-0 font-semibold text-ink-muted">{doc.views}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[11.5px] text-ink-muted">No documents viewed.</li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-ink">Intents asked</h3>
              <ul className="mt-2 space-y-1.5">
                {usage.intents?.length ? (
                  usage.intents.map((intent) => (
                    <li key={intent.intent} className="flex items-center justify-between gap-2 rounded-sm border border-hairline px-2.5 py-2 text-[11.5px]">
                      <span className="truncate text-ink-secondary">{intent.intent}</span>
                      <span className="shrink-0 font-semibold text-ink-muted">{intent.count}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[11.5px] text-ink-muted">No intents recorded.</li>
                )}
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold text-ink">Timeline</h3>
            <div className="mt-2 space-y-1">
              {(usage.timeline || []).map((event) => (
                <div key={event.id} className="flex items-start gap-2 rounded-sm px-1.5 py-1.5 hover:bg-surface-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium capitalize text-ink-secondary">{event.type.replace(/_/g, ' ')}</p>
                    <p className="text-[9.5px] text-ink-muted">
                      {new Date(event.createdAt).toLocaleString()}
                      {event.meta?.intent ? ` · ${event.meta.intent}` : ''}
                      {event.meta?.language ? ` · ${event.meta.language}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {usage.timelinePage?.pages > 1 ? (
              <div className="mt-2 flex items-center justify-between">
                <Button size="sm" variant="ghost" disabled={timelinePage <= 1} onClick={() => setTimelinePage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-[10.5px] text-ink-muted">
                  Page {usage.timelinePage.page} of {usage.timelinePage.pages}
                </span>
                <Button size="sm" variant="ghost" disabled={timelinePage >= usage.timelinePage.pages} onClick={() => setTimelinePage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <Dialog
        open={Boolean(confirmStatus)}
        onClose={() => setConfirmStatus(null)}
        title={confirmStatus === 'disabled' ? 'Disable this student?' : 'Enable this student?'}
        description={
          confirmStatus === 'disabled'
            ? 'They will be signed out and cannot sign in until re-enabled. Their history is kept.'
            : 'They will be able to sign in and use CampusMate again.'
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmStatus(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmStatus === 'disabled' ? 'danger' : 'primary'}
              onClick={async () => {
                await onStatusChange(student.id, confirmStatus);
                setConfirmStatus(null);
              }}
            >
              {confirmStatus === 'disabled' ? 'Disable student' : 'Enable student'}
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          This action is recorded in the audit log and revokes active sessions immediately.
        </p>
      </Dialog>
    </Drawer>
  );
}

export default function DashboardStudents() {
  const { query } = useDashboardFilters();
  const { role } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const [status, setStatus] = useState(params.get('status') || 'all');
  const [page, setPage] = useState(Number(params.get('page')) || 1);
  const [sort, setSort] = useState(params.get('sort') || 'lastActive');
  const [dir, setDir] = useState(params.get('dir') || 'desc');
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const isSuper = role === 'superadmin';

  const { data, loading, error, retry, reload } = useDashboardData(
    () => api.dashboard.students({ ...query, search, status, page, limit: 25, sort, dir }),
    [query.from, query.to, query.semester, query.branch, query.includeDemo, query.bust, search, status, page, sort, dir]
  );

  useEffect(() => {
    const next = new URLSearchParams(params);
    const set = (key, value) => {
      if (!value || value === 'all' || value === 1) next.delete(key);
      else next.set(key, String(value));
    };
    set('search', search);
    set('status', status);
    set('page', page);
    set('sort', sort);
    set('dir', dir);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, page, sort, dir]);

  const changeSort = (nextSort) => {
    if (nextSort === sort) setDir((value) => (value === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(nextSort);
      setDir(nextSort === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const setStudentStatus = async (id, nextStatus) => {
    try {
      await api.dashboard.setStudentStatus(id, nextStatus);
      setMessage(`Student ${nextStatus === 'disabled' ? 'disabled' : 'enabled'}.`);
      setSelected((current) => (current ? { ...current, status: nextStatus } : current));
      reload();
    } catch (err) {
      setMessage(err.message || 'Could not update the student.');
    }
  };

  const students = data?.students || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">Students</h1>
          <p className="mt-1 text-[12px] text-ink-muted">
            {data ? `${data.total.toLocaleString()} students in the selected range` : 'Loading students…'}
          </p>
        </div>
        {!isSuper ? (
          <Tooltip label="Only superadmins can see full student identities. This is recorded in the audit policy." side="left">
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-surface-1 px-2.5 py-1.5 text-[11px] font-medium text-ink-muted">
              <Lock className="h-3 w-3" aria-hidden="true" /> Identities masked
            </span>
          </Tooltip>
        ) : (
          <Badge variant="accent" dot>
            Full identities
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name or email…"
            aria-label="Search students"
            className="h-9 w-full rounded-pill border border-hairline bg-surface-1 pl-9 pr-3 text-[12px] text-ink outline-none focus:border-accent"
          />
        </div>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Status filter"
          className="h-9 rounded-pill border border-hairline bg-surface-1 px-3 text-[11.5px] text-ink-secondary outline-none focus:border-accent"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <select
          value={sort}
          onChange={(event) => changeSort(event.target.value)}
          aria-label="Sort students"
          className="h-9 rounded-pill border border-hairline bg-surface-1 px-3 text-[11.5px] text-ink-secondary outline-none focus:border-accent"
        >
          {SORTS.map((item) => (
            <option key={item.id} value={item.id}>
              Sort: {item.label}
            </option>
          ))}
        </select>
        <Button size="sm" variant="ghost" onClick={() => setDir(dir === 'asc' ? 'desc' : 'asc')}>
          {dir === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
      </div>

      {message ? (
        <p className="rounded-sm border border-hairline bg-surface-2 px-3 py-2 text-[11.5px] text-ink-secondary" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}

      {error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-md" />
          ))}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table caption="Students">
              <THead>
                <TR>
                  {[
                    ['name', 'Student'],
                    ['lastActive', 'Last active'],
                    ['joined', 'Joined'],
                    ['queries', 'Queries'],
                    ['views', 'Doc views'],
                    ['conversations', 'Chats']
                  ].map(([id, label]) => (
                    <TH key={id}>
                      <button type="button" onClick={() => changeSort(id)} className="inline-flex items-center gap-1 hover:text-ink">
                        {label}
                        {sort === id ? <span aria-label={dir === 'asc' ? 'ascending' : 'descending'}>{dir === 'asc' ? '↑' : '↓'}</span> : null}
                      </button>
                    </TH>
                  ))}
                  <TH>Status</TH>
                  <TH align="right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {students.length === 0 ? (
                  <TR>
                    <TD colSpan={8} className="py-8 text-center text-ink-muted">
                      No students match these filters.
                    </TD>
                  </TR>
                ) : (
                  students.map((student) => (
                    <TR key={student.id} onClick={() => setSelected(student)}>
                      <TD>
                        <span className="font-medium text-ink">{student.name}</span>
                        <span className="block text-[10.5px] text-ink-muted">{student.email}</span>
                      </TD>
                      <TD className="whitespace-nowrap">{fmt(student.lastActive)}</TD>
                      <TD className="whitespace-nowrap">{fmt(student.createdAt)}</TD>
                      <TD align="right" className="tabular-nums">{student.queries}</TD>
                      <TD align="right" className="tabular-nums">{student.docViews}</TD>
                      <TD align="right" className="tabular-nums">{student.conversations}</TD>
                      <TD><StatusPill status={student.status} /></TD>
                      <TD align="right">
                        <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); setSelected(student); }}>
                          View
                        </Button>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>

          <div className="space-y-2 md:hidden">
            {students.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => setSelected(student)}
                className="w-full rounded-lg border border-hairline bg-surface-1 p-3 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{student.name}</p>
                    <p className="truncate text-[10.5px] text-ink-muted">{student.email}</p>
                  </div>
                  <StatusPill status={student.status} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10.5px] text-ink-muted">
                  <span>{student.queries} queries</span>
                  <span>{student.docViews} views</span>
                  <span>{student.conversations} chats</span>
                </div>
                <p className="mt-1 text-[9.5px] text-ink-muted">Last active {fmt(student.lastActive)}</p>
              </button>
            ))}
            {students.length === 0 ? (
              <p className="rounded-lg border border-hairline bg-surface-1 p-6 text-center text-[12px] text-ink-muted">No students match.</p>
            ) : null}
          </div>

          {data?.pages > 1 ? (
            <div className="flex items-center justify-between">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}>
                Previous
              </Button>
              <span className="text-[11px] text-ink-muted">
                Page {data.page} of {data.pages}
              </span>
              <Button size="sm" variant="secondary" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}

      <StudentDrawer
        student={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        filters={{ query }}
        onStatusChange={setStudentStatus}
      />
    </div>
  );
}
