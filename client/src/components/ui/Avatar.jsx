import { User } from 'lucide-react';
import { cn } from '../../lib/cn';
import { initials } from '../../lib/format';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-[13px]',
  lg: 'h-12 w-12 text-[15px]',
  xl: 'h-16 w-16 text-xl'
};

export function Avatar({
  name = '',
  src,
  size = 'md',
  icon = false,
  status,
  className = '',
  alt
}) {
  const label = name ? initials(name) : null;
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center overflow-hidden rounded-full border border-hairline bg-surface-3 font-semibold text-ink-secondary',
          SIZES[size] || SIZES.md
        )}
      >
        {src ? (
          <img src={src} alt={alt || name || 'Avatar'} className="h-full w-full object-cover" />
        ) : icon ? (
          <User className="h-[45%] w-[45%]" aria-hidden="true" />
        ) : (
          <span aria-hidden="true">{label || 'U'}</span>
        )}
      </span>
      {status ? (
        <span
          className={cn(
            'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface-1',
            status === 'online' ? 'bg-[color:var(--positive)]' : 'bg-ink-muted'
          )}
          aria-label={status}
        />
      ) : null}
    </span>
  );
}

export default Avatar;
