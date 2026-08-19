import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

function pageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) pages.push('...');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push('...');
  if (total > 1) pages.push(total);
  return pages;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  noun = 'records',
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  noun?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="p-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap bg-slate-50">
      <span className="text-sm text-slate-600 tabular-nums">
        {total === 0 ? (
          <>No {noun}</>
        ) : (
          <>
            Showing <b className="font-semibold text-slate-800">{from}&ndash;{to}</b> of{' '}
            <b className="font-semibold text-slate-800">{total.toLocaleString()}</b> {noun}
          </>
        )}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          aria-label="Previous page"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {totalPages > 1 &&
          pageRange(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400 select-none">
                &hellip;
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'w-8 h-8 rounded-lg text-sm font-medium transition-all duration-150',
                  p === page
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {p}
              </button>
            ),
          )}

        <button
          aria-label="Next page"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
