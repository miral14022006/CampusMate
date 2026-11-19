import { useState } from 'react';
import { Link } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  FileCheck2
} from 'lucide-react';
import Scene from '../components/Scene';
import { getCalendarEventData } from '../../../config/landing';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export function CalendarSpotlight() {
  const [eventData] = useState(() => getCalendarEventData());
  const [addedToCal, setAddedToCal] = useState(false);

  const today = new Date();
  const todayDate = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const targetDay = eventData.dayNumber;
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
  const trailingCount = totalCells - (firstDayOfWeek + daysInMonth);

  const handleAddClick = () => {
    setAddedToCal(true);
    setTimeout(() => setAddedToCal(false), 3200);
  };

  return (
    <Scene
      id="dates"
      eyebrow="Important Dates"
      title="Never miss an academic deadline."
      subtitle="CampusMate auto-extracts exam forms, fee dues, and holiday schedules from verified circulars."
      glowPosition="top-right"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center w-full">
        {/* Left Column (5/12): Deadline Card & Actions */}
        <m.div
          initial={{ opacity: 0, x: -28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="lg:col-span-5 flex flex-col justify-between space-y-6"
        >
          <Card padding="lg" className="bg-surface-1/90 border-hairline shadow-lift p-6 sm:p-7 hover:border-accent/40 transition-colors">
            <div className="flex items-center justify-between border-b border-hairline pb-3.5">
              <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-accent">
                <Clock className="h-4 w-4" />
                Upcoming Academic Deadline
              </span>
              <span className="text-[12px] font-medium text-ink-muted">
                Semester 5 Notice
              </span>
            </div>

            <div className="mt-4">
              <p className="text-[15.5px] font-semibold text-ink">
                Semester 5 Examination Form Submission
              </p>
              <p className="mt-2 text-[14px] text-ink-secondary">
                Last date without late fee:{' '}
                <span className="text-accent font-semibold">{eventData.formattedDate}</span>
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-hairline">
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted">
                <FileCheck2 className="h-4 w-4 text-accent" /> Exam Circular (p. 1)
              </span>

              <m.a
                whileTap={{ scale: 0.98 }}
                href={eventData.gcalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleAddClick}
                className="inline-flex items-center gap-2 rounded-pill bg-accent px-4 py-1.5 text-[12px] font-semibold text-white shadow-soft hover:brightness-105 transition-all outline-none focus-visible:outline-2 focus-visible:outline-white"
              >
                <AnimatePresence mode="wait">
                  {addedToCal ? (
                    <m.span
                      key="check"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      className="inline-flex items-center gap-1.5 text-white font-bold"
                    >
                      <Check className="h-4 w-4 text-white" /> Opened in Google Calendar
                    </m.span>
                  ) : (
                    <m.span
                      key="add"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Calendar className="h-4 w-4" /> Add to Google Calendar
                    </m.span>
                  )}
                </AnimatePresence>
              </m.a>
            </div>
          </Card>

          {/* CTA Link to full calendar */}
          <div className="pt-2">
            <Link to="/calendar" className="inline-flex min-h-[48px]">
              <Button
                size="lg"
                className="h-12 px-6 text-[14.5px]"
                rightIcon={<ArrowRight className="cm-btn-arrow h-4 w-4" aria-hidden="true" />}
              >
                Open Full Important Dates Calendar
              </Button>
            </Link>
          </div>
        </m.div>

        {/* Right Column (7/12): Month Grid */}
        <m.div
          initial={{ opacity: 0, x: 28, scale: 0.98 }}
          whileInView={{ opacity: 1, x: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.15 }}
          className="lg:col-span-7 w-full"
        >
          <Card padding="lg" className="bg-surface-1/90 border-hairline p-5 sm:p-7">
            <div className="flex items-center justify-between px-2 pb-3 border-b border-hairline/60">
              <p className="text-[15px] font-semibold text-ink">
                {eventData.monthName} {eventData.year}
              </p>
              <div className="flex items-center gap-4 text-[12px]">
                <span className="flex items-center gap-1.5 text-ink-muted">
                  <span className="h-2.5 w-2.5 rounded-full border border-accent bg-accent/20" /> Today
                </span>
                <span className="flex items-center gap-1.5 text-accent font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" /> 1 Deadline
                </span>
              </div>
            </div>

            {/* Days of week */}
            <div className="mt-3.5 grid grid-cols-7 gap-1.5 text-center text-[12px] font-medium text-ink-muted">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[13px] pt-1.5">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => {
                const prevDay = daysInPrevMonth - firstDayOfWeek + i + 1;
                return (
                  <div key={`prev-${i}`} className="py-2 text-ink-muted/30 select-none">
                    {prevDay}
                  </div>
                );
              })}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = day === todayDate;
                const isTarget = day === targetDay;

                return (
                  <m.div
                    key={day}
                    animate={isTarget ? { scale: [1, 1.14, 1] } : undefined}
                    transition={
                      isTarget
                        ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                        : undefined
                    }
                    className={`relative flex items-center justify-center rounded-lg py-2 transition-colors ${
                      isTarget
                        ? 'bg-accent text-white font-bold shadow-soft'
                        : isToday
                        ? 'border border-accent/70 font-semibold text-accent'
                        : 'text-ink-secondary hover:bg-surface-2'
                    }`}
                  >
                    {day}
                    {isTarget && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-strong"></span>
                      </span>
                    )}
                  </m.div>
                );
              })}

              {Array.from({ length: trailingCount }).map((_, i) => (
                <div key={`next-${i}`} className="py-2 text-ink-muted/30 select-none">
                  {i + 1}
                </div>
              ))}
            </div>
          </Card>
        </m.div>
      </div>
    </Scene>
  );
}

export default CalendarSpotlight;
