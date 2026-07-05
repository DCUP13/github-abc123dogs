import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { registerConfirm, ConfirmOptions } from '../../lib/confirm';

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const showConfirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ ...opts, resolve });
    });
  }, []);

  useEffect(() => {
    registerConfirm(showConfirm);
  }, [showConfirm]);

  useEffect(() => {
    if (!state) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handle(false);
      if (e.key === 'Enter') handle(true);
    };
    document.addEventListener('keydown', handler);
    setTimeout(() => (state.variant === 'danger' ? cancelRef : confirmRef).current?.focus(), 10);
    return () => document.removeEventListener('keydown', handler);
  }, [state]);

  const handle = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  const isDanger = state?.variant === 'danger';

  return (
    <>
      {children}
      {state && createPortal(
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) handle(false); }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 animate-toast-in"
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                isDanger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                {isDanger
                  ? <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  : <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                {state.title && (
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{state.title}</h3>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{state.message}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                ref={cancelRef}
                onClick={() => handle(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {state.cancelText ?? 'Cancel'}
              </button>
              <button
                ref={confirmRef}
                onClick={() => handle(true)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[var(--accent)] hover:opacity-90'
                }`}
              >
                {state.confirmText ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
