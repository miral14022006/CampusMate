import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { EventCard } from './EventCard';

export function AgendaList({
  events = [],
  selectedIds = [],
  onToggleSelect,
  lang = 'en'
}) {
  const [showEarlier, setShowEarlier] = useState(false);

  // Group events by upcoming vs earlier, and then by Month Year
  const { upcomingGroups, earlierEvents } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming = [];
    const earlier = [];

    // Sort ascending
    const sorted = [...events].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    for (const ev of sorted) {
      const d = new Date(ev.startDate);
      d.setHours(0, 0, 0, 0);
      if (d < now) {
        earlier.push(ev);
      } else {
        upcoming.push(ev);
      }
    }

    // Group upcoming by Month Year
    const groups = {};
    for (const ev of upcoming) {
      const d = new Date(ev.startDate);
      const key = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    }

    return {
      upcomingGroups: Object.entries(groups),
      earlierEvents: earlier
    };
  }, [events]);

  return (
    <div className="space-y-8">
      {/* Earlier / Past Events Collapsible */}
      {earlierEvents.length > 0 && (
        <div className="rounded-lg border border-hairline bg-surface-2/40 p-3">
          <button
            type="button"
            onClick={() => setShowEarlier((prev) => !prev)}
            className="flex w-full items-center justify-between text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
          >
            <span>Earlier / Past Events ({earlierEvents.length})</span>
            {showEarlier ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {showEarlier && (
            <div className="mt-3 space-y-2.5 pt-2 border-t border-hairline">
              {earlierEvents.map((ev) => (
                <EventCard
                  key={ev._id}
                  event={ev}
                  selected={selectedIds.includes(ev._id)}
                  onToggleSelect={onToggleSelect}
                  lang={lang}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Groups with Sticky Month Headers */}
      {upcomingGroups.map(([monthYear, groupEvents]) => (
        <div key={monthYear} className="space-y-3">
          <div className="sticky top-16 z-20 -mx-2 px-2 py-1.5 backdrop-blur-md bg-app/80 border-b border-hairline">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent">
              {monthYear}
            </h3>
          </div>

          <div className="space-y-2.5">
            {groupEvents.map((ev) => (
              <EventCard
                key={ev._id}
                event={ev}
                selected={selectedIds.includes(ev._id)}
                onToggleSelect={onToggleSelect}
                lang={lang}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AgendaList;
