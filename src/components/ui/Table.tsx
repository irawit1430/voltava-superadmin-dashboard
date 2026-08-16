import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * Table primitives.
 *
 * Every list page was a 5–7 column table in an `overflow-x-auto` box with no
 * mobile treatment, so on a phone you got sideways scrolling and school names
 * chopped mid-word. Pages now render `<DataTable>` on md+ and `<CardList>`
 * below it — same data, layout that fits the screen.
 */

export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('hidden md:block overflow-x-auto', className)}>
      <table className="w-full text-left">{children}</table>
    </div>
  );
}

export function Th({
  children,
  align = 'left',
  className,
}: {
  children?: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        'px-3 py-2.5 sm:px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-slate-50',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = 'left',
  className,
}: {
  children?: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'px-3 py-3 sm:px-4 text-sm text-slate-700 align-middle',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className,
      )}
    >
      {children}
    </td>
  );
}

/**
 * Icon + truncating text inside a cell. A `td` must never be `display:flex` —
 * it drops out of table layout and the header columns stop lining up with the
 * body. The flexing happens on this inner span instead.
 */
export function CellInline({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('cell-inline', className)}>
      {icon}
      <span className="cell-text">{children}</span>
    </span>
  );
}

export function CardList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul className={cn('md:hidden divide-y divide-slate-100', className)}>{children}</ul>
  );
}

export function CardRow({
  title,
  subtitle,
  badge,
  rows,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  rows?: { label: string; value: ReactNode }[];
  actions?: ReactNode;
}) {
  return (
    <li className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-slate-800 break-words">{title}</div>
          {subtitle && <div className="text-sm text-slate-500 mt-0.5 break-words">{subtitle}</div>}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {rows && rows.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {rows.map((r) => (
            <div key={r.label} className="min-w-0">
              <dt className="label">{r.label}</dt>
              <dd className="text-sm text-slate-700 mt-0.5 break-words">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </li>
  );
}
