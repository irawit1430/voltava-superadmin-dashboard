/**
 * Single entry point for every backend call.
 *
 * Before this existed, `fetch(...)` plus a hand-assembled Authorization header
 * was retyped at 30 call sites, and every failure path was
 * `res.ok ? res.json() : []` — which renders a server outage identically to an
 * empty account. Centralising it is what makes real error states, loading
 * states, request cancellation and 401/403 handling possible at all.
 */

const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

/** Key used to hand a message to the login screen across the redirect. */
export const AUTH_MESSAGE_KEY = 'auth:message';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function signOut(message: string) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  try {
    sessionStorage.setItem(AUTH_MESSAGE_KEY, message);
  } catch {
    /* private mode — the redirect still works, just without the message */
  }
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

/**
 * Turn a failed response into something a human can act on. The old code showed
 * "Invalid credentials" for a 500 and nothing at all for everything else.
 */
function messageFor(status: number, payload: any): string {
  const fromServer =
    (typeof payload?.error === 'string' && payload.error) ||
    (typeof payload?.message === 'string' && payload.message) ||
    '';

  const issues: string[] = Array.isArray(payload?.issues)
    ? payload.issues.map((i: any) => i?.message).filter(Boolean)
    : [];

  if (issues.length) {
    return `${fromServer || 'Some fields need attention'}: ${issues.join(', ')}`;
  }
  if (fromServer) return fromServer;

  switch (status) {
    case 400:
      return 'The server rejected that request. Check the values and try again.';
    case 403:
      return "You don't have permission to do that. This console requires a super admin account.";
    case 404:
      return 'That record no longer exists. It may have been deleted by someone else.';
    case 409:
      return 'That already exists. Use a different value.';
    case 422:
      return 'Some fields are invalid. Check the form and try again.';
    case 429:
      return 'Too many requests. Wait a moment and try again.';
    default:
      if (status >= 500) {
        return `The server failed while handling that request (${status}). If it keeps happening, send this to the backend team.`;
      }
      return `Request failed (${status}).`;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Set false for the login call, which must not redirect on 401. */
  redirectOnAuthFailure?: boolean;
}

export async function request<T = unknown>(
  path: string,
  { method = 'GET', body, signal, redirectOnAuthFailure = true }: RequestOptions = {},
): Promise<T> {
  let res: Response;

  try {
    res = await fetch(BASE + path, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(
      "Can't reach the server. Check your connection, then try again.",
      0,
      err,
    );
  }

  if (res.status === 401 && redirectOnAuthFailure) {
    signOut('Your session expired. Please sign in again.');
    throw new ApiError('Session expired.', 401);
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new ApiError(messageFor(res.status, payload), res.status, payload);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('The server returned a response we could not read.', res.status);
  }
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'POST', body, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'PUT', body, signal }),
  del: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: 'DELETE', signal }),
};

/* ------------------------------------------------------------------ */
/* List helpers                                                        */
/* ------------------------------------------------------------------ */

export interface Page<T> {
  items: T[];
  total: number;
}

/**
 * The backend returns either a bare array or `{ data, total }` depending on the
 * endpoint. Normalise once here rather than branching at every call site.
 */
export function toPage<T>(data: unknown): Page<T> {
  if (Array.isArray(data)) {
    return { items: data as T[], total: data.length };
  }
  const obj = (data ?? {}) as Record<string, any>;
  const items: T[] = Array.isArray(obj.data)
    ? obj.data
    : Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.results)
        ? obj.results
        : [];
  const total =
    typeof obj.total === 'number'
      ? obj.total
      : typeof obj.count === 'number'
        ? obj.count
        : items.length;
  return { items, total };
}

export function query(params: Record<string, string | number | undefined | null>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}
