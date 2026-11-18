import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Archive,
  Eye,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  Calendar as CalendarIcon
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Drawer } from '../components/ui/Drawer';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusPill } from '../components/ui/Badge';
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table';
import { Tooltip } from '../components/ui/Tooltip';
import { useToast } from '../components/ui/Toast';
import { UploadDialog } from '../features/admin/UploadDialog';
import { DatesReview } from '../features/admin/DatesReview';
import { api } from '../services/api';
import { useDocumentTitle } from '../lib/hooks';
import { formatDate, formatNumber } from '../lib/format';
import { cn } from '../lib/cn';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'archived', label: 'Archived' }
];

function fileType(doc) {
  const name = doc.original_name || doc.file_name || doc.title || '';
  const extension = name.includes('.') ? name.split('.').pop().toUpperCase() : '';
  if (['JPEG'].includes(extension)) return 'JPG';
  return extension || '—';
}

function displayStatus(doc) {
  if (doc.processing_status === 'failed') return { key: 'failed', label: 'Failed' };
  if (doc.processing_status === 'pending' || doc.processing_status === 'processing') {
    return { key: 'indexing', label: 'Indexing' };
  }
  if (doc.status === 'superseded') return { key: 'superseded', label: 'Superseded' };
  if (doc.status === 'archived') return { key: 'archived', label: 'Archived' };
  return { key: 'active', label: 'Active' };
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-hairline py-2.5 last:border-0">
      <span className="text-[11.5px] text-ink-muted">{label}</span>
      <span className="max-w-[65%] break-words text-right text-[12px] font-medium text-ink">{children || '—'}</span>
    </div>
  );
}

