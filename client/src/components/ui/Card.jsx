import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  default: 'bg-surface-1 border border-hairline rounded-lg shadow-soft',
  flat: 'bg-surface-1 border border-hairline rounded-lg',
  glass: 'glass border border-hairline rounded-lg shadow-soft',
  accent: 'bg-accent-soft border border-[color:var(--accent-ring)] rounded-lg'
};

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6 sm:p-7'
};

export const Card = forwardRef(function Card(
  { as: Tag = 'div', variant = 'default', padding = 'md', interactive = false, className, children, ...props },
  ref
) {
  const onMouseMove = (e) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mx', `${x}px`);
    e.currentTarget.style.setProperty('--my', `${y}px`);
  };

  return (
    <Tag
      ref={ref}
      onMouseMove={interactive ? onMouseMove : undefined}
      className={cn(
        VARIANTS[variant] || VARIANTS.default,
        PADDING[padding],
        interactive &&
          'cm-spotlight-card hover:border-[color:var(--border-strong)] hover:shadow-lift',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
});

export function CardHeader({ title, description, action, className = '', icon = null }) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default Card;
