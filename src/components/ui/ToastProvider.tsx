import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { registerToast, ToastType } from '../../lib/toast';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    const duration = type === 'error' ? 6000 : 4000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  useEffect(() => {
    registerToast(addToast);
  }, [addToast]);

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-500" />,
    error: <XCircle className="w-5 h-5 flex-shrink-0 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />,
    info: <Info className="w-5 h-5 flex-shrink-0 text-blue-500" />,
  };

  const borderMap: Record<ToastType, string> = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    warning: 'border-l-amber-500',
    info: 'border-l-blue-500',
  };

  return (
    <>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none sm:top-4 sm:right-4 max-sm:top-auto max-sm:bottom-4 max-sm:left-4 max-sm:right-4 max-sm:w-auto">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border-l-4 bg-white dark:bg-gray-800 pointer-events-auto animate-toast-in ${borderMap[t.type]}`}
            >
              {iconMap[t.type]}
              <p className="flex-1 text-sm text-gray-800 dark:text-gray-100 leading-snug">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
