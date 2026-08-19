import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded bg-gradient-to-r from-slate-200/80 via-slate-100/80 to-slate-200/80 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]',
        className,
      )}
      aria-hidden="true"
    />
  );
}

/** Placeholder rows so a slow list reads as "loading", not "you have no data". */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-slate-100 last:border-0">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-3 py-3.5 sm:px-4">
              <Skeleton className={cn('h-4', c === 0 ? 'w-24' : c === 1 ? 'w-40' : 'w-16')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
