import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageHeader({ className, children, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 pb-6 md:flex-row md:items-center md:justify-between border-b border-[#eceae4] mb-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PageHeaderHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageHeaderHeading({ className, children, ...props }: PageHeaderHeadingProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)} {...props}>
      {children}
    </div>
  );
}

export interface PageHeaderTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function PageHeaderTitle({ className, children, ...props }: PageHeaderTitleProps) {
  return (
    <h1
      className={cn(
        'text-2xl font-semibold tracking-tight text-[#1c1c1c] sm:text-3xl flex items-center gap-2.5',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export interface PageHeaderDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function PageHeaderDescription({ className, children, ...props }: PageHeaderDescriptionProps) {
  return (
    <p className={cn('text-sm text-[#5f5f5d] leading-relaxed', className)} {...props}>
      {children}
    </p>
  );
}

export interface PageHeaderActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageHeaderActions({ className, children, ...props }: PageHeaderActionsProps) {
  return (
    <div className={cn('flex items-center gap-2.5 flex-wrap shrink-0', className)} {...props}>
      {children}
    </div>
  );
}
