import * as React from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle } from 'react-icons/fi';
import { Button } from './button';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
  isLoading?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
  onConfirm,
  children,
}: AlertDialogProps) {
  React.useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => !isLoading && onOpenChange(false)}
    >
      <div
        className="relative w-full max-w-md rounded-[12px] border border-[#eceae4] bg-[#fcfbf8] p-6 text-[#1c1c1c] shadow-focus-soft animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          {variant === 'destructive' && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <FiAlertTriangle className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 space-y-1">
            <h3 className="text-base font-semibold text-[#1c1c1c]">{title}</h3>
            <p className="text-xs leading-relaxed text-[#5f5f5d]">{description}</p>
          </div>
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="text-xs"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="text-xs"
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
