import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const CONTROL =
  'w-full px-3 py-2 min-h-10 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow disabled:bg-slate-50 disabled:text-slate-500';

function Wrapper({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-danger-600 ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger-700">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  wrapperClassName?: string;
}

export function TextField({
  label,
  hint,
  error,
  wrapperClassName,
  className,
  required,
  ...rest
}: TextFieldProps) {
  const id = useId();
  return (
    <Wrapper
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, error && 'border-danger-300 focus:ring-danger-500', className)}
        {...rest}
      />
    </Wrapper>
  );
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  wrapperClassName?: string;
  children: ReactNode;
}

export function SelectField({
  label,
  hint,
  error,
  wrapperClassName,
  className,
  required,
  children,
  ...rest
}: SelectFieldProps) {
  const id = useId();
  return (
    <Wrapper
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <select
        id={id}
        required={required}
        className={cn(CONTROL, error && 'border-danger-300', className)}
        {...rest}
      >
        {children}
      </select>
    </Wrapper>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  tone = 'brand',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  tone?: 'brand' | 'danger';
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-slate-800 cursor-pointer">
          {label}
        </label>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative shrink-0 w-11 h-6 rounded-full transition-colors',
          checked ? (tone === 'danger' ? 'bg-danger-600' : 'bg-brand-600') : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  );
}
