import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from './Button';

/**
 * Shows an honest range. The dashboard footer previously read "Showing 5 of 23"
 * then "Showing 10 of 23" on page two — a running total where the user needs to
 * know which slice they're looking at.
 */
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
            Showing <b className="font-semibold text-slate-800">{from}–{to}</b> of{' '}
            <b className="font-semibold text-slate-800">{total.toLocaleString()}</b> {noun}
          </>
        )}
      </span>
      <div className="flex items-center gap-1">
        <IconButton
          label="Previous page"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </IconButton>
        <span className="px-3 text-sm font-medium text-slate-700 tabular-nums">
          {page} / {totalPages}
        </span>
        <IconButton
          label="Next page"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </IconButton>
      </div>
    </div>
  );
}
