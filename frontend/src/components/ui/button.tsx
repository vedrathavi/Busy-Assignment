import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'pill';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', disabled, children, ...props }, ref) => {
    const variantStyles = {
      // Lovable Signature Primary Dark Button with Multi-layer Inset Shadow
      default:
        'bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset hover:opacity-95 active:opacity-80 focus-visible:shadow-focus-soft focus-visible:ring-2 focus-visible:ring-[#3b82f6]/50',
      destructive:
        'bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-80 shadow-xs focus-visible:ring-2 focus-visible:ring-destructive/50',
      // Lovable Ghost/Outline with subtle charcoal-40 border
      outline:
        'border border-[rgba(28,28,28,0.4)] bg-transparent text-[#1c1c1c] hover:bg-[rgba(28,28,28,0.04)] active:opacity-80 focus-visible:shadow-focus-soft',
      secondary:
        'bg-[#eceae4] text-[#1c1c1c] hover:bg-[#e4e1da] active:opacity-80',
      ghost:
        'bg-transparent text-[#1c1c1c] hover:bg-[rgba(28,28,28,0.04)] active:opacity-80',
      link:
        'text-[#1c1c1c] underline underline-offset-4 hover:opacity-80 p-0 h-auto',
      // Pill shape for action/icon toggles
      pill:
        'bg-[#f7f4ed] text-[#1c1c1c] border border-[#eceae4] rounded-full hover:bg-[rgba(28,28,28,0.04)] active:opacity-80 shadow-button-inset',
    };

    const sizeStyles = {
      default: 'h-9 px-4 py-2 text-sm',
      sm: 'h-8 px-3 text-xs',
      lg: 'h-10 px-5 text-base',
      icon: 'h-9 w-9 p-0 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-[6px] font-normal transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
