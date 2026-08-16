import { cn } from '../../lib/utils';
import { initials } from '../../lib/format';

/**
 * Initials rendered locally. This replaces `ui-avatars.com`, which put every
 * user's real name into a third-party URL on each render — and whose
 * `name.replace(' ', '+')` only replaced the first space, so any three-word
 * name produced a broken request.
 */
export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dims = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  }[size];

  return (
    <span
      aria-hidden="true"
      className={cn(
        'rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center shrink-0 select-none',
        dims,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
