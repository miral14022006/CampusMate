import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Lock, MessageSquare, Search, ShieldCheck } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useDashboardFilters } from './DashboardFilters';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { Drawer } from '../../../components/ui/Drawer';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../components/ui/Table';
import { ErrorState, useDashboardData } from './DashboardBits';

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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

function TranscriptDrawer({ sessionId, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !sessionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.dashboard
      .chat(sessionId)
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
  }, [open, sessionId]);

  const transcript = data?.transcript;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={transcript?.title || 'Conversation transcript'}
      description={transcript ? `${transcript.identity?.name || 'Guest'} · ${transcript.identity?.email || 'no account'}` : 'Loading transcript…'}
      size="lg"
      icon={<MessageSquare className="h-4 w-4" />}
      footer={
        <span className="mr-auto inline-flex items-center gap-1.5 text-[10.5px] text-ink-muted">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          Opening this transcript was recorded in the audit log.
        </span>
      }
    >
      {error ? (
        <ErrorState error={error} />
      ) : loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-md" />
          ))}
        </div>
      ) : transcript ? (
        <div className="space-y-3">
          <div className="rounded-sm border border-hairline bg-surface-2 px-3 py-2 text-[11px] text-ink-muted">
            Read-only. Pipeline metadata is shown for each assistant message.
          </div>
          {transcript.messages.map((message) => (
            <div
              key={message.id}
              className={
                message.sender === 'user'
                  ? 'ml-auto max-w-[88%] rounded-lg rounded-br-sm bg-accent-soft px-3.5 py-2.5'
                  : 'mr-auto max-w-[92%] rounded-lg rounded-bl-sm border border-hairline bg-surface-2 px-3.5 py-2.5'
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  {message.sender === 'user' ? 'Student' : 'Assistant'}
                </span>
                <span className="text-[9px] text-ink-muted">{fmt(message.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-secondary">{message.text}</p>
              {message.sender !== 'user' ? (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-hairline pt-2 text-[9.5px] text-ink-muted">
                  <span className="rounded-pill bg-surface-1 px-2 py-0.5">Lang {message.language || '—'}</span>
                  <span className="rounded-pill bg-surface-1 px-2 py-0.5">Intent {message.intent || '—'}</span>
                  <span className="rounded-pill bg-surface-1 px-2 py-0.5">
                    Confidence {message.confidence != null ? `${Math.round(Number(message.confidence) * 100)}%` : '—'}
                  </span>
                  {message.sourceDoc ? (
                    <span className="max-w-[220px] truncate rounded-pill bg-surface-1 px-2 py-0.5">Source {message.sourceDoc}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </Drawer>
  );
}

export default function DashboardChats() {
  const { query } = useDashboardFilters();
  const { role } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const [language, setLanguage] = useState(params.get('language') || 'all');
  const [intent, setIntent] = useState(params.get('intent') || 'all');
  const [fallback, setFallback] = useState(params.get('fallback') === 'true');
  const [feedback, setFeedback] = useState(params.get('feedback') || 'all');
  const [page, setPage] = useState(Number(params.get('page')) || 1);
  const [active, setActive] = useState(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [exporting, setExporting] = useState(false);
  const isSuper = role === 'superadmin';

  const { data, loading, error, retry } = useDashboardData(
    () => api.dashboard.chats({ ...query, search, language, intent, fallback: fallback ? 'true' : undefined, feedback, page, limit: 20 }),
    [query.from, query.to, query.includeDemo, query.bust, search, language, intent, fallback, feedback, page]
  );

  useEffect(() => {
    const next = new URLSearchParams(params);
    const set = (key, value) => {
      if (!value || value === 'all' || value === false) next.delete(key);
      else next.set(key, String(value));
    };
    set('search', search);
    set('language', language);
    set('intent', intent);
    set('fallback', fallback);
    set('feedback', feedback);
    set('page', page);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, language, intent, fallback, feedback, page]);

  const openTranscript = (chat) => {
    const seen = sessionStorage.getItem('cm_audit_notice_seen') === '1';
    if (!seen) {
      setPending(chat);
      setNoticeOpen(true);
      return;
    }
    setActive(chat.sessionId);
  };

  const confirmNotice = () => {
    sessionStorage.setItem('cm_audit_notice_seen', '1');
    setNoticeOpen(false);
    setActive(pending?.sessionId || null);
    setPending(null);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const result = await api.dashboard.exportCsv('chats', { ...query, language, intent, fallback: fallback ? 'true' : undefined, feedback, search });
      download(result.blob, 'chats.csv');
    } finally {
      setExporting(false);
    }
  };

  const chats = data?.chats || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">Chats</h1>
          <p className="mt-1 text-[12px] text-ink-muted">
            {data ? `${data.total.toLocaleString()} conversations in range` : 'Loading conversations…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isSuper ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-surface-1 px-2.5 py-1.5 text-[11px] font-medium text-ink-muted">
              <Lock className="h-3 w-3" aria-hidden="true" /> Identities masked
            </span>
          ) : (
            <Badge variant="accent" dot>Full identities</Badge>
          )}
          <Button size="sm" variant="secondary" onClick={exportCsv} loading={exporting} leftIcon={<Download className="h-3.5 w-3.5" />}>
            Export CSV
          </Button>
        </div>
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
            placeholder="Search conversation title or preview…"
            aria-label="Search conversations"
            className="h-9 w-full rounded-pill border border-hairline bg-surface-1 pl-9 pr-3 text-[12px] text-ink outline-none focus:border-accent"
          />
        </div>
        <select value={language} onChange={(event) => { setLanguage(event.target.value); setPage(1); }} aria-label="Language filter" className="h-9 rounded-pill border border-hairline bg-surface-1 px-3 text-[11.5px] text-ink-secondary outline-none focus:border-accent">
          <option value="all">All languages</option>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="gu">Gujarati</option>
          <option value="hi-Latn">Hinglish</option>
          <option value="gu-Latn">Gujlish</option>
        </select>
        <select value={intent} onChange={(event) => { setIntent(event.target.value); setPage(1); }} aria-label="Intent filter" className="h-9 max-w-[170px] rounded-pill border border-hairline bg-surface-1 px-3 text-[11.5px] text-ink-secondary outline-none focus:border-accent">
          {['all', 'exam_form_deadline', 'fee_payment', 'hostel', 'holidays', 'scholarship', 'out_of_scope'].map((value) => (
            <option key={value} value={value}>{value === 'all' ? 'All intents' : value}</option>
          ))}
        </select>
        <select value={feedback} onChange={(event) => { setFeedback(event.target.value); setPage(1); }} aria-label="Feedback filter" className="h-9 rounded-pill border border-hairline bg-surface-1 px-3 text-[11.5px] text-ink-secondary outline-none focus:border-accent">
          <option value="all">All feedback</option>
          <option value="up">Thumbs up</option>
          <option value="down">Thumbs down</option>
          <option value="none">No feedback</option>
        </select>
        <label className="flex items-center gap-1.5 rounded-pill border border-hairline px-2.5 py-1.5 text-[11px] text-ink-secondary">
          <input type="checkbox" checked={fallback} onChange={(event) => { setFallback(event.target.checked); setPage(1); }} className="h-3 w-3 accent-[color:var(--accent)]" />
          Fallback only
        </label>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-md" />)}
        </div>
      ) : (
        <>
          <Table caption="Conversations">
            <THead>
              <TR>
                <TH>Conversation</TH>
                <TH>Student</TH>
                <TH>Language</TH>
                <TH>Intent</TH>
                <TH>Fallback</TH>
                <TH>Feedback</TH>
                <TH align="right">Messages</TH>
                <TH>Updated</TH>
                <TH align="right">Transcript</TH>
              </TR>
            </THead>
            <TBody>
              {chats.length === 0 ? (
                <TR>
                  <TD colSpan={9} className="py-8 text-center text-ink-muted">No conversations match these filters.</TD>
                </TR>
              ) : (
                chats.map((chat) => (
                  <TR key={chat.id} onClick={() => openTranscript(chat)}>
                    <TD>
                      <span className="line-clamp-1 font-medium text-ink">{chat.title || 'Untitled conversation'}</span>
                      <span className="line-clamp-1 text-[10px] text-ink-muted">{chat.preview}</span>
                    </TD>
                    <TD>
                      <span className="text-[12px]">{chat.identity?.name || 'Guest'}</span>
                      <span className="block text-[10px] text-ink-muted">{chat.identity?.email}</span>
                    </TD>
                    <TD>{chat.language || '—'}</TD>
                    <TD className="max-w-[150px] truncate">{chat.intent || '—'}</TD>
                    <TD>{chat.fallback ? <Badge variant="warning">Fallback</Badge> : '—'}</TD>
                    <TD>{chat.feedback ? <Badge variant={chat.feedback === 'up' ? 'positive' : 'negative'}>{chat.feedback}</Badge> : '—'}</TD>
                    <TD align="right" className="tabular-nums">{chat.messageCount}</TD>
                    <TD className="whitespace-nowrap">{fmt(chat.updatedAt)}</TD>
                    <TD align="right">
                      <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); openTranscript(chat); }}>
                        Open
                      </Button>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>

          {data?.pages > 1 ? (
            <div className="flex items-center justify-between">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}>Previous</Button>
              <span className="text-[11px] text-ink-muted">Page {data.page} of {data.pages}</span>
              <Button size="sm" variant="secondary" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>Next</Button>
            </div>
          ) : null}
        </>
      )}

      <Dialog
        open={noticeOpen}
        onClose={() => { setNoticeOpen(false); setPending(null); }}
        title="This transcript is audited"
        description="Opening a student conversation is recorded in the audit log."
        size="sm"
        icon={<ShieldCheck className="h-4 w-4" />}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setNoticeOpen(false); setPending(null); }}>Cancel</Button>
            <Button onClick={confirmNotice}>I understand, open transcript</Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          The log records who opened which transcript and when. Read-only access helps improve answers and resolve
          disputes. Do not copy personal content outside the console.
        </p>
      </Dialog>

      <TranscriptDrawer sessionId={active} open={Boolean(active)} onClose={() => setActive(null)} />
    </div>
  );
}
