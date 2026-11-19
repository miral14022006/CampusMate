import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Search,
  Rss,
  Download,
  ArrowLeft,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Select } from '../components/ui/Select';
import { useDocumentTitle } from '../lib/hooks';
import { api } from '../services/api';
import { useCalendarEvents } from '../features/calendar/hooks/useCalendarEvents';
import { AgendaList } from '../features/calendar/AgendaList';
import { MonthGrid } from '../features/calendar/MonthGrid';
import { SubscribeDialog } from '../features/calendar/SubscribeDialog';
import { cn } from '../lib/cn';

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'exam', label: 'Exams' },
  { id: 'fee', label: 'Fees' },
  { id: 'admission', label: 'Admissions' },
  { id: 'holiday', label: 'Holidays' },
  { id: 'result', label: 'Results' }
];

const SEMESTER_OPTIONS = [
  { value: 'all', label: 'All Semesters' },
  { value: '1', label: 'Semester 1' },
  { value: '2', label: 'Semester 2' },
  { value: '3', label: 'Semester 3' },
  { value: '4', label: 'Semester 4' },
  { value: '5', label: 'Semester 5' },
  { value: '6', label: 'Semester 6' },
  { value: '7', label: 'Semester 7' },
  { value: '8', label: 'Semester 8' }
];

const BRANCH_OPTIONS = [
  { value: 'all', label: 'All Branches' },
  { value: 'ict', label: 'ICT' },
  { value: 'cse', label: 'CSE' },
  { value: 'che', label: 'Chemical' },
  { value: 'mech', label: 'Mechanical' },
  { value: 'civil', label: 'Civil' }
];

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'gu', label: 'ગુજરાતી (Gujarati)' }
];

