import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center justify-start rounded-[6px] bg-[#eceae4]/70 p-1 text-[#5f5f5d] border border-[#eceae4]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(TabsContext);
  const isSelected = context?.value === value;

  return (
    <button
      type="button"
      onClick={() => context?.onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-[4px] px-3 py-1 text-xs font-medium transition-all focus-visible:outline-hidden',
        isSelected
          ? 'bg-[#fcfbf8] text-[#1c1c1c] shadow-2xs font-semibold'
          : 'text-[#5f5f5d] hover:text-[#1c1c1c]',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(TabsContext);
  if (context?.value !== value) return null;

  return <div className={cn('mt-4 focus-visible:outline-hidden animate-in fade-in duration-150', className)}>{children}</div>;
}
