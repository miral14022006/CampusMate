import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  MessageSquareHeart,
  RefreshCw,
  ThumbsDown,
  ThumbsUp
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Drawer } from '../components/ui/Drawer';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusPill } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';
import { useDocumentTitle, useInterval } from '../lib/hooks';
import {
  formatPercent,
  formatRelativeTime,
  languageLabel,
  titleCaseIntent,
  truncate
} from '../lib/format';
import { cn } from '../lib/cn';

const PAGE_SIZE = 12;

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'review', label: 'Needs Review' }
];

function isPositive(item) {
  return item.rating === 'up';
}
function isNegative(item) {
  return item.rating === 'down';
}
function needsReview(item) {
  return item.reviewStatus === 'pending';
}

function statusFor(item) {
  if (needsReview(item)) return { key: 'pending', label: 'Needs Review' };
  if (isPositive(item)) return { key: 'positive', label: 'Positive' };
  if (isNegative(item)) return { key: 'negative', label: 'Negative' };
  return { key: 'pending', label: 'Needs Review' };
}

function titleFor(item) {
  if (isPositive(item)) return 'Great response!';
  if (isNegative(item)) return "Didn't find the answer";
  return 'Auto-flagged answer';
}

function subtitleFor(item) {
  return item.comment?.trim() || item.query || 'No comment provided.';
}

function RatingIcon({ item }) {
  if (isPositive(item)) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <ThumbsUp className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </span>
    );
  }
  if (isNegative(item)) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-negative-soft text-[color:var(--negative)]">
        <ThumbsDown className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warn-soft text-[color:var(--warning)]">
      <AlertTriangle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
    </span>
  );
}