export default function CalendarPage() {
  useDocumentTitle('Important Dates & Academic Deadlines — CampusMate');

  // Filters persisted in localStorage
  const [semester, setSemester] = useState(() => localStorage.getItem('cm_cal_sem') || 'all');
  const [branch, setBranch] = useState(() => localStorage.getItem('cm_cal_branch') || 'all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [lang, setLang] = useState(() => localStorage.getItem('cm_cal_lang') || 'en');
  const [view, setView] = useState('agenda'); // 'agenda' | 'month'

  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [exportingBulk, setExportingBulk] = useState(false);

  useEffect(() => {
    localStorage.setItem('cm_cal_sem', semester);
  }, [semester]);

  useEffect(() => {
    localStorage.setItem('cm_cal_branch', branch);
  }, [branch]);

  useEffect(() => {
    localStorage.setItem('cm_cal_lang', lang);
  }, [lang]);

  const { events, loading, error, refetch } = useCalendarEvents({
    category: category === 'all' ? undefined : category,
    semester: semester === 'all' ? undefined : semester
  });

  // Client-side search and branch filter
  const filteredEvents = useMemo(() => {
    return (events || []).filter((ev) => {
      if (branch !== 'all' && ev.branch && ev.branch.toLowerCase() !== branch.toLowerCase()) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const tEn = (ev.titles?.en || ev.title || '').toLowerCase();
        const tHi = (ev.titles?.hi || '').toLowerCase();
        const tGu = (ev.titles?.gu || '').toLowerCase();
        const desc = (ev.description || '').toLowerCase();
        const doc = (ev.sourceDocName || '').toLowerCase();
        if (!tEn.includes(q) && !tHi.includes(q) && !tGu.includes(q) && !desc.includes(q) && !doc.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [events, branch, search]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleExportSelected = async () => {
    if (selectedIds.length === 0) return;
    setExportingBulk(true);
    try {
      const blob = await api.calendar.exportSelectedIcs(selectedIds);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'selected_campus_events.ics';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExportingBulk(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-ink antialiased">
      {/* Top Navbar */}
      <header className="border-b border-hairline bg-surface-1 py-4">
        <div className="mx-auto flex w-full max-w-[1280px] 2xl:max-w-[1440px] items-center justify-between px-5 sm:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-muted hover:text-ink outline-none focus-visible:outline-2 focus-visible:outline-accent rounded-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to CampusMate Home
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="text-[13px] font-semibold text-accent hover:underline"
            >
              Go to Assistant →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] 2xl:max-w-[1440px] px-5 py-8 sm:px-8 sm:py-12">
        {/* Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-hairline">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-xs font-semibold text-accent mb-2">
              <CalendarIcon className="h-3.5 w-3.5" />
              Verified Academic Calendar
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Important Dates & Deadlines
            </h1>
            <p className="mt-1 text-sm text-ink-secondary max-w-xl">
              Official exam registrations, fee deadlines, holidays, and admissions milestones extracted directly from verified university notices.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => setSubscribeOpen(true)}
              leftIcon={<Rss className="h-4 w-4 text-accent" />}
            >
              Subscribe
            </Button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-6 flex flex-col gap-4">
          {/* Category Chips & View Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Category filters">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={category === tab.id}
                  onClick={() => setCategory(tab.id)}
                  className={cn(
                    'rounded-pill px-3.5 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-accent',
                    category === tab.id
                      ? 'bg-accent text-white font-semibold shadow-sm'
                      : 'bg-surface-2 text-ink-secondary hover:text-ink'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* View Toggle (Desktop Only) */}
            <div className="hidden md:flex items-center rounded-pill border border-hairline bg-surface-2 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setView('agenda')}
                className={cn(
                  'rounded-pill px-3 py-1 transition-colors',
                  view === 'agenda' ? 'bg-surface-1 text-ink shadow-xs font-semibold' : 'text-ink-muted hover:text-ink'
                )}
              >
                Agenda
              </button>
              <button
                type="button"
                onClick={() => setView('month')}
                className={cn(
                  'rounded-pill px-3 py-1 transition-colors',
                  view === 'month' ? 'bg-surface-1 text-ink shadow-xs font-semibold' : 'text-ink-muted hover:text-ink'
                )}
              >
                Month
              </button>
            </div>
          </div>

          {/* Search, Semester, Branch, and Language Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dates & notices…"
                className="h-9 w-full rounded-md border border-hairline bg-surface-1 pl-9 pr-3 text-xs text-ink placeholder:text-ink-muted outline-none focus:border-accent"
              />
            </div>

            <Select
              size="sm"
              value={semester}
              onChange={setSemester}
              options={SEMESTER_OPTIONS}
              label="Select Semester"
            />

            <Select
              size="sm"
              value={branch}
              onChange={setBranch}
              options={BRANCH_OPTIONS}
              label="Select Branch"
            />

            <Select
              size="sm"
              value={lang}
              onChange={setLang}
              options={LANG_OPTIONS}
              label="Display Language"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="mt-8">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
          ) : error ? (
            <Card className="p-8 text-center space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-negative-soft text-[color:var(--negative)]">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-ink">Could not load calendar dates</h3>
              <p className="text-xs text-ink-muted max-w-sm mx-auto">{error.message}</p>
              <Button size="sm" onClick={refetch} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
                Try Again
              </Button>
            </Card>
          ) : filteredEvents.length === 0 ? (
            <Card className="p-12 text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-ink">No dates found</h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                No events match your selected filters. Try changing the category, semester, or search terms.
              </p>
            </Card>
          ) : view === 'month' ? (
            <div className="hidden md:block">
              <MonthGrid events={filteredEvents} lang={lang} />
            </div>
          ) : (
            <AgendaList
              events={filteredEvents}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              lang={lang}
            />
          )}

          {/* Mobile Fallback if month was set on resize */}
          {view === 'month' && !loading && !error && filteredEvents.length > 0 && (
            <div className="md:hidden">
              <AgendaList
                events={filteredEvents}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                lang={lang}
              />
            </div>
          )}
        </div>

        {/* Sticky Selected Export Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full border border-hairline bg-surface-1 px-4 py-2.5 shadow-lift">
            <span className="text-xs font-medium text-ink">
              {selectedIds.length} event{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <Button
              size="xs"
              variant="primary"
              loading={exportingBulk}
              onClick={handleExportSelected}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Add selected (.ics)
            </Button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-ink-muted hover:text-ink ml-1 font-medium"
            >
              Clear
            </button>
          </div>
        )}

        {/* Mandatory Footer Note */}
        <footer className="mt-16 border-t border-hairline pt-6 text-center text-xs text-ink-muted">
          <p>Dates come from official notices. Verify before acting.</p>
          <p className="mt-1 text-[11px] text-ink-muted/80">
            CampusMate is a student project and not an official PDEU service.
          </p>
        </footer>
      </main>

      <SubscribeDialog
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        semester={semester}
      />
    </div>
  );
}
