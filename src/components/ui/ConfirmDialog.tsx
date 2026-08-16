import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

/**
 * Replaces native `confirm()`, which is unstyled, unbrandable, and — worse —
 * gave the same one-line message whether you were deleting a test record or a
 * live client with fourteen buses attached.
 *
 * Pass `confirmPhrase` for anything irreversible: the operator has to type the
 * record's name before the button unlocks.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  consequences,
  confirmPhrase,
  confirmLabel = 'Delete',
  tone = 'danger',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  body?: ReactNode;
  /** Bullet list of what else this touches. Say it out loud before it happens. */
  consequences?: string[];
  confirmPhrase?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTyped('');
      setBusy(false);
      setError(null);
    }
  }, [open]);

  const unlocked = !confirmPhrase || typed.trim() === confirmPhrase.trim();

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={run}
            disabled={!unlocked}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {body && <div className="text-sm text-slate-600">{body}</div>}

        {consequences && consequences.length > 0 && (
          <div className="flex gap-3 p-3 rounded-lg bg-danger-50 border border-danger-100">
            <AlertTriangle className="w-4 h-4 text-danger-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm text-danger-700">
              <p className="font-semibold mb-1">This also removes:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {consequences.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {confirmPhrase && (
          <div>
            <label htmlFor="confirm-phrase" className="label block mb-1.5">
              Type <span className="text-slate-800 normal-case">{confirmPhrase}</span> to confirm
            </label>
            <input
              id="confirm-phrase"
              type="text"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-danger-700 bg-danger-50 border border-danger-100 rounded-lg p-3">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
