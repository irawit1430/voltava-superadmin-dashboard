import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { formatNumber } from '../../lib/format';
import { Skeleton } from './Skeleton';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'p-4 border-b border-slate-100 flex items-start justify-between gap-3 flex-wrap',
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/**
 * One KPI tile, used everywhere. This markup was previously copy-pasted ten
 * times across three files and had already drifted into two different layouts
 * for the same concept.
 */
export function KpiCard({
  label,
  value,
  icon,
  tone = 'brand',
  hint,
  loading,
  /** Explains what population the number is drawn from, e.g. "all schools". */
  basis,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: 'brand' | 'ok' | 'warn' | 'danger' | 'neutral';
  hint?: ReactNode;
  loading?: boolean;
  basis?: string;
}) {
  const iconTone = {
    brand: 'bg-brand-50 text-brand-600',
    ok: 'bg-ok-50 text-ok-600',
    warn: 'bg-warn-50 text-warn-600',
    danger: 'bg-danger-50 text-danger-600',
    neutral: 'bg-slate-100 text-slate-500',
  }[tone];

  const valueTone = tone === 'danger' ? 'text-danger-700' : 'text-slate-800';

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start gap-3 mb-1.5">
        <p className="label">{label}</p>
        {icon && (
          <div className={cn('w-7 h-7 rounded flex items-center justify-center shrink-0', iconTone)}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <h2 className={cn('text-2xl font-bold tabular-nums', valueTone)}>
            {typeof value === 'number' ? formatNumber(value) : value}
          </h2>
        )}
        {!loading && hint}
      </div>
      {basis && <p className="text-xs text-slate-500 mt-1.5">{basis}</p>}
    </div>
  );
}
