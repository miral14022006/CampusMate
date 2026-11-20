import { useEffect, useState } from 'react';
import { CalendarDays, RefreshCw, Check, X } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table';
import { StatusPill } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';
import { formatDate } from '../../lib/format';
import { useDocumentTitle } from '../../lib/hooks';

export default function AdminDatesPage() {
  useDocumentTitle('Important Dates · Admin Console');
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [datePage, setDatePage] = useState(1);
  const [datePageSize, setDatePageSize] = useState(10);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await api.admin.calendar.listPending({ status: 'all' });
      setEvents(res.events || []);
    } catch (err) {
      toast({ title: 'Could not load dates', description: err.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleApprove = async (id) => {
    setActingId(id);
    try {
      await api.admin.calendar.approve(id);
      toast({ title: 'Date approved', description: 'Event added to active student calendar.', variant: 'success' });
      setEvents((prev) =>
        prev.map((e) => (e._id === id ? { ...e, approvalStatus: 'approved' } : e))
      );
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
      toast({ title: 'Date rejected', description: 'Event removed from candidate list.', variant: 'neutral' });
      setEvents((prev) =>
        prev.map((e) => (e._id === id ? { ...e, approvalStatus: 'rejected' } : e))
      );
    } catch (err) {
      toast({ title: 'Reject failed', description: err.message, variant: 'error' });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Important Dates & Academic Events"
        description="Review, approve, or reject candidate exam schedules, fee deadlines, and holidays detected from uploaded circulars."
        actions={
          <Button variant="secondary" size="sm" onClick={loadEvents} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <Card orientation="vertical" padding="p-0" className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
              title="No candidate dates found"
              description="Upload new circulars or notices to automatically extract upcoming academic deadlines and events."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Event Title</TH>
                  <TH>Date & Time</TH>
                  <TH>Category</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {events
                  .slice((datePage - 1) * datePageSize, datePage * datePageSize)
                  .map((evt) => (
                  <TR key={evt._id}>
                    <TD className="font-semibold text-white">
                      {evt.title}
                      {evt.description && (
                        <p className="text-[12px] font-normal text-zinc-400 mt-0.5 line-clamp-1">{evt.description}</p>
                      )}
                    </TD>
                    <TD className="text-zinc-300">
                      {formatDate(evt.start_date || evt.startDate)}
                    </TD>
                    <TD>
                      <span className="rounded-pill bg-white/10 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                        {evt.category || 'General'}
                      </span>
                    </TD>
                    <TD>
                      <StatusPill status={evt.approvalStatus === 'approved' ? 'active' : evt.approvalStatus === 'rejected' ? 'failed' : 'pending'} />
                    </TD>
                    <TD className="text-right">
                      {evt.approvalStatus === 'pending' || !evt.approvalStatus ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="xs"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            onClick={() => handleApprove(evt._id)}
                            loading={actingId === evt._id}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => handleReject(evt._id)}
                            loading={actingId === evt._id}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[12px] font-medium text-zinc-400 capitalize">
                          {evt.approvalStatus}
                        </span>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}

        {events.length > 0 ? (
          <div className="px-6 py-2">
            <Pagination
              page={datePage}
              totalPages={Math.ceil(events.length / datePageSize) || 1}
              totalItems={events.length}
              pageSize={datePageSize}
              onPageChange={(p) => setDatePage(p)}
              onPageSizeChange={(sz) => {
                setDatePageSize(sz);
                setDatePage(1);
              }}
              pageSizeOptions={[5, 10, 20]}
              itemName="dates & events"
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
