import { useEffect, useState } from 'react';
import { Check, X, Calendar as CalendarIcon, RefreshCw, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table';
import { StatusPill } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';
import { formatDate } from '../../lib/format';

export function DatesReview() {
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await api.admin.calendar.listPending({ status: 'pending' });
      setEvents(res.events || []);
    } catch (err) {
      toast({ title: 'Could not load pending dates', description: err.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (id) => {
    setActingId(id);
    try {
      await api.admin.calendar.approve(id);
      toast({ title: 'Date approved', description: 'Event added to active calendar.', variant: 'success' });
      setEvents((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      toast({ title: 'Approve failed', description: err.message, variant: 'error' });
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id) => {
    setActingId(id);
    try {
      await api.admin.calendar.reject(id);
      toast({ title: 'Date rejected', description: 'Event rejected from calendar.', variant: 'default' });
      setEvents((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      toast({ title: 'Reject failed', description: err.message, variant: 'error' });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Extracted Date Candidates</h3>
          <p className="text-xs text-ink-muted">
            Dates automatically detected during document ingestion awaiting administrative confirmation.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadPending} disabled={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card className="p-4 space-y-2">
          <Skeleton variant="text" className="h-4 w-48" />
          <Skeleton variant="text" className="h-4 w-full" />
          <Skeleton variant="text" className="h-4 w-full" />
        </Card>
      ) : events.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent mb-2">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-ink">No pending dates for review</p>
          <p className="text-xs text-ink-muted mt-0.5">
            When new circulars with dates are uploaded, candidate milestones will appear here.
          </p>
        </Card>
      ) : (
        <Table caption="Pending candidate dates">
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Event Title</TH>
              <TH>Category</TH>
              <TH>Date(s)</TH>
              <TH>Source Document</TH>
              <TH>Needs Review</TH>
              <TH align="right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {events.map((ev) => (
              <TR key={ev._id}>
                <TD>
                  <div className="font-medium text-ink">{ev.title}</div>
                  {ev.titles?.hi && <div className="text-[11px] text-ink-muted">हिन्दी: {ev.titles.hi}</div>}
                  {ev.titles?.gu && <div className="text-[11px] text-ink-muted">ગુજરાતી: {ev.titles.gu}</div>}
                </TD>
                <TD>
                  <StatusPill status="default" label={ev.category?.toUpperCase() || 'OTHER'} />
                </TD>
                <TD className="text-xs text-ink">
                  {formatDate(ev.startDate)}
                  {ev.endDate && ev.endDate !== ev.startDate ? ` – ${formatDate(ev.endDate)}` : ''}
                </TD>
                <TD className="text-xs text-ink-muted">
                  {ev.sourceDocName || 'Notice'} (P. {ev.sourcePage || 1})
                </TD>
                <TD>
                  {ev.needsReview ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" /> Year inferred
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">Standard</span>
                  )}
                </TD>
                <TD align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="xs"
                      variant="primary"
                      disabled={actingId === ev._id}
                      onClick={() => handleApprove(ev._id)}
                      leftIcon={<Check className="h-3.5 w-3.5" />}
                    >
                      Approve
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={actingId === ev._id}
                      onClick={() => handleReject(ev._id)}
                      leftIcon={<X className="h-3.5 w-3.5" />}
                    >
                      Reject
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
