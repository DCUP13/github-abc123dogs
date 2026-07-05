export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

let showConfirmImpl: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

export function registerConfirm(fn: (opts: ConfirmOptions) => Promise<boolean>) {
  showConfirmImpl = fn;
}

export async function showConfirm(messageOrOpts: string | ConfirmOptions): Promise<boolean> {
  const opts = typeof messageOrOpts === 'string' ? { message: messageOrOpts } : messageOrOpts;
  if (!showConfirmImpl) return Promise.resolve(window.confirm(opts.message));
  return showConfirmImpl(opts);
}
