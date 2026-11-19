import { useState } from 'react';
import { Calendar as CalendarIcon, Download, MessageSquare, Clock, FileText, Check } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

import { cn } from '../../lib/cn';

function getCountdown(startDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const diffTime = start.getTime() - now.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: 'Today', isPast: false, isToday: true };
  if (diffDays === 1) return { label: 'Tomorrow', isPast: false };
  if (diffDays > 1 && diffDays <= 7) return { label: `in ${diffDays} days`, isPast: false };
  if (diffDays > 7) return { label: `in ${diffDays} days`, isPast: false };
  return { label: `${Math.abs(diffDays)}d ago`, isPast: true };
}

function isRecentlyUpdated(updatedAt) {
  if (!updatedAt) return false;
  const updated = new Date(updatedAt);
  const now = new Date();
  const diffDays = (now - updated) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

export function EventCard({
  event,
  selected = false,
  onToggleSelect,
  lang = 'en'
}) {
  const [clickedGcal, setClickedGcal] = useState(false);
  const countdown = getCountdown(event.startDate);
  const isRecent = isRecentlyUpdated(event.updatedAt || event.createdAt);

  const title = (event.titles && event.titles[lang]) || event.title || 'Academic Milestone';
  const sDate = new Date(event.startDate);
  const dayNum = sDate.getDate();
  const monthName = sDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();

  const handleOpenGcal = () => {
    if (event.googleCalendarUrl) {
      window.open(event.googleCalendarUrl, '_blank', 'noopener,noreferrer');
      setClickedGcal(true);
      setTimeout(() => setClickedGcal(false), 3000);
    }
  };

  const handleDownloadIcs = () => {
    window.open(`/api/calendar/events/${event._id}.ics`, '_blank');
  };

  const askQuery = `/app?q=${encodeURIComponent(`When is the deadline for ${event.title}?`)}`;

  return (
    <Card
      className={cn(
        'relative transition-all duration-200 border-hairline',
        countdown.isPast ? 'opacity-65 hover:opacity-100 bg-surface-1/60' : 'bg-surface-1',
        selected && 'border-accent ring-1 ring-accent'
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4">
        {/* Left: Date block + Main Info */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Checkbox for bulk actions */}
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(event._id)}
              aria-label={`Select ${title}`}
              className="mt-2.5 h-4 w-4 rounded border-hairline accent-[color:var(--accent)]"
            />
          )}

          {/* Date Block */}
          <div className="flex flex-col items-center justify-center shrink-0 w-13 h-14 rounded-md border border-hairline bg-surface-2 p-1 text-center">
            <span className="text-[10px] font-bold tracking-wider text-accent uppercase">
              {monthName}
            </span>
            <span className="text-lg font-bold leading-none text-ink">
              {dayNum}
            </span>
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <StatusPill status="default" label={event.category?.toUpperCase() || 'OTHER'} />

              {/* Countdown badge */}
              <span
                className={cn(
                  'rounded-pill px-2 py-0.5 text-[10.5px] font-medium inline-flex items-center gap-1',
                  countdown.isToday
                    ? 'bg-accent text-white font-semibold'
                    : countdown.isPast
                    ? 'bg-surface-3 text-ink-muted'
                    : 'bg-accent-soft text-accent'
                )}
              >
                <Clock className="h-3 w-3" />
                {countdown.label}
              </span>

              {/* Recently updated badge */}
              {isRecent && (
                <span className="rounded-pill bg-warn-soft text-[color:var(--warning)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  Updated
                </span>
              )}
            </div>

            <h4 className="text-[14px] font-semibold text-ink leading-snug">
              {title}
            </h4>

            {event.description && (
              <p className="mt-1 text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                {event.description}
              </p>
            )}

            {/* Source Document Chip */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
              <span className="inline-flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5">
                <FileText className="h-3 w-3" />
                {event.sourceDocName || 'Official Notice'}
                {event.sourcePage ? ` (p.${event.sourcePage})` : ''}
              </span>
              {event.semester && (
                <span className="rounded bg-surface-2 px-1.5 py-0.5">
                  Sem {event.semester}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap sm:flex-col items-stretch justify-end gap-1.5 shrink-0 pt-2 sm:pt-0">
          <Button
            size="xs"
            variant="outline"
            onClick={handleOpenGcal}
            leftIcon={clickedGcal ? <Check className="h-3.5 w-3.5 text-[color:var(--positive)]" /> : <CalendarIcon className="h-3.5 w-3.5 text-accent" />}
          >
            {clickedGcal ? 'Opened' : 'Google Calendar'}
          </Button>

          <Button
            size="xs"
            variant="ghost"
            onClick={handleDownloadIcs}
            leftIcon={<Download className="h-3.5 w-3.5 text-ink-muted" />}
          >
            .ics
          </Button>

          <a
            href={askQuery}
            className="inline-flex items-center justify-center gap-1 rounded-sm border border-transparent px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent-soft transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            Ask about this
          </a>
        </div>
      </div>
    </Card>
  );
}

export default EventCard;
