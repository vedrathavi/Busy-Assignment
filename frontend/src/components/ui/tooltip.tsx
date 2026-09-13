import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  disabled?: boolean;
  delayMs?: number;
  className?: string;
}

export function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  disabled = false,
  delayMs = 80,
  className,
}: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    let effectiveSide = side;
    let top = 0;
    let left = 0;

    // If positioned top but near the top edge of screen (< 40px), flip to bottom
    if (effectiveSide === 'top' && rect.top < 40) {
      effectiveSide = 'bottom';
    }
    // If positioned bottom but near the bottom edge of screen, flip to top
    if (effectiveSide === 'bottom' && rect.bottom > window.innerHeight - 40) {
      effectiveSide = 'top';
    }

    if (effectiveSide === 'top') {
      top = rect.top - 6;
      if (align === 'start') left = rect.left;
      else if (align === 'end') left = rect.right;
      else left = rect.left + rect.width / 2;
    } else if (effectiveSide === 'bottom') {
      top = rect.bottom + 6;
      if (align === 'start') left = rect.left;
      else if (align === 'end') left = rect.right;
      else left = rect.left + rect.width / 2;
    } else if (effectiveSide === 'left') {
      left = rect.left - 8;
      if (align === 'start') top = rect.top;
      else if (align === 'end') top = rect.bottom;
      else top = rect.top + rect.height / 2;
    } else {
      // side === 'right'
      left = rect.right + 8;
      if (align === 'start') top = rect.top;
      else if (align === 'end') top = rect.bottom;
      else top = rect.top + rect.height / 2;
    }

    // Viewport clamping
    top = Math.max(8, Math.min(window.innerHeight - 36, top));
    left = Math.max(8, Math.min(window.innerWidth - 24, left));

    setCoords({ top, left });
  }, [side, align]);

  const handleMouseEnter = () => {
    if (disabled || !content) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    updatePosition();
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  React.useEffect(() => {
    if (!visible) return;
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [visible, updatePosition]);

  const getTransformClass = () => {
    if (side === 'top') {
      if (align === 'start') return '-translate-y-full';
      if (align === 'end') return '-translate-y-full -translate-x-full';
      return '-translate-y-full -translate-x-1/2';
    }
    if (side === 'bottom') {
      if (align === 'start') return '';
      if (align === 'end') return '-translate-x-full';
      return '-translate-x-1/2';
    }
    if (side === 'left') {
      if (align === 'start') return '-translate-x-full';
      if (align === 'end') return '-translate-x-full -translate-y-full';
      return '-translate-x-full -translate-y-1/2';
    }
    // side === 'right'
    if (align === 'start') return '';
    if (align === 'end') return '-translate-y-full';
    return '-translate-y-1/2';
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {visible &&
        !disabled &&
        content &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            className={cn(
              'fixed z-[9999] rounded-[6px] bg-[#1c1c1c] text-[#fcfbf8] px-2.5 py-1 text-[11px] font-medium shadow-focus-soft border border-[#333]/70 animate-in fade-in-0 zoom-in-95 pointer-events-none w-max max-w-[240px] sm:max-w-[260px] leading-snug tracking-normal break-words whitespace-normal text-left',
              getTransformClass(),
              className
            )}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}
