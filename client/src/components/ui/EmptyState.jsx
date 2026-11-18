import { cn } from '../../lib/cn';

export function EmptyState({
  icon = null,
  title = 'Nothing here yet',
  description,
  action = null,
  className = '',
  compact = false
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-8' : 'px-6 py-14',
        className
      )}
    >
      {icon ? (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
          {icon}
        </span>
      ) : null}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
