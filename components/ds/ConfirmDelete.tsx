import { useCallback, useRef, useState, type ReactNode } from 'react';
import { DSPopup } from './Popup';

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Runs after the popup closes; throw to let the caller handle the failure. */
  onConfirm: () => void | Promise<void>;
};

/**
 * Destructive confirmation that works everywhere. `Alert.alert` has no web
 * implementation (the tap just does nothing), so delete flows use the design
 * system popup instead. Render `popup` once in the screen and call `confirm`.
 */
export function useConfirmDelete(): { confirm: (o: ConfirmOptions) => void; popup: ReactNode } {
  const [open, setOpen] = useState(false);
  // keep the last options so the popup can animate out with its text intact
  const last = useRef<ConfirmOptions | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    last.current = o;
    setOpen(true);
  }, []);

  const o = last.current;
  const popup = o ? (
    <DSPopup
      visible={open}
      onClose={() => setOpen(false)}
      tone="danger"
      title={o.title}
      description={o.description}
      primaryLabel={o.confirmLabel}
      secondaryLabel={o.cancelLabel}
      onPrimary={() => {
        setOpen(false);
        void o.onConfirm();
      }}
    />
  ) : null;

  return { confirm, popup };
}
