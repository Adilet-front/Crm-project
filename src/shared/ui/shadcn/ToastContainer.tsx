import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { type ToastType, useToastStore } from './toastStore';

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colors: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-100 text-emerald-600',
  error: 'bg-rose-50 border-rose-100 text-rose-600',
  warning: 'bg-amber-50 border-amber-100 text-amber-600',
  info: 'bg-blue-50 border-blue-100 text-blue-600',
};

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[200] flex flex-col gap-3">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];

        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex min-w-[300px] items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg',
              colors[toast.type]
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm font-semibold">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="rounded-lg p-1 transition-colors hover:bg-black/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
