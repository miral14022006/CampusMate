const axios = require('axios');
const CalendarOAuthToken = require('../../models/CalendarOAuthToken');
const CalendarEvent = require('../../models/CalendarEvent');
const { encryptToken, decryptToken } = require('../../services/tokenEncryption');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/calendar/oauth/callback';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

/**
 * Initiates the Google OAuth 2.0 flow for calendar insertion.
 * Generates an authorization URL with state preserving the anonymous clientId.
 */
function getAuthUrl(req, res) {
  const clientId = req.headers['x-client-id'] || req.query.clientId || 'anonymous_client';

  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({
      error: 'Google OAuth is not configured on this server (GOOGLE_OAUTH_CLIENT_ID missing).'
    });
  }

  const state = Buffer.from(JSON.stringify({ clientId, timestamp: Date.now() })).toString('base64url');

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: `${CALENDAR_SCOPE} email`,
    access_type: 'offline',
    prompt: 'consent',
    state
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.json({ authUrl });
}

/**
 * OAuth callback handler. Exchanges authorization code for tokens,
 * encrypts them, and persists them associated with the student's clientId.
 */
async function handleOAuthCallback(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/calendar?oauth=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.status(400).send('Missing code or state parameter.');
  }

  let clientId = 'anonymous_client';
  try {
    const parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    clientId = parsedState.clientId || clientId;
  } catch (err) {
    console.warn('[Calendar OAuth] Failed to parse state payload:', err.message);
  }

  try {
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_in, scope } = tokenRes.data;
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    let googleEmail = null;
    try {
      const userinfoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      googleEmail = userinfoRes.data?.email || null;
    } catch (e) {
      console.warn('[Calendar OAuth] Could not retrieve user profile email:', e.message);
    }

    const encryptedAccess = encryptToken(access_token);
    const encryptedRefresh = refresh_token ? encryptToken(refresh_token) : null;

    if (CalendarOAuthToken.db && CalendarOAuthToken.db.readyState === 1) {
      const updateData = {
        encryptedAccessToken: encryptedAccess,
        expiresAt,
        scope: scope || CALENDAR_SCOPE,
        googleEmail
      };
      if (encryptedRefresh) {
        updateData.encryptedRefreshToken = encryptedRefresh;
      }

      await CalendarOAuthToken.findOneAndUpdate(
        { clientId },
        { $set: updateData },
        { upsert: true, new: true }
      );
    }

    // Redirect user back to frontend calendar with success indication
    return res.redirect('/calendar?oauth=connected');
  } catch (err) {
    console.error('[Calendar OAuth] Token exchange error:', err?.response?.data || err.message);
    return res.redirect(`/calendar?oauth=failed&reason=${encodeURIComponent(err.message)}`);
  }
}

/**
 * Checks whether the student client currently has a valid or refreshable OAuth connection.
 */
