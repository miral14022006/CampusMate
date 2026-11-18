import { cn } from '../../lib/cn';
import { CardHeader } from './Card';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

export function ChartCard({
  title,
  description,
  action,
  children,
  className = '',
  loading = false,
  empty = false,
  emptyTitle = 'No data for this period',
  emptyDescription = 'Try a wider date range or seed analytics data.',
  emptyAction = null,
  height = 280
}) {
  return (
    <section
      className={cn(
        'rounded-lg border border-hairline bg-surface-1 p-5 shadow-soft sm:p-6',
        className
      )}
    >
      <CardHeader title={title} description={description} action={action} />
      <div className="mt-5" style={{ minHeight: height }}>
        {loading ? (
          <div className="space-y-4" aria-busy="true">
            <div className="flex h-[220px] items-end gap-3 px-2">
              {[42, 66, 54, 82, 60, 92, 72].map((h, i) => (
                <Skeleton key={i} className="flex-1" height={`${h}%`} />
              ))}
            </div>
            <Skeleton variant="text" className="h-3 w-40" />
          </div>
        ) : empty ? (
          <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} compact />
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export default ChartCard;
