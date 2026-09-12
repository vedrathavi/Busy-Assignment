import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'default' | 'lg';
  children?: React.ReactNode;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 'default', children, ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    const sizeStyles = {
      sm: 'h-7 w-7 text-xs',
      default: 'h-9 w-9 text-sm',
      lg: 'h-11 w-11 text-base',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full font-semibold border border-border/40 select-none items-center justify-center bg-muted text-muted-foreground',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children ? (
          children
        ) : src && !hasError ? (
          <img
            src={src}
            alt={alt || fallback || 'Avatar'}
            onError={() => setHasError(true)}
            className="aspect-square h-full w-full object-cover"
          />
        ) : (
          <span>{fallback || '?'}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, alt = 'Avatar', ...props }, ref) => (
    <img ref={ref} alt={alt} className={cn('aspect-square h-full w-full object-cover', className)} {...props} />
  )
);
AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground', className)}
      {...props}
    />
  )
);
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
