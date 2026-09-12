import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    // Primary Dark Pill
    default:
      'bg-[#1c1c1c] text-[#fcfbf8] shadow-2xs',
    // Cream Neutral Pill
    secondary:
      'bg-[#eceae4] text-[#1c1c1c] border border-transparent',
    // Destructive Pill
    destructive:
      'bg-destructive/10 text-destructive border border-destructive/20',
    // Outline Pill with subtle border
    outline:
      'border border-[#eceae4] bg-transparent text-[#1c1c1c]',
    // Success Pill
    success:
      'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-normal transition-colors select-none',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
