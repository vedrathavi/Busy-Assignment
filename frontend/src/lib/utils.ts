import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '₹0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₹0.00';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatCompactCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '₹0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₹0';

  if (num >= 10_000_000) {
    return `₹${(num / 10_000_000).toFixed(2)}Cr`;
  }
  if (num >= 100_000) {
    return `₹${(num / 100_000).toFixed(1)}L`;
  }
  if (num >= 1_000) {
    return `₹${(num / 1_000).toFixed(0)}K`;
  }
  return `₹${num.toFixed(0)}`;
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function getDaysOverdue(dateStr: string): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - target.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
