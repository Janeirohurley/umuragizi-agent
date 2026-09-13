import { useToast } from '../contexts/ToastContext';
import { useEffect, useState } from 'react';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  // Auto-remove on unmount if any toast remains (fallback)
  useEffect(() => {
    return () => {
      toasts.forEach((t) => removeToast(t.id));
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto p-4 rounded-lg shadow-lg border backdrop-blur-sm
            animate-slide-up transition-all duration-300 ease-out
            ${
              toast.type === 'success'
                ? 'bg-secondary/10 border-secondary/20 text-secondary'
                : toast.type === 'error'
                ? 'bg-error/10 border-error/20 text-error'
                : toast.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-primary/10 border-primary/20 text-primary'
            }
          `}
        >
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl shrink-0 mt-0.5">
              {toast.type === 'success' && 'check_circle'}
              {toast.type === 'error' && 'error'}
              {toast.type === 'warning' && 'warning'}
              {toast.type === 'info' && 'info'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-on-surface-variant/50 hover:text-on-surface-variant transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}