const ical = require('ical-generator').default;

/**
 * Escapes characters for plain text field according to RFC 5545.
 */
function escapeICS(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Builds standard compliant ICS file content from a single event or list of events.
 * Handles:
 * - UTF-8 character encoding (Hindi, Gujarati)
 * - All-day events with DTEND set to next day exclusive (RFC 5545)
 * - Asia/Kolkata timezone for timed events
 * - Stable UID and SEQUENCE number
 * - VALARM reminders (-P1D and -P3D)
 * - CRLF line endings
 */
function buildIcsFeed(events, calendarName = 'CampusMate Academic Calendar') {
  const cal = ical({
    name: calendarName,
    timezone: 'Asia/Kolkata'
  });

  const eventList = Array.isArray(events) ? events : [events];

  for (const ev of eventList) {
    const sDate = new Date(ev.startDate);
    let eDate = new Date(ev.endDate);

    if (ev.allDay) {
      // RFC 5545: all-day DTEND is non-inclusive (the day following the event's end)
      eDate = new Date(eDate);
      eDate.setDate(eDate.getDate() + 1);
    }

    const titleText = ev.titles?.en || ev.title || 'Campus Milestone';
    const descriptionText = [
      ev.description || '',
      ev.titles?.hi ? `हिन्दी: ${ev.titles.hi}` : '',
      ev.titles?.gu ? `ગુજરાતી: ${ev.titles.gu}` : '',
      ev.sourceDocName ? `Official Source: ${ev.sourceDocName} (Page ${ev.sourcePage || 1})` : '',
      'Verified with CampusMate — PDEU Academic Assistant'
    ].filter(Boolean).join('\n\n');

    const calendarEvent = cal.createEvent({
      id: ev.uid || `cm_${ev._id || Date.now()}`,
      sequence: ev.sequence || 0,
      start: sDate,
      end: eDate,
      allDay: Boolean(ev.allDay),
      summary: titleText,
      description: descriptionText,
      location: 'Pandit Deendayal Energy University, Gandhinagar, Gujarat',
      url: 'https://www.pdeu.ac.in',
      timezone: 'Asia/Kolkata'
    });

    // Add VALARM reminders at -P1D and -P3D
    calendarEvent.createAlarm({
      type: 'display',
      trigger: -86400, // -1 day in seconds
      description: `Reminder: ${titleText} tomorrow`
    });

    calendarEvent.createAlarm({
      type: 'display',
      trigger: -259200, // -3 days in seconds
      description: `Advance Notice: ${titleText} in 3 days`
    });
  }

  return cal.toString();
}

/**
 * Builds one-click Google Calendar URL with proper encoding and Asia/Kolkata timezone.
 */
function buildGoogleCalendarUrl(event) {
  const sDate = new Date(event.startDate || event.start);
  const eDate = new Date(event.endDate || event.end || event.startDate || event.start);

  let datesParam = '';
  if (event.allDay) {
    const nextDay = new Date(eDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const pad = (n) => String(n).padStart(2, '0');
    const startStr = `${sDate.getFullYear()}${pad(sDate.getMonth() + 1)}${pad(sDate.getDate())}`;
    const endStr = `${nextDay.getFullYear()}${pad(nextDay.getMonth() + 1)}${pad(nextDay.getDate())}`;
    datesParam = `${startStr}/${endStr}`;
  } else {
    const formatIsoNoSep = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '').slice(0, 15) + 'Z';
    datesParam = `${formatIsoNoSep(sDate)}/${formatIsoNoSep(eDate)}`;
  }

  const titleText = event.titles?.en || event.title || 'Campus Milestone';
  const detailsParts = [
    event.description || '',
    event.titles?.hi ? `हिन्दी: ${event.titles.hi}` : '',
    event.titles?.gu ? `ગુજરાતી: ${event.titles.gu}` : '',
    event.sourceDocName || event.doc_name ? `Source: ${event.sourceDocName || event.doc_name} (Page ${event.sourcePage || event.page || 1})` : '',
    'Generated via CampusMate — PDEU'
  ].filter(Boolean);

  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: titleText,
    dates: datesParam,
    details: detailsParts.join('\n\n'),
    location: 'Pandit Deendayal Energy University, Gandhinagar',
    ctz: 'Asia/Kolkata'
  });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

module.exports = {
  buildIcsFeed,
  buildGoogleCalendarUrl,
  escapeICS
};
