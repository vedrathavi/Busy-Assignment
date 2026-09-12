import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            'group flex items-center gap-3 w-full rounded-[10px] border border-[#eceae4] bg-[#fcfbf8] p-4 text-[#1c1c1c] shadow-focus-soft text-sm font-sans',
          description: 'text-xs text-[#5f5f5d]',
          actionButton:
            'rounded-[6px] bg-[#1c1c1c] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black',
          cancelButton:
            'rounded-[6px] bg-[#f4f2eb] px-3 py-1.5 text-xs font-medium text-[#5f5f5d] transition-colors hover:bg-[#eceae4]',
          success: 'border-emerald-200 text-emerald-950 bg-emerald-50/90',
          error: 'border-rose-200 text-rose-950 bg-rose-50/90',
          warning: 'border-amber-200 text-amber-950 bg-amber-50/90',
          info: 'border-blue-200 text-blue-950 bg-blue-50/90',
        },
      }}
    />
  );
}
