import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { normaliseStatus } from '../../lib/format';

/**
 * The single place state gets a colour.
 *
 * Before this, "offline" was rose in the device table, amber in the school
 * profile donut, and amber again beside a rose "warning" tile on the dashboard.
 * Semantic colour only works if one state maps to exactly one hue.
 */
export type Tone = 'ok' | 'warn' | 'danger' | 'critical' | 'info' | 'neutral' | 'brand';

const TONES: Record<Tone, string> = {
  ok: 'bg-ok-50 text-ok-700 border-ok-100',
  warn: 'bg-warn-50 text-warn-700 border-warn-100',
  danger: 'bg-danger-50 text-danger-700 border-danger-100',
  critical: 'bg-critical-50 text-critical-700 border-critical-100',
  info: 'bg-info-50 text-info-600 border-info-100',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
};

const DOT_TONES: Record<Tone, string> = {
  ok: 'bg-ok-500',
  warn: 'bg-warn-500',
  danger: 'bg-danger-500',
  critical: 'bg-critical-600',
  info: 'bg-info-500',
  neutral: 'bg-slate-400',
  brand: 'bg-brand-500',
};

export function Badge({
  tone = 'neutral',
  children,
  dot,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-bold uppercase tracking-wide whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', DOT_TONES[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function StatusDot({ tone, className }: { tone: Tone; className?: string }) {
  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full shrink-0', DOT_TONES[tone], className)}
      aria-hidden="true"
    />
  );
}

/** Device ONLINE/OFFLINE, casing-insensitive. */
export function DeviceStatusBadge({ status }: { status?: string | null }) {
  const s = normaliseStatus(status);
  if (s === 'ONLINE') return <Badge tone="ok" dot>Online</Badge>;
  if (s === 'MAINTENANCE') return <Badge tone="warn" dot>Maintenance</Badge>;
  return <Badge tone="danger" dot>Offline</Badge>;
}

/**
 * School lifecycle status. Falls back to a neutral badge showing whatever the
 * server sent rather than silently rendering everything as "Suspended" — the
 * old two-branch ternary turned an unexpected casing into a directory full of
 * red rows with no error anywhere.
 */
export function SchoolStatusBadge({ status }: { status?: string | null }) {
  const s = normaliseStatus(status);
  if (!s) return <Badge tone="neutral">Unknown</Badge>;
  if (s === 'ACTIVE') return <Badge tone="ok" dot>Active</Badge>;
  if (s === 'PENDING') return <Badge tone="warn" dot>Pending</Badge>;
  if (s === 'SUSPENDED') return <Badge tone="danger" dot>Suspended</Badge>;
  return <Badge tone="neutral">{s.toLowerCase()}</Badge>;
}
