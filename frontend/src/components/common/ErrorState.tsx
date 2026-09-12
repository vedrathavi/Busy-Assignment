import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[16rem] w-full flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center animate-in fade-in duration-300',
        className
      )}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/20">
        <FiAlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-5 gap-2 border-border/80 hover:bg-background font-medium"
        >
          <FiRefreshCw className="h-3.5 w-3.5" />
          Try Again
        </Button>
      )}
    </div>
  );
}
