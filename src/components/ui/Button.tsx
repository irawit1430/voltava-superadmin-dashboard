import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost' | 'critical';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  // Primary actions are slate, not brand-green. A saturated green button reads
  // as an "online / go" status — the same green the fleet uses for a moving
  // bus. Making actions neutral-dark frees green to mean exactly one thing:
  // healthy. The emerald stays the identity colour (logo, links, focus ring).
  primary: 'bg-slate-900 text-white hover:bg-slate-800 border border-transparent',
  secondary:
    'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
  ghost: 'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 border border-transparent',
  dangerGhost:
    'bg-transparent text-danger-600 border border-transparent hover:bg-danger-50',
  // Reserved for life-safety (SOS) actions — a truer, louder red than danger.
  critical: 'bg-critical-600 text-white hover:bg-critical-700 border border-transparent',
};

const SIZES: Record<Size, string> = {
  // Minimum 36px tall. Row actions used to be ~22px, well under any usable
  // touch target.
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150',
        'active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: 'neutral' | 'danger';
}

/** Square action button. `label` is required — it becomes the accessible name. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, tone = 'neutral', className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150 active:scale-90',
          tone === 'danger'
            ? 'text-slate-500 hover:text-danger-700 hover:bg-danger-50'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
