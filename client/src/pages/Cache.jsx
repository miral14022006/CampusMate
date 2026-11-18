import { useCallback, useEffect, useState } from 'react';
import {
  Database,
  Gauge,
  HardDrive,
  RefreshCw,
  Timer,
  Trash2,
  Zap
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCard } from '../components/ui/StatCard';
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table';
import { StatusPill } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';
import { useDocumentTitle } from '../lib/hooks';
import { formatCompactNumber, formatMs, formatNumber, formatPercent } from '../lib/format';

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline py-2.5 last:border-0">
      <span className="text-[11.5px] text-ink-muted">{label}</span>
      <span className={mono ? 'font-mono text-[11px] text-ink' : 'text-[12px] font-medium text-ink'}>{value}</span>
    </div>
  );
}

export default function Cache() {
  useDocumentTitle('Cache');
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [latency, setLatency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flushing, setFlushing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResult, latencyResult] = await Promise.allSettled([
        api.admin.cache.stats(),
        api.admin.cache.latency()
      ]);
      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value?.cache || statsResult.value);
      } else {
        throw statsResult.reason;
      }
      if (latencyResult.status === 'fulfilled') setLatency(latencyResult.value);
      else setLatency(null);
    } catch (err) {
      if (err.code !== 'ABORTED') setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flush = async () => {
    setFlushing(true);
    try {
      const result = await api.admin.cache.invalidate();
      toast({
        title: 'Cache flushed',
        description: `New index version ${result?.new_version || 'created'}. Next queries will recompute.`,
        variant: 'success'
      });
      setConfirmOpen(false);
      await load();
    } catch (err) {
      toast({ title: 'Could not flush cache', description: err.message, variant: 'error' });
    } finally {
      setFlushing(false);
    }
  };

  const cache = stats || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cache"
        subtitle="Server-side query cache and latency savings"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={load}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Refresh
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Flush cache
            </Button>
          </>
        }
      />

      {error ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-negative-soft text-[color:var(--negative)]">
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Could not read cache stats</h2>
            <p className="mt-1 max-w-md text-[12.5px] text-ink-muted">{error.message}</p>
          </div>
          <Button onClick={load}>Retry</Button>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Cache statistics">
            <StatCard
              icon={<Gauge className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />}
              label="Cache Hit Rate"
              value={cache.hit_rate_pct ?? 0}
              format={(value) => formatPercent(value, 1)}
              loading={loading}
              hint={`${formatCompactNumber(cache.hits || 0)} hits · ${formatCompactNumber(cache.misses || 0)} misses`}
            />
            <StatCard
              icon={<HardDrive className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />}
              label="Cached Entries"
              value={cache.mem_cached_entries ?? 0}
              format={formatNumber}
              loading={loading}
              hint={latency?.storage === 'transient_memory' ? 'In-memory fallback' : 'Redis + memory'}
            />
            <StatCard
              icon={<Timer className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />}
              label="Avg Latency Saved"
              value={cache.avg_saved_latency_ms ?? 0}
              format={formatMs}
              loading={loading}
              hint={`${formatMs(cache.total_saved_latency_ms || 0)} saved in total`}
            />
            <StatCard
              icon={<Zap className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />}
              label="Total Requests"
              value={cache.total_requests ?? 0}
              format={formatCompactNumber}
              loading={loading}
              hint={latency?.avg_gateway_latency_ms ? `Gateway avg ${formatMs(latency.avg_gateway_latency_ms)}` : 'Chat completion requests'}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card padding="none">
              <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                <div>
                  <h2 className="text-[14px] font-semibold text-ink">Cache internals</h2>
                  <p className="mt-0.5 text-[11.5px] text-ink-muted">Live counters from the gateway cache manager</p>
                </div>
                <StatusPill status={cache.total_requests > 0 ? 'active' : 'inactive'} label={cache.total_requests > 0 ? 'Warm' : 'Idle'} />
              </div>
              <div className="px-5 py-2">
                <DetailRow label="Index version" value={cache.index_version || '—'} mono />
                <DetailRow label="Hit rate" value={formatPercent(cache.hit_rate_pct || 0, 2)} />
                <DetailRow label="Hits" value={formatNumber(cache.hits || 0)} />
                <DetailRow label="Misses" value={formatNumber(cache.misses || 0)} />
                <DetailRow label="Invalidations" value={formatNumber(cache.invalidations || 0)} />
                <DetailRow label="In-memory entries" value={formatNumber(cache.mem_cached_entries || 0)} />
                <DetailRow label="Total saved latency" value={formatMs(cache.total_saved_latency_ms || 0)} />
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent-soft text-accent">
                  <Database className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[14px] font-semibold text-ink">Cache entries</h2>
                  <p className="mt-0.5 text-[11.5px] text-ink-muted">Per-key inspection</p>
                </div>
              </div>
              <EmptyState
                compact
                icon={<Database className="h-5 w-5" aria-hidden="true" />}
                title="Entry listing is not exposed"
                description="The gateway exposes aggregate counters and a flush action, but no endpoint returns individual cache keys. Document upload, re-index and flush all bump the index version."
              />
              <div className="rounded-sm bg-surface-2 px-3 py-2.5 text-[10.5px] leading-relaxed text-ink-muted">
                Flushing is safe: it only clears cached answers and forces the next request to recompute. Stored
                documents and conversations are untouched.
              </div>
            </Card>
          </div>

          {latency?.recent_samples?.length ? (
            <Card padding="none">
              <div className="border-b border-hairline px-5 py-4">
                <h2 className="text-[14px] font-semibold text-ink">Recent latency samples</h2>
                <p className="mt-0.5 text-[11.5px] text-ink-muted">Last {latency.recent_samples.length} gateway requests</p>
              </div>
              <Table className="rounded-none border-0 shadow-none">
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Time</TH>
                    <TH>Language</TH>
                    <TH>Intent</TH>
                    <TH>Cached</TH>
                    <TH align="right">Gateway</TH>
                  </TR>
                </THead>
                <TBody>
                  {latency.recent_samples.map((sample) => (
                    <TR key={sample._id || sample.requestId}>
                      <TD className="whitespace-nowrap">{new Date(sample.timestamp).toLocaleTimeString()}</TD>
                      <TD>{sample.language}</TD>
                      <TD>{sample.intent}</TD>
                      <TD>{sample.cached ? 'Yes' : 'No'}</TD>
                      <TD align="right" className="tabular">{formatMs(sample.totalGatewayLatencyMs)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Card>
          ) : null}
        </>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Flush the query cache?"
        description="All cached answers are cleared and the index version is bumped."
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={flushing} onClick={flush}>
              Flush cache
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          The next requests will be slower until the cache warms again. Documents, conversations and analytics are not
          affected.
        </p>
      </Dialog>
    </div>
  );
}
