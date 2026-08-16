import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-8" role="status">
      {/* Was text-blue-600 — a colour that appeared nowhere else in the product. */}
      <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
