/**
 * Single fetch wrapper for the CampusMate gateway.
 * Contract: see src/services/API_CONTRACT.md
 */

const rawBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const BASE_URL = rawBase.startsWith('http') && !rawBase.endsWith('/api') ? `${rawBase}/api` : rawBase;
const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT_MS || 20000);

const CLIENT_ID_KEY = 'campusmate_client_id';
const ADMIN_TOKEN_KEY = 'campusmate_admin_token';
const ADMIN_USER_KEY = 'campusmate_admin_user';

// The access token lives in memory for the lifetime of the tab. The refresh
// token is an httpOnly cookie and is never readable from JavaScript.
let memoryAccessToken = null;

export function setAccessToken(token) {
  memoryAccessToken = token || null;
}

export function getAccessToken() {
  return memoryAccessToken;
}

export class ApiError extends Error {
  constructor(message, { status = 0, data = null, code = 'API_ERROR' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = code;
  }
}

/* ---------------------------------------------------------------- identity */

export function getClientId() {
  if (typeof window === 'undefined') return 'server_client';
  try {
    let id = window.localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id =
        window.crypto?.randomUUID?.() ||
        `cm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous_client';
  }
}

export function getAdminToken() {
  if (memoryAccessToken) return memoryAccessToken;
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAdminUser() {
  try {
    return JSON.parse(window.localStorage.getItem(ADMIN_USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setAdminSession(token, user) {
  setAccessToken(token);
  try {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
    window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user || null));
  } catch {
    /* noop */
  }
  window.dispatchEvent(new CustomEvent('campusmate:auth', { detail: { token, user } }));
}

export function clearAdminSession({ redirect = false } = {}) {
  setAccessToken(null);
  try {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.localStorage.removeItem(ADMIN_USER_KEY);
  } catch {
    /* noop */
  }
  window.dispatchEvent(new CustomEvent('campusmate:auth', { detail: { token: null, user: null } }));
  if (redirect && typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/admin/login?next=${next}`);
  }
}

/* ------------------------------------------------------------------ request */

function buildHeaders({ auth, body, headers }) {
  const result = {
    Accept: 'application/json',
    'X-Client-Id': getClientId(),
    ...headers
  };

  if (body !== undefined && !(body instanceof FormData)) {
    result['Content-Type'] = 'application/json';
  }

  // Attach token: user access token from memory, or admin token from storage
  const token = getAccessToken() || getAdminToken();
  if (token) {
    result.Authorization = `Bearer ${token}`;
  }

  return result;
}

function messageFromPayload(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  return payload.error || payload.detail || payload.message || fallback;
}

export async function refreshSession() {
  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-Client-Id': getClientId() },
      credentials: 'include'
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
      window.dispatchEvent(
        new CustomEvent('campusmate:auth', {
          detail: { token: data.accessToken, user: data.user || null, reason: 'refresh' }
        })
      );
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Core request.
 * @param {string} path - path after /api, e.g. "/chat"
 */
export async function request(
  path,
  { method = 'GET', body, auth = false, headers, signal, timeout = DEFAULT_TIMEOUT, responseType = 'json', _retried = false } = {}
) {
  const controller = new AbortController();
  const timer = timeout ? setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeout) : null;

  const onAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', onAbort, { once: true });
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: buildHeaders({ auth, body, headers }),
      body: body === undefined || body instanceof FormData ? body : JSON.stringify(body),
      signal: controller.signal,
      credentials: 'include'
    });
  } catch (err) {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener?.('abort', onAbort);
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      const aborted = signal?.aborted;
      throw new ApiError(aborted ? 'Request cancelled' : 'The server took too long to respond.', {
        status: aborted ? 0 : 408,
        code: aborted ? 'ABORTED' : 'TIMEOUT'
      });
    }
    throw new ApiError('Cannot reach the CampusMate server. Check that the gateway is running.', {
      status: 0,
      code: 'NETWORK_ERROR'
    });
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener?.('abort', onAbort);
  }

  if (response.status === 401 && auth && !_retried && !path.startsWith('/auth/')) {
    const refreshed = await refreshSession();
    if (refreshed?.accessToken) {
      return request(path, { method, body, auth, headers, signal, timeout, responseType, _retried: true });
    }
    clearAdminSession();
    throw new ApiError('Your session expired. Please sign in again.', {
      status: 401,
      code: 'UNAUTHORIZED'
    });
  }

  if (responseType === 'blob' && response.ok) {
    return { blob: await response.blob(), response };
  }

  let payload = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null);
  } else if (responseType === 'text') {
    payload = await response.text().catch(() => null);
  } else {
    payload = await response.text().catch(() => null);
  }

  if (!response.ok) {
    throw new ApiError(messageFromPayload(payload, `Request failed (${response.status}).`), {
      status: response.status,
      data: payload,
      code: payload?.code || 'HTTP_ERROR'
    });
  }

  return payload;
}

