import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface DropdownContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const DropdownContext = React.createContext<DropdownContextType | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
      <div ref={triggerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild, className }: { children: React.ReactNode; asChild?: boolean; className?: string }) {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error('DropdownMenuTrigger must be inside DropdownMenu');

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as any).props.onClick?.(e);
        context.setOpen((prev) => !prev);
      },
    });
  }

  return (
    <button
      type="button"
      onClick={() => context.setOpen((prev) => !prev)}
      className={cn('inline-flex items-center justify-center', className)}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  align = 'end',
  className,
}: {
  children: React.ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
}) {
  const context = React.useContext(DropdownContext);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<{ top: number; left?: number; right?: number }>({ top: 0 });

  React.useLayoutEffect(() => {
    if (!context?.open || !context.triggerRef.current) return;

    const updatePosition = () => {
      const trigger = context.triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = contentRef.current?.offsetWidth || 160;
      const menuHeight = contentRef.current?.offsetHeight || 140;

      // Check space below vs above
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight + 10 && rect.top > menuHeight;
      const top = openUpward ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4;

      if (align === 'end') {
        const right = window.innerWidth - rect.right;
        setPosition({ top, right: Math.max(8, right) });
      } else if (align === 'start') {
        setPosition({ top, left: Math.max(8, rect.left) });
      } else {
        const left = rect.left + rect.width / 2 - menuWidth / 2;
        setPosition({ top, left: Math.max(8, left) });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [context?.open, align]);

  React.useEffect(() => {
    if (!context?.open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        context.triggerRef.current &&
        !context.triggerRef.current.contains(target) &&
        contentRef.current &&
        !contentRef.current.contains(target)
      ) {
        context.setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        context.setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [context?.open]);

  if (!context || !context.open) return null;

  return createPortal(
    <div
      ref={contentRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left !== undefined ? position.left : undefined,
        right: position.right !== undefined ? position.right : undefined,
        zIndex: 99999,
      }}
      className={cn(
        'min-w-[10rem] overflow-hidden rounded-[8px] border border-[#eceae4] bg-[#fcfbf8] p-1 text-[#1c1c1c] shadow-focus-soft animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
  destructive,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const context = React.useContext(DropdownContext);

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    context?.setOpen(false);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2.5 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
        destructive && 'text-destructive hover:bg-destructive/10 hover:text-destructive',
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-2.5 py-1.5 text-xs font-semibold text-muted-foreground', className)}>{children}</div>;
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('-mx-1 my-1 h-px bg-border', className)} />;
}
