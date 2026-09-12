import { IconType } from 'react-icons';
import { FiInbox } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: IconType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FiInbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[16rem] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#eceae4] bg-[#f7f4ed] p-8 text-center animate-in fade-in duration-300',
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eceae4] text-[#1c1c1c] border border-[#eceae4]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-[#1c1c1c]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-[#5f5f5d] leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-5 font-normal">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
