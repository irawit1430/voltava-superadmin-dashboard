/**
 * Display formatting. The device list previously rendered `lastPing` as a raw
 * ISO string, which is unreadable and — more importantly — makes "which devices
 * went dark today?" impossible to answer at a glance.
 */

/** A device that hasn't reported within this many minutes is degraded. */
export const STALE_MINUTES = 30;
/** ...and beyond this it needs attention now. */
export const CRITICAL_MINUTES = 120;

export type Freshness = 'live' | 'stale' | 'critical' | 'never';

export function minutesSince(value: string | number | Date | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  return (Date.now() - then) / 60000;
}

export function freshness(value: string | number | Date | null | undefined): Freshness {
  const mins = minutesSince(value);
  if (mins === null) return 'never';
  if (mins >= CRITICAL_MINUTES) return 'critical';
  if (mins >= STALE_MINUTES) return 'stale';
  return 'live';
}

/** "just now", "4 min ago", "3 h ago", "2 d ago", "Never". */
export function relativeTime(value: string | number | Date | null | undefined): string {
  const mins = minutesSince(value);
  if (mins === null) return 'Never';
  if (mins < 0) return 'just now';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${Math.floor(mins)} min ago`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.floor(hours)} h ago`;
  const days = hours / 24;
  if (days < 30) return `${Math.floor(days)} d ago`;
  return formatDate(value);
}

export function formatDate(value: string | number | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(value: string | number | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(d)}, ${formatTime(d)}`;
}

export function formatNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';
}

/** Initials for an avatar, so we stop shipping every user's name to a third party. */
export function initials(name: string | null | undefined): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** `SUPER_ADMIN` -> `Super Admin`. The old `.replace('_',' ')` only hit the first underscore. */
export function humanise(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Status strings arrive in inconsistent casing depending on the endpoint
 * (`ACTIVE`, `Active`, `active`). Compare on a normalised form so a casing
 * change on the backend can't silently paint the whole directory red.
 */
export function normaliseStatus(value: string | null | undefined): string {
  return (value || '').trim().toUpperCase();
}

export function isOnline(status: string | null | undefined): boolean {
  return normaliseStatus(status) === 'ONLINE';
}

/** Guards Leaflet against a device that has never reported a fix. */
export function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}
