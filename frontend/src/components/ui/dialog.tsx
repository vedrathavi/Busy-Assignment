import * as React from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
} | null>(null);

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(DialogContext);

  React.useEffect(() => {
    if (context?.open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [context?.open]);

  if (!context?.open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => context.onOpenChange(false)}
    >
      <div
        className={cn(
          'relative w-full max-w-lg rounded-[12px] border border-[#eceae4] bg-[#fcfbf8] p-6 text-[#1c1c1c] shadow-focus-soft animate-in zoom-in-95 duration-150',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => context.onOpenChange(false)}
          className="absolute right-4 top-4 rounded-[4px] p-1 text-[#5f5f5d] transition-colors hover:bg-[#eceae4] hover:text-[#1c1c1c] focus:outline-hidden"
          aria-label="Close"
        >
          <FiX className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-left mb-4', className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold tracking-tight text-[#1c1c1c]', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-xs text-[#5f5f5d]', className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2', className)}
      {...props}
    />
  );
}
