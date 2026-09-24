import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, AUTH_MESSAGE_KEY, errorMessage, query, request, toPage } from './api';

// Every call in the console goes through request(): the token, what a 401 does, and the
// words an admin sees when something fails.

const respond = (status: number, body?: unknown) =>
  vi.fn().mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // On the login page already, so a 401 clears the session without navigating.
  window.history.pushState({}, '', '/login');
});
afterEach(() => vi.unstubAllGlobals());

describe('request', () => {
  it('sends the signed-in token', async () => {
    localStorage.setItem('token', 'tok-1');
    const fetch = respond(200, { ok: true });
    vi.stubGlobal('fetch', fetch);

    await request('/api/schools');

    expect(fetch.mock.calls[0][1].headers).toMatchObject({ Authorization: 'Bearer tok-1' });
  });

  it('signs out on a 401 and says why on the login screen', async () => {
    localStorage.setItem('token', 'tok-1');
    localStorage.setItem('user', '{}');
    vi.stubGlobal('fetch', respond(401, { error: 'expired' }));

    await expect(request('/api/schools')).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem(AUTH_MESSAGE_KEY)).toMatch(/session expired/i);
  });

  it('leaves the session alone on a failed login', async () => {
    localStorage.setItem('token', 'tok-1');
    vi.stubGlobal('fetch', respond(401, { error: 'Invalid credentials' }));

    await expect(request('/api/auth/login', { method: 'POST', body: {}, redirectOnAuthFailure: false }))
      .rejects.toMatchObject({ message: 'Invalid credentials' });
    expect(localStorage.getItem('token')).toBe('tok-1');
  });

  it('lists the fields the server rejected', async () => {
    vi.stubGlobal('fetch', respond(400, { error: 'Validation failed', issues: [{ message: 'name is required' }] }));

    await expect(request('/api/schools', { method: 'POST', body: {} })).rejects.toThrow('Validation failed: name is required');
  });

  it('never shows a server failure as something the admin did', async () => {
    vi.stubGlobal('fetch', respond(502));

    await expect(request('/api/schools')).rejects.toThrow(/server failed.*\(502\)/);
  });

  it('says the server cannot be reached when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const err = await request('/api/schools').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(errorMessage(err)).toMatch(/can't reach the server/i);
  });
});

describe('list helpers', () => {
  it('reads a bare array and the paged shapes alike', () => {
    expect(toPage([1, 2])).toEqual({ items: [1, 2], total: 2 });
    expect(toPage({ data: [1], total: 40 })).toEqual({ items: [1], total: 40 });
    expect(toPage({ items: [1, 2], count: 9 })).toEqual({ items: [1, 2], total: 9 });
    expect(toPage(null)).toEqual({ items: [], total: 0 });
  });

  it('builds a query string, leaving out empty values', () => {
    expect(query({ page: 2, q: 'green valley', status: '', school: null })).toBe('?page=2&q=green%20valley');
    expect(query({})).toBe('');
  });
});
