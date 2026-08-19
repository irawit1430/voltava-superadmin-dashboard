import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IconButton } from './Button';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog. The five hand-rolled modals this replaces had no Escape
 * key, no click-outside, no focus trap, no autofocus and no ARIA — a keyboard
 * user could tab straight out of the dialog into the page behind the overlay
 * with no way to dismiss it.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusable = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // Land focus on the first real control so the form is immediately typeable.
    // Prefer input/textarea/select over buttons (like the close button).
    const firstInput = panelRef.current?.querySelector<HTMLElement>(
      'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'
    );
    const firstFocusable = focusable()[0];
    (firstInput ?? firstFocusable ?? panelRef.current)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      const inside = panelRef.current?.contains(active as Node);

      if (event.shiftKey && (active === firstItem || !inside)) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] overlay-enter"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full bg-white shadow-xl flex flex-col outline-none modal-enter',
          'rounded-t-2xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh]',
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-slate-800">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-sm text-slate-500 mt-1">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close dialog" onClick={onClose} className="-mr-1 -mt-1">
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
