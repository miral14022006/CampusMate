/**
 * Single fetch wrapper for the CampusMate gateway.
 * Contract: see src/services/API_CONTRACT.md
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT_MS || 20000);

const CLIENT_ID_KEY = 'campusmate_client_id';
const ADMIN_TOKEN_KEY = 'campusmate_admin_token';
const ADMIN_USER_KEY = 'campusmate_admin_user';

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
  try {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
    window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user || null));
  } catch {
    /* noop */
  }
  window.dispatchEvent(new CustomEvent('campusmate:auth', { detail: { token, user } }));
}

export function clearAdminSession({ redirect = false } = {}) {
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

  if (auth) {
    const token = getAdminToken();
    if (token) result.Authorization = `Bearer ${token}`;
  }

  return result;
}

function messageFromPayload(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  return payload.error || payload.detail || payload.message || fallback;
}

/**
 * Core request.
 * @param {string} path - path after /api, e.g. "/chat"
 */
export async function request(
  path,
  { method = 'GET', body, auth = false, headers, signal, timeout = DEFAULT_TIMEOUT, responseType = 'json' } = {}
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
      credentials: 'omit'
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

  if (response.status === 401 && auth) {
    clearAdminSession({ redirect: true });
    throw new ApiError('Your admin session expired. Please sign in again.', {
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

  chat: {
    send: ({ query, sessionId }) =>
      request('/chat', { method: 'POST', body: { query, sessionId }, timeout: 30000 }),
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
    login: ({ username, password }) =>
      request('/admin/login', { method: 'POST', body: { username, password }, timeout: 15000 }),

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
  },

  telegram: {
    status: () => request('/telegram/status', { timeout: 6000 })
  }
};

export default api;
