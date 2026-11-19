import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Download, FileText, Minus, Plus, RefreshCw, ZoomIn } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { useDocumentTitle } from '../../lib/hooks';
import { api } from '../../services/api';

export default function DocumentViewer() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const page = Number(params.get('page')) || null;
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  useDocumentTitle(doc?.title || 'Document');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.documents
      .get(id)
      .then((data) => {
        if (!cancelled) setDoc(data.document);
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
  }, [id]);

  useEffect(() => {
    if (doc) document.title = `${doc.title} · CampusMate`;
  }, [doc]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page" role="status" aria-live="polite">
        <div className="w-full max-w-md space-y-3 px-6">
          <div className="h-6 w-2/3 animate-pulse rounded-full bg-surface-2" />
          <div className="h-72 animate-pulse rounded-lg bg-surface-1" />
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-page px-6 text-center">
        <FileText className="h-8 w-8 text-ink-muted" aria-hidden="true" />
        <h1 className="mt-3 text-[18px] font-semibold text-ink">Document not available</h1>
        <p className="mt-1.5 max-w-sm text-[12.5px] text-ink-muted">{error?.message || 'This file may have been removed.'}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => window.location.reload()} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Retry
          </Button>
          <Link to="/documents">
            <Button variant="ghost">Back to library</Button>
          </Link>
        </div>
      </div>
    );
  }

  const fileUrl = api.documents.fileUrl(doc.id, { page, source: 'viewer' });
  const downloadUrl = api.documents.fileUrl(doc.id, { download: 1, source: 'viewer' });

  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-20 border-b border-hairline bg-app/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/documents" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-secondary hover:text-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Library
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[14px] font-semibold text-ink">{doc.title}</h1>
            <p className="truncate text-[10.5px] text-ink-muted">
              {doc.department} · v{doc.version} · {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
              {page ? ` · opened at page ${page}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {doc.status === 'superseded' ? <Chip className="border-[color:var(--warning)] text-[color:var(--warning)]">Superseded</Chip> : <Chip className="border-[color:var(--positive)] text-[color:var(--positive)]">Current version</Chip>}
            <a href={downloadUrl} download>
              <Button size="sm" variant="secondary" leftIcon={<Download className="h-3.5 w-3.5" />}>
                Download
              </Button>
            </a>
          </div>
        </div>
      </header>

      {doc.status === 'superseded' ? (
        <div className="border-b border-[color:var(--warning)]/30 bg-[color:var(--warning-soft)] px-4 py-2.5 text-center text-[11.5px] font-medium text-[color:var(--warning)]" role="status">
          <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
          This document has been superseded.
          {doc.superseded_by ? (
            <Link to={`/documents/${doc.superseded_by.id || doc.superseded_by._id}`} className="ml-1.5 underline underline-offset-2">
              Open the current version (v{doc.superseded_by.version}).
            </Link>
          ) : (
            ' Check the library for the latest version.'
          )}
        </div>
      ) : null}

      <main id="main-content" className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
        {doc.is_image ? (
          <div className="flex flex-col items-center">
            <div className="mb-3 flex items-center gap-1.5 rounded-pill border border-hairline bg-surface-1 p-1">
              <button
                type="button"
                onClick={() => setZoom((value) => Math.max(0.5, Math.round((value - 0.25) * 100) / 100))}
                className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-ink"
                aria-label="Zoom out"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-[11px] font-semibold text-ink" aria-live="polite">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((value) => Math.min(3, Math.round((value + 0.25) * 100) / 100))}
                className="rounded-full p-2 text-ink-muted hover:bg-surface-2 hover:text-ink"
                aria-label="Zoom in"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="w-full overflow-auto rounded-lg border border-hairline bg-surface-1 p-2">
              <img
                src={fileUrl}
                alt={`Scanned notice: ${doc.title}`}
                style={{ width: `${zoom * 100}%`, maxWidth: 'none' }}
                className="mx-auto h-auto rounded-sm"
              />
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1">
            <object
              data={`${fileUrl}#page=${page || 1}`}
              type="application/pdf"
              title={`PDF viewer: ${doc.title}`}
              className="h-[calc(100vh-11rem)] min-h-[480px] w-full"
            >
              <div className="p-8 text-center">
                <ZoomIn className="mx-auto h-6 w-6 text-ink-muted" aria-hidden="true" />
                <p className="mt-3 text-[13px] text-ink-secondary">
                  Your browser cannot display this PDF inline.
                </p>
                <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[12px] font-semibold text-accent underline">
                  Open the PDF in a new tab
                </a>
              </div>
            </object>
          </div>
        )}
      </main>
    </div>
  );
}
