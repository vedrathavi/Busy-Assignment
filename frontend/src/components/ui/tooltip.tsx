import * as React from 'react';
import { cn } from '@/lib/utils';

export function Tooltip({ children, content, className }: { children: React.ReactNode; content: React.ReactNode; className?: string }) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 overflow-hidden rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95 pointer-events-none whitespace-nowrap',
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
