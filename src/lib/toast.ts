export type ToastType = 'success' | 'error' | 'info' | 'warning';

let addToastImpl: ((message: string, type: ToastType) => void) | null = null;

export function registerToast(fn: (message: string, type: ToastType) => void) {
  addToastImpl = fn;
}

export const toast = {
  success: (message: string) => addToastImpl?.(message, 'success'),
  error: (message: string) => addToastImpl?.(message, 'error'),
  info: (message: string) => addToastImpl?.(message, 'info'),
  warning: (message: string) => addToastImpl?.(message, 'warning'),
};
