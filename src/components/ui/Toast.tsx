import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Replaces the ten native `alert()` calls. Those blocked the thread, could not
 * be styled, and — for the device secret — presented a value the user has to
 * copy inside a dialog that makes copying awkward.
 */

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
}

interface ToastApi {
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, detail?: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, tone, title, detail }]);
      // Errors stay longer — they usually need reading.
      window.setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 4500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, detail) => push('success', title, detail),
      error: (title, detail) => push('error', title, detail),
      info: (title, detail) => push('info', title, detail),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 pointer-events-none sm:w-96"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = {
    success: { icon: CheckCircle2, ring: 'border-ok-200', accent: 'text-ok-600' },
    error: { icon: AlertTriangle, ring: 'border-danger-200', accent: 'text-danger-600' },
    info: { icon: Info, ring: 'border-slate-200', accent: 'text-slate-500' },
  }[toast.tone];
  const Icon = config.icon;

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto bg-white rounded-xl border shadow-lg p-3.5 flex gap-3 items-start',
        config.ring,
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', config.accent)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
        {toast.detail && <p className="text-sm text-slate-600 mt-0.5">{toast.detail}</p>}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-slate-400 hover:text-slate-700 shrink-0 p-1 -m-1 rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
