import { useCallback } from 'react';
import { DSToastProvider, useDSToastSafe } from '../ds/Toast';

export type ToastType = 'success' | 'error' | 'info';

type ShowToast = (message: string, type?: ToastType, duration?: number) => void;

/** Wrap the app root with this once (see App.tsx). Renders the redesigned toast. */
export const ToastProvider = DSToastProvider;

/** Returns showToast(message, type?, duration?). No-op outside the provider. */
export function useToast(): ShowToast {
  const toast = useDSToastSafe();
  return useCallback<ShowToast>(
    (message, type = 'info', duration) => {
      toast?.show({ title: message, tone: type, duration: duration ?? (type === 'error' ? 5000 : 2500) });
    },
    [toast],
  );
}