/* ------------------------------------------------------------------ helpers */

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

/** Upload with progress (fetch has no upload progress event). */
function uploadWithProgress(path, formData, { auth = true, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}${path}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('X-Client-Id', getClientId());
    if (auth) xhr.setRequestHeader('Authorization', `Bearer ${getAdminToken() || ''}`);
    xhr.timeout = 120000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let payload = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = xhr.responseText;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
      } else if (xhr.status === 401) {
        clearAdminSession({ redirect: true });
        reject(new ApiError('Your admin session expired. Please sign in again.', { status: 401, data: payload }));
      } else {
        reject(
          new ApiError(messageFromPayload(payload, `Upload failed (${xhr.status}).`), {
            status: xhr.status,
            data: payload
          })
        );
      }
    };

    xhr.onerror = () =>
      reject(new ApiError('Upload failed. Check your network connection.', { code: 'NETWORK_ERROR' }));
    xhr.ontimeout = () => reject(new ApiError('Upload timed out.', { status: 408, code: 'TIMEOUT' }));
    xhr.send(formData);
  });
}

/* ---------------------------------------------------------------------- API */

export const api = {
  health: () => request('/../health', { timeout: 6000 }).catch(() => null),

  auth: {
    config: () => request('/auth/config', { timeout: 6000 }),
    signup: (payload) => request('/auth/signup', { method: 'POST', body: payload, timeout: 15000 }),
    login: (payload) => request('/auth/login', { method: 'POST', body: payload, timeout: 15000 }),
    refresh: () => request('/auth/refresh', { method: 'POST', timeout: 15000 }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me', { auth: true }),
    updateMe: (patch) => request('/auth/me', { method: 'PATCH', body: patch, auth: true }),
    changePassword: (payload) => request('/auth/change-password', { method: 'POST', body: payload, auth: true }),
    sessions: () => request('/auth/sessions', { auth: true }),
    revokeSession: (id) => request(`/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),
    signOutOthers: () => request('/auth/sessions/sign-out-others', { method: 'POST', auth: true }),
    logoutAll: () => request('/auth/logout-all', { method: 'POST', auth: true }),
    deleteAccount: () => request('/auth/me', { method: 'DELETE', auth: true }),
    claimGuestHistory: () => request('/auth/claim-guest-history', { method: 'POST', auth: true }),
    getInvite: (token) => request(`/auth/invite/${encodeURIComponent(token)}`),
    acceptInvite: (payload) =>
      request('/auth/invite/accept', { method: 'POST', body: payload, timeout: 15000 })
  },

  documents: {
    list: ({ q, type, department, page, limit } = {}) =>
      request(`/documents${qs({ q, type, department, page, limit })}`),
    get: (id) => request(`/documents/${encodeURIComponent(id)}`),
    fileUrl: (id, { page, download, source } = {}) => {
      const params = qs({ page, download, source });
      return `${BASE_URL}/documents/${encodeURIComponent(id)}/file${params}`;
    }
  },

  activity: {
    calendarAdd: (payload) => request('/activity/calendar-add', { method: 'POST', body: payload, auth: Boolean(getAdminToken()) }),
    pageView: (path) => request('/activity/page-view', { method: 'POST', body: { path } })
  },

  dashboard: {
    overview: (params) => request(`/admin/dashboard/overview${qs(params)}`, { auth: true, timeout: 30000 }),
    students: (params) => request(`/admin/dashboard/students${qs(params)}`, { auth: true, timeout: 30000 }),
    studentUsage: (id, params) =>
      request(`/admin/dashboard/students/${encodeURIComponent(id)}/usage${qs(params)}`, { auth: true, timeout: 30000 }),
    setStudentStatus: (id, status) =>
      request(`/admin/dashboard/students/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status }
      }),
    documents: (params) => request(`/admin/dashboard/documents${qs(params)}`, { auth: true, timeout: 30000 }),
    chats: (params) => request(`/admin/dashboard/chats${qs(params)}`, { auth: true, timeout: 30000 }),
    chat: (id) => request(`/admin/dashboard/chats/${encodeURIComponent(id)}`, { auth: true, timeout: 30000 }),
    activity: (params) => request(`/admin/dashboard/activity${qs(params)}`, { auth: true, timeout: 30000 }),
    exportUrl: (type, params) => `${BASE_URL}/admin/dashboard/${type}/export${qs(params)}`,
    exportCsv: (type, params) =>
      request(`/admin/dashboard/${type}/export${qs(params)}`, {
        auth: true,
        responseType: 'blob',
        timeout: 60000
      })
  },

  chat: {
    send: ({ query, sessionId }) => {
      try {
        if (!getAdminToken() && typeof window !== 'undefined') {
          window.localStorage.setItem('campusmate_has_guest_chats', '1');
        }
      } catch {
        /* noop */
      }
      return request('/chat', { method: 'POST', body: { query, sessionId }, timeout: 30000 });
    },
    history: (sessionId) => request(`/chat/history/${encodeURIComponent(sessionId)}`)
  },

  conversations: {
    list: ({ search, cursor, limit } = {}) => request(`/conversations${qs({ search, cursor, limit })}`),
    create: (title = 'New Conversation') =>
      request('/conversations', { method: 'POST', body: { title } }),
    messages: (id) => request(`/conversations/${encodeURIComponent(id)}/messages`),
    update: (id, patch) =>
      request(`/conversations/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
    remove: (id) => request(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    clear: () => request('/conversations', { method: 'DELETE' })
  },

  feedback: {
    create: (payload) => request('/feedback', { method: 'POST', body: payload })
  },

  admin: {
    login: ({ email, username, password, rememberMe }) =>
      request('/admin/auth/login', {
        method: 'POST',
        body: { email: email || username, username: username || email, password, rememberMe },
        timeout: 15000
      }),

    team: {
      list: () => request('/admin/team', { auth: true }),
      invite: (payload) => request('/admin/team/invites', { method: 'POST', auth: true, body: payload }),
      invites: () => request('/admin/team/invites', { auth: true }),
      revokeInvite: (id) => request(`/admin/team/invites/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),
      setStatus: (id, status) =>
        request(`/admin/team/${encodeURIComponent(id)}`, { method: 'PATCH', auth: true, body: { status } }),
      resetLink: (id) =>
        request(`/admin/team/${encodeURIComponent(id)}/reset-link`, { method: 'POST', auth: true }),
      remove: (id) => request(`/admin/team/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true })
    },

    audit: {
      list: (params) => request(`/admin/audit${qs(params)}`, { auth: true })
    },

    documents: {
      list: ({ status, doc_type, search } = {}) =>
        request(`/admin/documents${qs({ status, doc_type, search })}`, { auth: true }),
      upload: (formData, onProgress) =>
        uploadWithProgress('/admin/documents/upload', formData, { onProgress }),
      remove: (id) => request(`/admin/documents/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),
      setStatus: (id, status) =>
        request(`/admin/documents/${encodeURIComponent(id)}/status`, {
          method: 'PATCH',
          auth: true,
          body: { status }
        }),
      reindex: () => request('/admin/documents/reindex', { method: 'POST', auth: true, timeout: 60000 })
    },

    feedback: {
      queue: ({ status, rating } = {}) => request(`/admin/feedback/queue${qs({ status, rating })}`, { auth: true }),
      review: (id, payload) =>
        request(`/admin/feedback/${encodeURIComponent(id)}/review`, { method: 'PATCH', auth: true, body: payload }),
      exportAll: () => request('/admin/feedback/export', { auth: true })
    },

    analytics: {
      overview: ({ startDate, endDate, includeSeeded } = {}) =>
        request(`/admin/analytics/overview${qs({ startDate, endDate, includeSeeded })}`, { auth: true }),
      exportCsv: (table = 'unanswered', params = {}) =>
        request(`/admin/analytics/export-csv${qs({ table, ...params })}`, {
          auth: true,
          responseType: 'blob'
        })
    },

    cache: {
      stats: () => request('/admin/cache-stats', { auth: true, timeout: 8000 }),
      invalidate: () => request('/admin/cache/invalidate', { method: 'POST', auth: true }),
      latency: () => request('/admin/latency-stats', { auth: true, timeout: 8000 })
    },

    calendar: {
      listPending: ({ status = 'pending', page = 1, limit = 50 } = {}) =>
        request(`/calendar/admin/events${qs({ status, page, limit })}`, { auth: true }),
      approve: (id) =>
        request(`/calendar/admin/events/${encodeURIComponent(id)}/approve`, { method: 'PUT', auth: true }),
      reject: (id) =>
        request(`/calendar/admin/events/${encodeURIComponent(id)}/reject`, { method: 'PUT', auth: true }),
      edit: (id, payload) =>
        request(`/calendar/admin/events/${encodeURIComponent(id)}`, { method: 'PUT', auth: true, body: payload }),
      createManual: (payload) =>
        request('/calendar/admin/events', { method: 'POST', auth: true, body: payload })
    }
  },

  calendar: {
    getEvents: ({ from, to, category, semester } = {}) =>
      request(`/calendar/events${qs({ from, to, category, semester })}`),
    exportSelectedIcs: (eventIds) =>
      request('/calendar/ics', { method: 'POST', body: { eventIds }, responseType: 'blob' }),
    oauth: {
      getAuthUrl: () => request('/calendar/oauth/auth-url', { client: true }),
      getStatus: () => request('/calendar/oauth/status', { client: true }),
      disconnect: () => request('/calendar/oauth/disconnect', { method: 'POST', client: true }),
      insertDirect: (eventId) => request('/calendar/oauth/insert', { method: 'POST', client: true, body: { eventId } })
    }
  }
};

export default api;
