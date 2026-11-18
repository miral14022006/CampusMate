import { cn } from '../../lib/cn';

export function Skeleton({ className = '', variant = 'rect', width, height }) {
  const shapes = {
    rect: 'rounded-sm',
    text: 'rounded-[5px]',
    circle: 'rounded-full',
    pill: 'rounded-pill'
  };
  return (
    <span
      aria-hidden="true"
      className={cn('relative block overflow-hidden bg-surface-2', shapes[variant], className)}
      style={{ width, height }}
    >
      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.055),transparent)]" />
    </span>
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <span className={cn('block space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          height={12}
          className={index === lines - 1 ? 'w-2/3' : 'w-full'}
        />
      ))}
    </span>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={cn('rounded-lg border border-hairline bg-surface-1 p-5', className)}>
      <Skeleton variant="circle" className="h-10 w-10" />
      <Skeleton variant="text" className="mt-4 h-7 w-24" />
      <Skeleton variant="text" className="mt-2 h-3 w-32" />
    </div>
  );
}

export default Skeleton;
