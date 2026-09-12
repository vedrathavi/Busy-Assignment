import * as React from 'react';
import { cn } from '@/lib/utils';
import { FiX } from 'react-icons/fi';

interface SheetContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SheetContext = React.createContext<SheetContextType | null>(null);

export function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error('useSheet must be used within a Sheet');
  }
  return context;
}

export interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({ open: controlledOpen, onOpenChange, children }: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback(
    (value: React.SetStateAction<boolean>) => {
      const nextValue = typeof value === 'function' ? value(open) : value;
      if (controlledOpen === undefined) {
        setUncontrolledOpen(nextValue);
      }
      onOpenChange?.(nextValue);
    },
    [controlledOpen, onOpenChange, open]
  );

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({ children, className, asChild }: { children: React.ReactNode; className?: string; asChild?: boolean }) {
  const { setOpen } = useSheet();
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as any).props.onClick?.(e);
        setOpen((prev) => !prev);
      },
    });
  }
  return (
    <button type="button" onClick={() => setOpen((prev) => !prev)} className={className}>
      {children}
    </button>
  );
}

export interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'left' | 'right' | 'top' | 'bottom';
  children: React.ReactNode;
}

export function SheetContent({ side = 'left', className, children, ...props }: SheetContentProps) {
  const { open, setOpen } = useSheet();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  const sideStyles = {
    left: 'inset-y-0 left-0 h-full w-3/4 max-w-xs border-r animate-in slide-in-from-left duration-200',
    right: 'inset-y-0 right-0 h-full w-3/4 max-w-xs border-l animate-in slide-in-from-right duration-200',
    top: 'inset-x-0 top-0 border-b animate-in slide-in-from-top duration-200',
    bottom: 'inset-x-0 bottom-0 border-t animate-in slide-in-from-bottom duration-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'relative z-50 flex flex-col bg-background p-6 shadow-xl border-border transition ease-in-out',
          sideStyles[side],
          className
        )}
        {...props}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <FiX className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold text-foreground', className)} {...props} />;
}

export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
