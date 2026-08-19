import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw, SearchX } from 'lucide-react';
import { Button } from './Button';

/**
 * Empty states used to be a bare sentence — "No devices found." — with no way
 * forward. A first-run screen should offer the action, not report an absence.
 */
export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="px-6 py-14 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 ring-4 ring-slate-50 flex items-center justify-center text-slate-400">
        {icon ?? <Inbox className="w-5 h-5" />}
      </div>
      <div>
        <p className="font-semibold text-slate-800">{title}</p>
        {body && <p className="text-sm text-slate-500 mt-1 max-w-sm">{body}</p>}
      </div>
      {action}
    </div>
  );
}

/** Shown when filters exclude everything — distinct from having no records. */
export function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={<SearchX className="w-5 h-5" />}
      title="No matches for these filters"
      body="Nothing here fits the current search and status. Widen the filters to see more."
      action={
        <Button variant="secondary" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  );
}

/**
 * A failed request must not look like an empty account. This is the difference
 * the old `res.ok ? res.json() : []` pattern erased.
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="px-6 py-12 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-danger-50 ring-4 ring-danger-50/50 flex items-center justify-center text-danger-600">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div>
        <p className="font-semibold text-slate-800">Couldn't load this</p>
        <p className="text-sm text-slate-600 mt-1 max-w-md">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try again
        </Button>
      )}
    </div>
  );
}

/** Inline banner for errors that sit above content rather than replacing it. */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-danger-50 border border-danger-100">
      <AlertTriangle className="w-4 h-4 text-danger-600 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm text-danger-700 flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-semibold text-danger-700 hover:underline shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
}
