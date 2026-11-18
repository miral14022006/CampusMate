import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar as CalendarIcon, Check, ChevronDown, Download, ExternalLink, Zap } from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip';
import { api } from '../../services/api';
import { popover } from '../../lib/motion';
import { features } from '../../config/features';

export function AddToCalendarButton({ events = [], variant = 'compact' }) {
  const eventList = Array.isArray(events) ? events : [events];
  const [open, setOpen] = useState(false);
  const [clickedGcal, setClickedGcal] = useState(false);
  const [directInserting, setDirectInserting] = useState(false);
  const popoverRef = useRef(null);

  // Close on outside click or Esc
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  if (!eventList || eventList.length === 0) return null;

  const firstEvent = eventList[0];
  const isMultiple = eventList.length > 1;

  // Tooltip content
  const sourceDoc = firstEvent.sourceDocName || firstEvent.sourceDoc || firstEvent.doc_name || 'official notice';
  const sourcePage = firstEvent.sourcePage || firstEvent.page || 1;
  const tooltipText = `Date taken from ${sourceDoc}, p.${sourcePage}. Check the notice before relying on it.`;

  const handleOpenGoogle = () => {
    // If single event or we open the first
    const gcalUrl = firstEvent.googleCalendarUrl;
    if (gcalUrl) {
      window.open(gcalUrl, '_blank', 'noopener,noreferrer');
    }
    setClickedGcal(true);
    setOpen(false);
    setTimeout(() => {
      setClickedGcal(false);
    }, 3000);
  };

  const handleDirectInsert = async () => {
    if (!firstEvent._id) return;
    setDirectInserting(true);
    try {
      const res = await api.calendar.oauth.insertDirect(firstEvent._id);
      if (res.success) {
        setClickedGcal(true);
        setOpen(false);
        setTimeout(() => setClickedGcal(false), 3500);
      }
    } catch (err) {
      if (err.data?.code === 'OAUTH_REQUIRED') {
        const authData = await api.calendar.oauth.getAuthUrl();
        if (authData.authUrl) {
          window.location.href = authData.authUrl;
        }
      } else {
        console.error('Direct calendar insertion failed:', err);
        handleOpenGoogle();
      }
    } finally {
      setDirectInserting(false);
    }
  };

  const handleDownloadIcs = async () => {
    try {
      if (!isMultiple && firstEvent._id) {
        window.open(`/api/calendar/events/${firstEvent._id}.ics`, '_blank');
      } else {
        const ids = eventList.map((e) => e._id).filter(Boolean);
        if (ids.length > 0) {
          const blob = await api.calendar.exportSelectedIcs(ids);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = isMultiple ? 'campusmate_events.ics' : `${firstEvent.title || 'event'}.ics`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } else if (firstEvent.uid) {
          window.open(`/api/calendar/events/${firstEvent.uid}.ics`, '_blank');
        }
      }
    } catch (err) {
      console.error('ICS download failed:', err);
    }
    setOpen(false);
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <Tooltip label={tooltipText} side="top">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={isMultiple ? `Add all ${eventList.length} dates to calendar` : 'Add to calendar'}
          className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-surface-2 px-3 py-1 text-[11.5px] font-medium text-ink transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          {clickedGcal ? (
            <motion.span
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-1 text-[color:var(--positive)] font-medium"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Opened in Google Calendar
            </motion.span>
          ) : (
            <>
              <CalendarIcon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span>{isMultiple ? `Add all (${eventList.length})` : 'Add to calendar'}</span>
              <ChevronDown className="h-3 w-3 text-ink-muted" aria-hidden="true" />
            </>
          )}
        </button>
      </Tooltip>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={popover}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute bottom-[calc(100%+6px)] left-0 z-50 min-w-[200px] rounded-lg border border-hairline bg-surface-1 p-1.5 shadow-lift"
          >
            <div className="px-2 py-1 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Calendar Options
            </div>

            <button
              type="button"
              onClick={handleOpenGoogle}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-ink transition-colors hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2"
            >
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                Google Calendar
              </span>
              <ExternalLink className="h-3 w-3 text-ink-muted" aria-hidden="true" />
            </button>

            {features.calendarGoogleOAuth && !isMultiple && (
              <button
                type="button"
                onClick={handleDirectInsert}
                disabled={directInserting}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-accent transition-colors hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2"
              >
                <span className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  {directInserting ? 'Adding...' : '1-Click Insert (OAuth)'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadIcs}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-ink transition-colors hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2"
            >
              <span className="flex items-center gap-2">
                <Download className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                Download .ics
              </span>
            </button>

            <div className="mt-1 border-t border-hairline pt-1 px-2 py-0.5 text-[10px] text-ink-muted leading-tight">
              Compatible with Apple, Google & Outlook
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AddToCalendarButton;
