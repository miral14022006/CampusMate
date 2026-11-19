import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Grid3X3, List, RefreshCw, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Skeleton } from '../../components/ui/Skeleton';
import { useDocumentTitle } from '../../lib/hooks';
import { api } from '../../services/api';
import { cn } from '../../lib/cn';
import { EASE } from '../../lib/motion';

const TYPE_LABELS = {
  circular: 'Circular',
  notice: 'Notice',
  calendar: 'Calendar',
  handbook: 'Handbook',
  general: 'General'
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DocumentLibrary() {
  useDocumentTitle('Document library');
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [type, setType] = useState(params.get('type') || 'all');
  const [view, setView] = useState(() => localStorage.getItem('cm_doc_view') || 'grid');
  const [data, setData] = useState({ documents: [], filters: { types: [] } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async (search = query, selectedType = type) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.documents.list({ q: search, type: selectedType });
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => load(query, type), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type]);

  useEffect(() => {
    localStorage.setItem('cm_doc_view', view);
  }, [view]);

  const updateParam = (nextQuery, nextType) => {
    const next = new URLSearchParams();
    if (nextQuery) next.set('q', nextQuery);
    if (nextType && nextType !== 'all') next.set('type', nextType);
    setParams(next, { replace: true });
  };

  const types = useMemo(() => ['all', ...(data.filters?.types || [])], [data.filters]);

  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-20 border-b border-hairline bg-app/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6">
          <Link to="/app" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-secondary hover:text-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to app</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-pill border border-hairline bg-surface-2 p-0.5">
              <button
                type="button"
                onClick={() => setView('grid')}
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
                className={cn('rounded-full p-1.5', view === 'grid' ? 'bg-surface-1 text-ink' : 'text-ink-muted')}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                aria-label="List view"
                aria-pressed={view === 'list'}
                className={cn('rounded-full p-1.5', view === 'list' ? 'bg-surface-1 text-ink' : 'text-ink-muted')}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
        <div className="max-w-[640px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Public library</p>
          <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-ink sm:text-[36px]">Documents</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
            Every active circular, notice and handbook the assistant cites. Older versions stay reachable from previous
            citations.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                updateParam(event.target.value, type);
              }}
              placeholder="Search titles, departments or file names…"
              aria-label="Search documents"
              className="h-11 w-full rounded-pill border border-hairline bg-surface-1 pl-10 pr-4 text-[13px] text-ink outline-none placeholder:text-ink-muted focus:border-accent"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Document type filter">
            {types.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={type === item}
                onClick={() => {
                  setType(item);
                  updateParam(query, item);
                }}
                className={cn(
                  'h-9 shrink-0 rounded-pill border px-3 text-[11.5px] font-semibold transition-colors',
                  type === item
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-hairline text-ink-secondary hover:text-ink'
                )}
              >
                {item === 'all' ? 'All' : TYPE_LABELS[item] || item}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={cn('mt-6 grid gap-3', view === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : '')}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-10 rounded-lg border border-hairline bg-surface-1 p-8 text-center">
            <p className="text-[14px] font-semibold text-ink">Could not load the library</p>
            <p className="mt-1.5 text-[12.5px] text-ink-muted">{error.message}</p>
            <Button className="mt-4" variant="secondary" onClick={() => load()} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Try again
            </Button>
          </div>
        ) : data.documents.length === 0 ? (
          <div className="mt-10 rounded-lg border border-hairline bg-surface-1 p-10 text-center">
            <FileText className="mx-auto h-7 w-7 text-ink-muted" aria-hidden="true" />
            <p className="mt-3 text-[14px] font-semibold text-ink">No documents match</p>
            <p className="mt-1 text-[12.5px] text-ink-muted">Try a broader search or a different type.</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
            className={cn('mt-6 grid gap-3', view === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1')}
          >
            {data.documents.map((doc) => (
              <motion.div
                key={doc.id}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } } }}
              >
                <Link
                  to={`/documents/${encodeURIComponent(doc.id)}${doc.updated ? '?updated=1' : ''}`}
                  className="group flex h-full flex-col rounded-lg border border-hairline bg-surface-1 p-4 transition-colors hover:border-[color:var(--border-strong)] focus-visible:outline-2 focus-visible:outline-accent sm:p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent-soft text-accent">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Chip>v{doc.version}</Chip>
                      {doc.updated ? <Chip className="border-accent bg-accent-soft text-accent">Updated</Chip> : null}
                    </div>
                  </div>
                  <h2 className="mt-3 line-clamp-2 text-[14px] font-semibold leading-snug text-ink group-hover:text-accent">
                    {doc.title}
                  </h2>
                  <p className="mt-1 text-[11.5px] text-ink-muted">
                    {doc.department} · {TYPE_LABELS[doc.type] || doc.type}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-3 text-[10.5px] text-ink-muted">
                    <span>Effective {formatDate(doc.effective_date)}</span>
                    <span>{doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
