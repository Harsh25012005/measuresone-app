import { useState } from 'react';
import i18n from './i18n';
import { sendBillOnWhatsApp } from './billPdf';
import { useShop } from '../context/AuthContext';
import { useToast } from '../components/ui';

/** Shared "Send bill on WhatsApp" action for Bill Details and Order Details. */
export function useSendBill(billId: string | null | undefined) {
  const shop = useShop();
  const showToast = useToast();
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!billId || sending) return;
    setSending(true);
    try {
      await sendBillOnWhatsApp(shop, billId);
    } catch (err) {
      const message = (err as { message?: string } | null)?.message;
      showToast(message || i18n.t('pdf.failed', { ns: 'billing' }), 'error');
    } finally {
      setSending(false);
    }
  };

  return { send, sending };
}
