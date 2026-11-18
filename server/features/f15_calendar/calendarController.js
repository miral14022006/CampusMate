const CalendarEvent = require('../../models/CalendarEvent');
const { buildIcsFeed, buildGoogleCalendarUrl } = require('../../services/icsBuilder');
const crypto = require('crypto');

function generateStableEventUid(category, title, semester) {
  const normKey = `${(category || 'other').toLowerCase()}_${(title || '').toLowerCase().replace(/[^a-z0-9]/g, '')}_${semester || 'all'}`;
  const hash = crypto.createHash('sha256').update(normKey).digest('hex').slice(0, 16);
  return `cm_${hash}@campusmate.pdeu.ac.in`;
}

/**
 * Ingest Hook: Process candidate calendar events from document ingestion.
 * Creates or updates pending events, updating sequence if superseded.
 */
async function processCandidateEvents(candidates, sourceDoc) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  const createdOrUpdated = [];

  for (const cand of candidates) {
    const category = cand.category || 'other';
    const sem = cand.semester || null;
    const uid = generateStableEventUid(category, cand.title, sem);

    const sDate = new Date(cand.start);
    const eDate = new Date(cand.end || cand.start);

    // Look for existing event with same UID
    let existing = await CalendarEvent.findOne({ uid });

    if (existing) {
      existing.sequence += 1;
      existing.title = cand.title;
      existing.titles = cand.titles || existing.titles;
      existing.startDate = sDate;
      existing.endDate = eDate;
      existing.allDay = cand.all_day !== false;
      existing.description = cand.snippet || existing.description;
      existing.sourceDocId = sourceDoc?._id?.toString() || existing.sourceDocId;
      existing.sourceDocName = cand.doc_name || sourceDoc?.fileName || existing.sourceDocName;
      existing.sourcePage = cand.page || 1;
      existing.sourceChunkId = cand.chunk_id || '';
      existing.needsReview = cand.needs_review || false;
      existing.status = 'pending'; // Requires review upon revision
      await existing.save();
      createdOrUpdated.push(existing);
    } else {
      const newEvent = new CalendarEvent({
        title: cand.title,
        titles: cand.titles || { en: cand.title },
        category,
        startDate: sDate,
        endDate: eDate,
        allDay: cand.all_day !== false,
        description: cand.snippet || '',
        sourceDocId: sourceDoc?._id?.toString() || '',
        sourceDocName: cand.doc_name || sourceDoc?.fileName || '',
        sourcePage: cand.page || 1,
        sourceChunkId: cand.chunk_id || '',
        semester: sem,
        course: cand.course || null,
        uid,
        sequence: 0,
        status: 'pending',
        needsReview: cand.needs_review || false,
        confidence: cand.confidence || 0.9
      });
      await newEvent.save();
      createdOrUpdated.push(newEvent);
    }
  }

  return createdOrUpdated;
}

/**
 * Marks events superseded when their underlying document is superseded.
 */
async function markEventsSupersededByDocId(docId) {
  if (!docId) return;
  await CalendarEvent.updateMany(
    { sourceDocId: docId.toString(), status: { $ne: 'superseded' } },
    { $set: { status: 'superseded' } }
  );
}

// ---------------- Public Endpoints ----------------

async function getPublicEvents(req, res) {
  try {
    const { from, to, category, semester } = req.query;
    const filter = { status: 'approved' };

    if (from || to) {
      filter.startDate = {};
      if (from) filter.startDate.$gte = new Date(from);
      if (to) filter.startDate.$lte = new Date(to);
    }

    if (category) filter.category = category;
    if (semester) filter.semester = semester;

    const events = await CalendarEvent.find(filter).sort({ startDate: 1 });

    const decorated = events.map((ev) => {
      const obj = ev.toObject();
      obj.googleCalendarUrl = buildGoogleCalendarUrl(ev);
      return obj;
    });

    res.json({ events: decorated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getEventIcs(req, res) {
  try {
    const event = await CalendarEvent.findOne({ _id: req.params.id, status: 'approved' });
    if (!event) {
      return res.status(404).json({ error: 'Event not found or not approved' });
    }

    const icsContent = buildIcsFeed(event, `${event.title} - CampusMate`);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${event.uid}.ics"`);
    res.send(icsContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function exportSelectedIcs(req, res) {
  try {
    const { eventIds } = req.body;
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ error: 'eventIds array is required' });
    }

    const events = await CalendarEvent.find({ _id: { $in: eventIds }, status: 'approved' });
    const icsContent = buildIcsFeed(events, 'CampusMate Selected Events');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="campusmate_events.ics"');
    res.send(icsContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getSubscribableFeedIcs(req, res) {
  try {
    const { semester, category } = req.query;
    const filter = { status: 'approved' };
    if (semester) filter.semester = semester;
    if (category) filter.category = category;

    const events = await CalendarEvent.find(filter).sort({ startDate: 1 });
    const icsContent = buildIcsFeed(events, 'PDEU CampusMate Official Feed');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="feed.ics"');
    res.send(icsContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ---------------- Admin Endpoints (JWT protected) ----------------

async function listAdminPendingEvents(req, res) {
  try {
    const { status = 'pending', page = 1, limit = 50 } = req.query;
    const filter = status === 'all' ? {} : { status };

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [events, total] = await Promise.all([
      CalendarEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
      CalendarEvent.countDocuments(filter)
    ]);

    res.json({ events, total, page: parseInt(page, 10), pages: Math.ceil(total / parseInt(limit, 10)) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function approveEvent(req, res) {
  try {
    const event = await CalendarEvent.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'approved' } },
      { new: true }
    );
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event approved successfully', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function rejectEvent(req, res) {
  try {
    const event = await CalendarEvent.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'rejected' } },
      { new: true }
    );
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event rejected', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function editEvent(req, res) {
  try {
    const { title, titles, category, startDate, endDate, allDay, semester, description } = req.body;
    const update = {};
    if (title) update.title = title;
    if (titles) update.titles = titles;
    if (category) update.category = category;
    if (startDate) update.startDate = new Date(startDate);
    if (endDate) update.endDate = new Date(endDate);
    if (typeof allDay === 'boolean') update.allDay = allDay;
    if (semester !== undefined) update.semester = semester;
    if (description !== undefined) update.description = description;

    const event = await CalendarEvent.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event updated', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createManualEvent(req, res) {
  try {
    const { title, titles, category, startDate, endDate, allDay, semester, description } = req.body;
    if (!title || !startDate) {
      return res.status(400).json({ error: 'title and startDate are required' });
    }

    const sDate = new Date(startDate);
    const eDate = endDate ? new Date(endDate) : sDate;
    const cat = category || 'other';
    const sem = semester || null;
    const uid = generateStableEventUid(cat, title, sem);

    const event = new CalendarEvent({
      title,
      titles: titles || { en: title },
      category: cat,
      startDate: sDate,
      endDate: eDate,
      allDay: allDay !== false,
      semester: sem,
      description: description || '',
      uid,
      status: 'approved', // Manually added by admin is pre-approved
      sequence: 0,
      confidence: 1.0,
      needsReview: false
    });

    await event.save();
    res.status(201).json({ message: 'Manual calendar event created', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  processCandidateEvents,
  markEventsSupersededByDocId,
  generateStableEventUid,
  getPublicEvents,
  getEventIcs,
  exportSelectedIcs,
  getSubscribableFeedIcs,
  listAdminPendingEvents,
  approveEvent,
  rejectEvent,
  editEvent,
  createManualEvent
};
