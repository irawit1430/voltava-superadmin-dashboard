import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { freshness, relativeTime } from './format';

// The device list's "when did we last hear from it", which decides what an admin chases.

const NOW = new Date('2026-09-24T10:00:00Z');
const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => vi.useRealTimers());

describe('freshness', () => {
  it('grades a device by how long it has been quiet', () => {
    expect(freshness(ago(5))).toBe('live');
    expect(freshness(ago(30))).toBe('stale');
    expect(freshness(ago(120))).toBe('critical');
    expect(freshness(null)).toBe('never');
    expect(freshness('not a date')).toBe('never');
  });
});

describe('relativeTime', () => {
  it('reads at a glance', () => {
    expect(relativeTime(ago(0.5))).toBe('just now');
    expect(relativeTime(ago(4))).toBe('4 min ago');
    expect(relativeTime(ago(180))).toBe('3 h ago');
    expect(relativeTime(ago(60 * 24 * 2))).toBe('2 d ago');
    expect(relativeTime(undefined)).toBe('Never');
  });
});