export default function Feedback() {
  useDocumentTitle('Feedback & Reviews');
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [correctIntent, setCorrectIntent] = useState('');
  const [correctDoc, setCorrectDoc] = useState('');

  useInterval(() => setNow(Date.now()), 30000);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.admin.feedback.queue({});
      setItems(data?.queue || []);
    } catch (err) {
      if (err.code !== 'ABORTED') setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: items.length,
      positive: items.filter(isPositive).length,
      negative: items.filter(isNegative).length,
      review: items.filter(needsReview).length
    }),
    [items]
  );

  const filtered = useMemo(() => {
    if (tab === 'positive') return items.filter(isPositive);
    if (tab === 'negative') return items.filter(isNegative);
    if (tab === 'review') return items.filter(needsReview);
    return items;
  }, [items, tab]);

  const shown = filtered.slice(0, visible);

  const openItem = (item) => {
    setSelected(item);
    setCorrectIntent(item.correctIntent || '');
    setCorrectDoc(item.correctDoc || '');
  };

  const review = async (payload, successMessage) => {
    if (!selected) return;
    setBusy(true);
    try {
      const data = await api.admin.feedback.review(selected._id, payload);
      const updated = data?.item || { ...selected, ...payload };
      setItems((current) => current.map((item) => (item._id === selected._id ? { ...item, ...updated } : item)));
      toast({ title: successMessage, description: 'Review queue updated.', variant: 'success' });
      setSelected(null);
    } catch (err) {
      toast({ title: 'Could not update review', description: err.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const exportDataset = async () => {
    setExporting(true);
    try {
      const data = await api.admin.feedback.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `campusmate_retraining_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({
        title: 'Dataset exported',
        description: `${data?.count || 0} approved records downloaded.`,
        variant: 'success'
      });
    } catch (err) {
      toast({ title: 'Export failed', description: err.message, variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback & Reviews"
        subtitle="User feedback and review queue"
        actions={
          <Button
            variant="secondary"
            size="sm"
            loading={exporting}
            onClick={exportDataset}
            leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Export dataset
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          items={TABS.map((item) => ({ ...item, count: counts[item.value] }))}
          value={tab}
          onChange={(value) => {
            setTab(value);
            setVisible(PAGE_SIZE);
          }}
          label="Feedback filters"
        />
        {!loading ? (
          <p className="text-[11px] text-ink-muted">
            Showing {shown.length} of {filtered.length}
          </p>
        ) : null}
      </div>

      {error ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-negative-soft text-[color:var(--negative)]">
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Could not load feedback</h2>
            <p className="mt-1 max-w-md text-[12.5px] text-ink-muted">{error.message}</p>
          </div>
          <Button onClick={load}>Retry</Button>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          {loading ? (
            <div className="divide-y divide-[color:var(--border)]">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-4">
                  <Skeleton variant="circle" className="h-9 w-9" />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="text" className="h-3 w-44" />
                    <Skeleton variant="text" className="h-2.5 w-64" />
                  </div>
                  <Skeleton variant="pill" className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              icon={<MessageSquareHeart className="h-5 w-5" aria-hidden="true" />}
              title={tab === 'all' ? 'No feedback yet' : 'Nothing in this filter'}
              description={
                tab === 'all'
                  ? 'Ratings and auto-flagged failures will show up here as students use the assistant.'
                  : 'Try another filter or wait for new responses.'
              }
            />
          ) : (
            <ul className="divide-y divide-[color:var(--border)]">
              {shown.map((item) => {
                const state = statusFor(item);
                return (
                  <li key={item._id}>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 sm:px-5"
                    >
                      <RatingIcon item={item} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold text-ink">{titleFor(item)}</span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-ink-muted">
                          {truncate(subtitleFor(item), 110)}
                        </span>
                        <span className="mt-1 block text-[10px] text-ink-muted">
                          {languageLabel(item.pipelineSnapshot?.language)} ·{' '}
                          {titleCaseIntent(item.pipelineSnapshot?.intent || item.correctIntent)} ·{' '}
                          {formatRelativeTime(item.createdAt, now)}
                        </span>
                      </span>
                      <span className="mt-0.5 hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                        <StatusPill status={state.key} label={state.label} />
                        <span className="text-[10px] text-ink-muted">{formatRelativeTime(item.createdAt, now)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!loading && filtered.length > visible ? (
            <div className="border-t border-hairline p-4 text-center">
              <Button variant="secondary" size="sm" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
                Load more ({filtered.length - visible} remaining)
              </Button>
            </div>
          ) : null}
        </Card>
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Feedback detail"
        description={selected ? `${languageLabel(selected.pipelineSnapshot?.language)} · ${formatRelativeTime(selected.createdAt, now)}` : undefined}
        icon={<MessageSquareHeart className="h-4 w-4" aria-hidden="true" />}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              loading={busy}
              onClick={() => review({ reviewStatus: 'rejected' }, 'Marked as rejected')}
            >
              Reject
            </Button>
            <Button
              variant="secondary"
              loading={busy}
              onClick={() => review({ reviewStatus: 'approved' }, 'Approved for retraining')}
            >
              Approve
            </Button>
            <Button
              loading={busy}
              onClick={() =>
                review(
                  {
                    correctIntent: correctIntent.trim() || null,
                    correctDoc: correctDoc.trim() || null,
                    reviewStatus: 'approved'
                  },
                  'Correction saved'
                )
              }
            >
              Save correction
            </Button>
          </>
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={statusFor(selected).key} label={statusFor(selected).label} />
              <span className="rounded-pill bg-surface-2 px-2 py-1 text-[10px] font-semibold capitalize text-ink-secondary">
                {selected.rating?.replace('_', ' ')}
              </span>
              {selected.reason ? (
                <span className="rounded-pill bg-surface-2 px-2 py-1 text-[10px] font-semibold capitalize text-ink-muted">
                  {selected.reason.replaceAll('_', ' ')}
                </span>
              ) : null}
            </div>

            <section>
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Question</h3>
              <p className="mt-1.5 rounded-md border border-hairline bg-surface-2 px-3.5 py-3 text-[13px] leading-relaxed text-ink">
                {selected.query}
              </p>
            </section>

            <section>
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Answer given</h3>
              <p className="mt-1.5 whitespace-pre-wrap rounded-md border border-hairline bg-surface-2 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-secondary">
                {selected.pipelineSnapshot?.answer || 'No answer snapshot was stored.'}
              </p>
            </section>

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Language', languageLabel(selected.pipelineSnapshot?.language)],
                ['Intent', titleCaseIntent(selected.pipelineSnapshot?.intent)],
                ['Confidence', formatPercent((selected.pipelineSnapshot?.confidence || 0) * 100)],
                ['Decision', selected.pipelineSnapshot?.decision || '—']
              ].map(([label, value]) => (
                <div key={label} className="rounded-sm border border-hairline bg-surface-2 px-3 py-2">
                  <p className="text-[9.5px] uppercase tracking-[0.08em] text-ink-muted">{label}</p>
                  <p className="mt-0.5 truncate text-[11.5px] font-semibold text-ink">{value}</p>
                </div>
              ))}
            </section>

            <section>
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Citations used</h3>
              {selected.pipelineSnapshot?.retrievedDocs?.length || selected.pipelineSnapshot?.retrievedChunkIds?.length ? (
                <div className="mt-2 space-y-1.5">
                  {(selected.pipelineSnapshot?.retrievedDocs || []).map((doc) => (
                    <p key={doc} className="rounded-sm border border-hairline px-3 py-2 text-[11.5px] text-ink-secondary">
                      {doc}
                    </p>
                  ))}
                  {selected.pipelineSnapshot?.retrievedChunkIds?.length ? (
                    <p className="text-[10px] text-ink-muted">
                      {selected.pipelineSnapshot.retrievedChunkIds.length} chunk(s):{' '}
                      {selected.pipelineSnapshot.retrievedChunkIds.slice(0, 6).join(', ')}
                      {selected.pipelineSnapshot.retrievedChunkIds.length > 6 ? '…' : ''}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1.5 text-[11.5px] text-ink-muted">No citations were recorded for this answer.</p>
              )}
            </section>

            {selected.comment ? (
              <section>
                <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Student comment</h3>
                <p className="mt-1.5 text-[12.5px] italic leading-relaxed text-ink-secondary">“{selected.comment}”</p>
              </section>
            ) : null}

            <section className="rounded-md border border-[color:var(--accent-ring)] bg-accent-soft p-4">
              <h3 className="text-[12px] font-semibold text-ink">Annotate for retraining</h3>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-muted">
                Corrections are saved with the feedback record and included in the approved retraining export.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="correct-intent" className="mb-1 block text-[10.5px] font-semibold text-ink-secondary">
                    Correct intent
                  </label>
                  <input
                    id="correct-intent"
                    value={correctIntent}
                    onChange={(event) => setCorrectIntent(event.target.value)}
                    placeholder="exam_form_deadline"
                    className="h-9 w-full rounded-pill border border-hairline bg-surface-1 px-3 text-[11.5px] text-ink outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="correct-doc" className="mb-1 block text-[10.5px] font-semibold text-ink-secondary">
                    Correct document
                  </label>
                  <input
                    id="correct-doc"
                    value={correctDoc}
                    onChange={(event) => setCorrectDoc(event.target.value)}
                    placeholder="exam_notice_2025.pdf"
                    className="h-9 w-full rounded-pill border border-hairline bg-surface-1 px-3 text-[11.5px] text-ink outline-none focus:border-accent"
                  />
                </div>
              </div>
            </section>

            <div className={cn('flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-ink-muted')}>
              <span>Message: {selected.messageId}</span>
              <span>Session: {selected.sessionId}</span>
              {selected.reviewedBy ? <span>Reviewed by {selected.reviewedBy}</span> : null}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
