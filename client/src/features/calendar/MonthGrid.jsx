import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/Badge';
import { cn } from '../../lib/cn';

export function MonthGrid({
  events = [],
  lang = 'en'
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const todayMonth = () => setCurrentDate(new Date());

  const monthLabel = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Map events to date strings (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of events) {
      const d = new Date(ev.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const totalDays = lastDay.getDate();

    const days = [];
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        dateKey: null
      });
    }

    // Current month days
    const today = new Date();
    const isThisYearMonth = today.getFullYear() === year && today.getMonth() === month;

    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        isToday: isThisYearMonth && today.getDate() === d,
        dateKey,
        dayEvents: eventsByDate[dateKey] || []
      });
    }

    // Trailing days padding to round to 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        dayNumber: d,
        isCurrentMonth: false,
        dateKey: null
      });
    }

    return days;
  }, [year, month, eventsByDate]);

  const weekHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink">{monthLabel}</h3>
        <div className="flex items-center gap-1.5">
          <Button size="xs" variant="outline" onClick={todayMonth}>
            Today
          </Button>
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous month"
            className="rounded-full p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next month"
            className="rounded-full p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div
        role="grid"
        aria-label={`Academic Calendar for ${monthLabel}`}
        className="rounded-lg border border-hairline bg-surface-1 overflow-hidden shadow-sm"
      >
        {/* Days of week header */}
        <div role="row" className="grid grid-cols-7 border-b border-hairline bg-surface-2 text-center text-xs font-semibold text-ink-muted py-2">
          {weekHeaders.map((w) => (
            <div key={w} role="columnheader">{w}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-hairline">
          {calendarDays.map((cd, index) => {
            const hasEvents = cd.dayEvents && cd.dayEvents.length > 0;
            return (
              <div
                key={index}
                role="gridcell"
                tabIndex={cd.isCurrentMonth ? 0 : -1}
                aria-label={
                  cd.isCurrentMonth
                    ? `${cd.dayNumber} ${monthLabel}, ${hasEvents ? `${cd.dayEvents.length} events` : 'no events'}`
                    : undefined
                }
                onClick={() => {
                  if (hasEvents) setSelectedDayEvents(cd.dayEvents);
                }}
                className={cn(
                  'min-h-[96px] p-2 flex flex-col justify-between transition-colors outline-none focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:z-10',
                  !cd.isCurrentMonth && 'bg-surface-2/40 text-ink-muted/50',
                  cd.isCurrentMonth && 'bg-surface-1 text-ink',
                  hasEvents && 'cursor-pointer hover:bg-surface-2/60'
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full',
                      cd.isToday ? 'bg-accent text-white font-bold' : 'text-ink-secondary'
                    )}
                  >
                    {cd.dayNumber}
                  </span>
                  {hasEvents && (
                    <span className="text-[10px] font-semibold text-accent">
                      {cd.dayEvents.length}
                    </span>
                  )}
                </div>

                {hasEvents && (
                  <div className="mt-1 space-y-1">
                    {cd.dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev._id}
                        className="truncate rounded bg-accent-soft/80 px-1.5 py-0.5 text-[10.5px] font-medium text-accent hover:opacity-90"
                      >
                        {(ev.titles && ev.titles[lang]) || ev.title}
                      </div>
                    ))}
                    {cd.dayEvents.length > 2 && (
                      <div className="text-[9.5px] text-ink-muted pl-1">
                        +{cd.dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Events Drawer / Modal Pop */}
      {selectedDayEvents && (
        <Card className="p-4 border-accent space-y-3 bg-surface-1">
          <div className="flex items-center justify-between border-b border-hairline pb-2">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider">
              Events on this date ({selectedDayEvents.length})
            </h4>
            <Button size="xs" variant="ghost" onClick={() => setSelectedDayEvents(null)}>
              Close
            </Button>
          </div>
          <div className="space-y-2">
            {selectedDayEvents.map((ev) => (
              <div key={ev._id} className="flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-ink">{(ev.titles && ev.titles[lang]) || ev.title}</div>
                  <div className="text-ink-muted text-[11px] mt-0.5">{ev.description}</div>
                </div>
                {ev.googleCalendarUrl && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => window.open(ev.googleCalendarUrl, '_blank')}
                  >
                    Google Cal
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default MonthGrid;
