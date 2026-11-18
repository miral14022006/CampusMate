import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Chip({
  children,
  icon = null,
  onClick,
  onRemove,
  active = false,
  className = '',
  type = 'button',
  ...props
}) {
  const interactive = Boolean(onClick);
  const Tag = interactive ? 'button' : 'span';
  return (
    <Tag
      type={interactive ? type : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-pill border px-3.5 py-2 text-[12.5px] font-medium transition-colors duration-150 ease-premium',
        active
          ? 'border-transparent bg-accent text-white'
          : 'border-[color:var(--border-strong)] bg-transparent text-ink-secondary hover:border-accent hover:bg-accent-soft hover:text-accent',
        interactive && 'cursor-pointer active:scale-[0.98]',
        className
      )}
      {...props}
    >
      {icon ? <span className="shrink-0" aria-hidden="true">{icon}</span> : null}
      <span className="truncate">{children}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="-mr-1 ml-0.5 rounded-full p-0.5 text-current hover:bg-black/10"
          aria-label="Remove"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      ) : null}
    </Tag>
  );
}

export default Chip;
