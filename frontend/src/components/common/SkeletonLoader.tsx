import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SkeletonGridProps {
  count?: number;
  className?: string;
}

export function MetricCardSkeleton({ count = 4, className }: SkeletonGridProps) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border border-[#eceae4] bg-[#f7f4ed] rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24 bg-[#eceae4]" />
            <Skeleton className="h-7 w-7 rounded-[6px] bg-[#eceae4]" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-7 w-32 bg-[#eceae4]" />
            <Skeleton className="h-3 w-40 bg-[#eceae4]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between py-2">
        <Skeleton className="h-7 w-48 bg-[#eceae4]" />
        <Skeleton className="h-7 w-24 bg-[#eceae4]" />
      </div>
      <div className="rounded-xl border border-[#eceae4] overflow-hidden bg-[#f7f4ed]">
        <div className="flex border-b border-[#eceae4] bg-[#eceae4]/40 p-4 gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1 bg-[#eceae4]" />
          ))}
        </div>
        <div className="divide-y divide-[#eceae4] p-1">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              {Array.from({ length: columns }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1 bg-[#eceae4]" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-[#eceae4]" />
        <Skeleton className="h-4 w-72 bg-[#eceae4]" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24 rounded-[6px] bg-[#eceae4]" />
        <Skeleton className="h-9 w-32 rounded-[6px] bg-[#eceae4]" />
      </div>
    </div>
  );
}