async function getOAuthStatus(req, res) {
  const clientId = req.headers['x-client-id'] || req.query.clientId;
  if (!clientId) {
    return res.json({ connected: false });
  }

  try {
    if (!(CalendarOAuthToken.db && CalendarOAuthToken.db.readyState === 1)) {
      return res.json({ connected: false });
    }

    const tokenDoc = await CalendarOAuthToken.findOne({ clientId });
    if (!tokenDoc) {
      return res.json({ connected: false });
    }

    return res.json({
      connected: true,
      email: tokenDoc.googleEmail,
      expiresAt: tokenDoc.expiresAt
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Disconnects / revokes the OAuth integration for this student.
 */
async function disconnectOAuth(req, res) {
  const clientId = req.headers['x-client-id'] || req.body?.clientId;
  if (!clientId) {
    return res.status(400).json({ error: 'X-Client-Id header required' });
  }

  try {
    if (CalendarOAuthToken.db && CalendarOAuthToken.db.readyState === 1) {
      await CalendarOAuthToken.deleteOne({ clientId });
    }
    return res.json({ success: true, message: 'Google Calendar disconnected.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Retrieves a valid decrypted access token, automatically refreshing it if expired.
 */
async function getValidAccessToken(tokenDoc) {
  if (new Date(tokenDoc.expiresAt) > new Date(Date.now() + 60000)) {
    return decryptToken(tokenDoc.encryptedAccessToken);
  }

  // Token expired or close to expiry, refresh it
  if (!tokenDoc.encryptedRefreshToken) {
    throw new Error('OAuth token expired and no refresh token available. Reconnection required.');
  }

  const refreshToken = decryptToken(tokenDoc.encryptedRefreshToken);
  const refreshRes = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const newAccessToken = refreshRes.data.access_token;
  const newExpiresIn = refreshRes.data.expires_in || 3600;
  tokenDoc.encryptedAccessToken = encryptToken(newAccessToken);
  tokenDoc.expiresAt = new Date(Date.now() + newExpiresIn * 1000);
  await tokenDoc.save();

  return newAccessToken;
}

/**
 * Directly inserts an academic milestone into the student's Google Calendar
 * using the Google Calendar API events.insert endpoint (no Save step needed).
 */
async function insertEventDirect(req, res) {
  const clientId = req.headers['x-client-id'];
  const { eventId } = req.body;

  if (!clientId) {
    return res.status(400).json({ error: 'X-Client-Id required for calendar insertion.' });
  }

  if (!eventId) {
    return res.status(400).json({ error: 'eventId is required.' });
  }

  try {
    if (!(CalendarOAuthToken.db && CalendarOAuthToken.db.readyState === 1)) {
      return res.status(503).json({ error: 'Database unavailable.' });
    }

    const tokenDoc = await CalendarOAuthToken.findOne({ clientId });
    if (!tokenDoc) {
      return res.status(401).json({
        error: 'Google Calendar is not connected. Connect via OAuth first.',
        code: 'OAUTH_REQUIRED'
      });
    }

    const event = await CalendarEvent.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Calendar event not found.' });
    }

    const accessToken = await getValidAccessToken(tokenDoc);

    const sDate = new Date(event.startDate);
    const eDate = new Date(event.endDate || event.startDate);

    let eventBody = {};
    if (event.allDay) {
      const nextDay = new Date(eDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const pad = (n) => String(n).padStart(2, '0');
      const startStr = `${sDate.getFullYear()}-${pad(sDate.getMonth() + 1)}-${pad(sDate.getDate())}`;
      const endStr = `${nextDay.getFullYear()}-${pad(nextDay.getMonth() + 1)}-${pad(nextDay.getDate())}`;

      eventBody = {
        summary: event.titles?.en || event.title,
        description: `${event.description || ''}\n\nSource: ${event.sourceDocName || 'Official circular'} (p.${event.sourcePage || 1})\nAdded via CampusMate`,
        location: 'Pandit Deendayal Energy University, Gandhinagar',
        start: { date: startStr },
        end: { date: endStr }
      };
    } else {
      eventBody = {
        summary: event.titles?.en || event.title,
        description: `${event.description || ''}\n\nSource: ${event.sourceDocName || 'Official circular'} (p.${event.sourcePage || 1})\nAdded via CampusMate`,
        location: 'Pandit Deendayal Energy University, Gandhinagar',
        start: { dateTime: sDate.toISOString(), timeZone: 'Asia/Kolkata' },
        end: { dateTime: eDate.toISOString(), timeZone: 'Asia/Kolkata' }
      };
    }

    const insertRes = await axios.post(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      eventBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Event inserted directly into Google Calendar.',
      htmlLink: insertRes.data.htmlLink,
      googleEventId: insertRes.data.id
    });
  } catch (err) {
    console.error('[Calendar OAuth] Insert event failed:', err?.response?.data || err.message);
    const status = err?.response?.status || 500;
    return res.status(status).json({
      error: `Failed to insert event into Google Calendar: ${err?.response?.data?.error?.message || err.message}`
    });
  }
}

module.exports = {
  getAuthUrl,
  handleOAuthCallback,
  getOAuthStatus,
  disconnectOAuth,
  insertEventDirect
};