export default function Documents() {
  useDocumentTitle('Documents Management');
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') === 'dates' ? 'dates' : 'documents');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'dates') setActiveTab('dates');
    else if (!tab) setActiveTab('documents');
  }, [searchParams]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'dates') setSearchParams({ tab: 'dates' });
    else setSearchParams({});
  };
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.admin.documents.list();
      setDocuments(data?.documents || []);
    } catch (err) {
      if (err.code !== 'ABORTED') setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((doc) => {
      const statusMatch = status === 'all' || displayStatus(doc).key === status;
      if (!statusMatch) return false;
      if (!query) return true;
      return [doc.title, doc.original_name, doc.file_name, doc.topic_key, doc.department]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [documents, search, status]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.admin.documents.remove(deleteTarget._id);
      toast({ title: 'Document deleted', description: deleteTarget.title, variant: 'success' });
      setDeleteTarget(null);
      setViewing(null);
      await load();
    } catch (err) {
      toast({ title: 'Could not delete document', description: err.message, variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const archive = async (doc) => {
    setArchiving(true);
    try {
      await api.admin.documents.setStatus(doc._id, 'archived');
      toast({ title: 'Document archived', description: doc.title, variant: 'success' });
      setViewing(null);
      await load();
    } catch (err) {
      toast({ title: 'Could not archive document', description: err.message, variant: 'error' });
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents Management"
        subtitle="Manage college notices and circulars"
        actions={
          <Button
            variant="outline"
            onClick={() => setUploadOpen(true)}
            leftIcon={<UploadCloud className="h-4 w-4" aria-hidden="true" />}
          >
            Upload Document
          </Button>
        }
      />

      <div className="flex border-b border-hairline gap-4 text-sm font-medium">
        <button
          type="button"
          onClick={() => switchTab('documents')}
          className={cn(
            'pb-2.5 transition-colors border-b-2 font-medium',
            activeTab === 'documents'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          All Documents
        </button>
        <button
          type="button"
          onClick={() => switchTab('dates')}
          className={cn(
            'pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 font-medium',
            activeTab === 'dates'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          Dates Review
        </button>
      </div>

      {activeTab === 'dates' ? (
        <DatesReview />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search documents"
            aria-label="Search documents"
            className="h-10 w-full rounded-pill border border-hairline bg-surface-1 pl-9 pr-3 text-[12.5px] text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-ink-muted sm:inline">
            {loading ? 'Loading…' : `${filtered.length} of ${documents.length} documents`}
          </span>
          <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} label="Filter by status" size="sm" />
        </div>
      </div>

      {error ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-negative-soft text-[color:var(--negative)]">
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Could not load documents</h2>
            <p className="mt-1 max-w-md text-[12.5px] text-ink-muted">{error.message}</p>
          </div>
          <Button onClick={load}>Retry</Button>
        </Card>
      ) : (
        <Table caption="Uploaded campus documents" sticky>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>File Name</TH>
              <TH>Type</TH>
              <TH>Uploaded On</TH>
              <TH>Status</TH>
              <TH align="right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {loading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <TR key={index} className="hover:bg-transparent">
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Skeleton variant="circle" className="h-7 w-7" />
                        <Skeleton variant="text" className="h-3 w-44" />
                      </div>
                    </TD>
                    <TD><Skeleton variant="text" className="h-3 w-10" /></TD>
                    <TD><Skeleton variant="text" className="h-3 w-24" /></TD>
                    <TD><Skeleton variant="pill" className="h-5 w-16" /></TD>
                    <TD align="right"><Skeleton variant="text" className="ml-auto h-3 w-12" /></TD>
                  </TR>
                ))
              : filtered.map((doc) => {
                  const state = displayStatus(doc);
                  const type = fileType(doc);
                  return (
                    <TR key={doc._id}>
                      <TD>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent">
                            <FileText className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">{doc.title}</span>
                            <span className="mt-0.5 block truncate text-[10.5px] text-ink-muted">
                              {doc.original_name || doc.file_name || doc.topic_key}
                            </span>
                          </span>
                        </div>
                      </TD>
                      <TD>
                        <span className="rounded-[5px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-secondary">
                          {type}
                        </span>
                      </TD>
                      <TD className="whitespace-nowrap">{formatDate(doc.upload_date || doc.createdAt)}</TD>
                      <TD>
                        <StatusPill status={state.key} label={state.label} />
                      </TD>
                      <TD align="right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Tooltip label="View details" side="top">
                            <button
                              type="button"
                              onClick={() => setViewing(doc)}
                              aria-label={`View details for ${doc.title}`}
                              className="rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                            >
                              <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Delete document" side="top">
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(doc)}
                              aria-label={`Delete ${doc.title}`}
                              className="rounded-full p-2 text-ink-muted transition-colors hover:bg-negative-soft hover:text-[color:var(--negative)]"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                            </button>
                          </Tooltip>
                        </div>
                      </TD>
                    </TR>
                  );
                })}

            {!loading && filtered.length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={5} className="p-0">
                  <EmptyState
                    icon={<FileText className="h-5 w-5" aria-hidden="true" />}
                    title={documents.length === 0 ? 'No documents yet' : 'No matching documents'}
                    description={
                      documents.length === 0
                        ? 'Upload a notice, circular or scanned PDF to start indexing.'
                        : 'Try a different search term or status filter.'
                    }
                    action={
                      documents.length === 0 ? (
                        <Button
                          size="sm"
                          onClick={() => setUploadOpen(true)}
                          leftIcon={<UploadCloud className="h-4 w-4" aria-hidden="true" />}
                        >
                          Upload Document
                        </Button>
                      ) : null
                    }
                  />
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      )}
        </>
      )}

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={load} />

      <Drawer
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.title}
        description={viewing?.original_name || viewing?.file_name || viewing?.topic_key}
        icon={<FileText className="h-4 w-4" aria-hidden="true" />}
        footer={
          <>
            {viewing?.status === 'active' ? (
              <Button
                variant="secondary"
                loading={archiving}
                onClick={() => archive(viewing)}
                leftIcon={<Archive className="h-4 w-4" aria-hidden="true" />}
              >
                Archive
              </Button>
            ) : null}
            <Button variant="danger" onClick={() => setDeleteTarget(viewing)} leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setViewing(null)}>
              Close
            </Button>
          </>
        }
      >
        {viewing ? (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <StatusPill status={displayStatus(viewing).key} label={displayStatus(viewing).label} />
              <span className="rounded-pill bg-surface-2 px-2 py-1 text-[10px] font-semibold text-ink-secondary">
                v{viewing.version}
              </span>
              <span className="rounded-pill bg-surface-2 px-2 py-1 text-[10px] font-semibold text-ink-secondary">
                {fileType(viewing)}
              </span>
            </div>

            <div className="rounded-md border border-hairline bg-surface-2 px-4">
              <DetailRow label="Topic key">{viewing.topic_key}</DetailRow>
              <DetailRow label="Document type">{viewing.doc_type}</DetailRow>
              <DetailRow label="Department">{viewing.department}</DetailRow>
              <DetailRow label="Effective date">{formatDate(viewing.effective_date)}</DetailRow>
              <DetailRow label="Uploaded">{formatDate(viewing.upload_date || viewing.createdAt, { withTime: true })}</DetailRow>
              <DetailRow label="Chunks indexed">{formatNumber(viewing.chunk_count || 0)}</DetailRow>
              <DetailRow label="Index version">{viewing.index_version || '—'}</DetailRow>
              <DetailRow label="Processing">{viewing.processing_status}</DetailRow>
              <DetailRow label="Stored file">{viewing.file_name}</DetailRow>
              <DetailRow label="Checksum">
                <code className="break-all font-mono text-[10px] text-ink-muted">{viewing.checksum}</code>
              </DetailRow>
            </div>

            {viewing.supersedes ? (
              <p className="mt-3 text-[11px] text-ink-muted">
                This version supersedes an earlier document.{' '}
                {typeof viewing.supersedes === 'object' ? viewing.supersedes.title : ''}
              </p>
            ) : null}

            <p className={cn('mt-4 text-[11px] leading-relaxed text-ink-muted')}>
              Deleting removes the record and stored file, then rebuilds both search indexes. Active versioning is
              preserved for other documents with the same topic key.
            </p>
          </div>
        ) : null}
      </Drawer>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete document?"
        description={`“${deleteTarget?.title || ''}” will be removed from storage and both search indexes.`}
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete document
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          This cannot be undone. If this document has newer versions, they are not affected.
        </p>
      </Dialog>
    </div>
  );
}
