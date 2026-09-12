import { FiLoader } from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  className?: string;
  message?: string;
}

export function PageLoader({ className, message = 'Loading...' }: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 p-6 text-muted-foreground animate-in fade-in duration-300',
        className
      )}
      role="status"
      aria-label="Loading page content"
    >
      <FiLoader className="h-8 w-8 animate-spin text-primary" />
      {message && <p className="text-sm font-medium tracking-tight">{message}</p>}
    </div>
  );
}
