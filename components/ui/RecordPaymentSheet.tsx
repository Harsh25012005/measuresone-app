import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '../../src/components/ui/Button';
import { InputField } from '../../src/components/ui/InputField';
import { BottomSheet } from '../../src/components/ui/Modal';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { Text } from '../../src/components/ui/Text';
import { useToast } from '../../src/components/ui/Toast';
import { paymentsRepo } from '../../lib/data/repository';
import { formatCurrency } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { useShop } from '../../context/AuthContext';

const PAYMENT_MODES = ['Cash', 'UPI'] as const;

export type PayableBill = {
  id: string;
  customerId: string;
  customerName: string;
  pending: number;
};

export type RecordPaymentSheetProps = {
  bill: PayableBill | null;
  visible?: boolean;
  onClose: () => void;
  /** Fired after a payment is saved, so the caller can refresh its data. */
  onSaved: () => void;
};

/**
 * Shared "take money" sheet. Lives in one place so payment can be collected
 * from wherever the shop owner happens to be — the dashboard, a bill, a
 * customer — instead of only from deep inside the Billing section.
 *
 * The amount pre-fills to the full outstanding balance because most payments
 * settle a bill completely, so the common case needs no typing at all.
 */
export function RecordPaymentSheet({ bill, visible, onClose, onSaved }: RecordPaymentSheetProps) {
  const { t } = useTranslation('billing');
  const shop = useShop();
  const showToast = useToast();

  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<string>('Cash');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bill) setAmount(String(bill.pending));
  }, [bill]);

  const submit = async (value: number) => {
    if (!bill) return;
    setSaving(true);
    try {
      await paymentsRepo.create({
        shop_id: shop.id,
        bill_id: bill.id,
        customer_id: bill.customerId,
        amount_paid: value,
        payment_mode: mode,
      });
      setAmount('');
      haptics.success();
      showToast(t('detail.successPayment'), 'success');
      onSaved();
      onClose();
    } catch (err) {
      haptics.error();
      showToast(err instanceof Error ? err.message : t('detail.errorPayment'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!bill) return;
    const value = Number(amount.trim());
    if (!Number.isFinite(value) || value <= 0) {
      showToast(t('detail.errorInvalidAmount'), 'error');
      return;
    }
    if (value > bill.pending) {
      showToast(t('detail.errorExceedsPending', { amount: formatCurrency(bill.pending) }), 'error');
      return;
    }

    if (mode === 'UPI') {
      Alert.alert(t('detail.upiConfirmTitle'), t('detail.upiConfirmMessage'), [
        { text: t('detail.upiConfirmNo'), style: 'cancel' },
        { text: t('detail.upiConfirmYes'), onPress: () => void submit(value) },
      ]);
      return;
    }
    void submit(value);
  };

  const isVisible = visible !== undefined ? (visible && !!bill) : !!bill;

  return (
    <BottomSheet
      visible={isVisible}
      onClose={onClose}
      title={bill ? t('collect.title', { name: bill.customerName }) : undefined}
      footer={<Button title={t('detail.savePayment')} size="lg" onPress={handleSave} loading={saving} />}
    >
      <View className="mb-4 flex-row items-center justify-between rounded border border-line bg-surface-2 p-4">
        <Text variant="label" tone="muted">
          {t('detail.balanceDue')}
        </Text>
        <Text variant="headline" tone="danger" tabular>
          {formatCurrency(bill?.pending ?? 0)}
        </Text>
      </View>

      <InputField
        label={t('detail.amount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        prefix="₹"
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={handleSave}
        placeholder={t('detail.pendingPlaceholder', { amount: formatCurrency(bill?.pending ?? 0) })}
      />

      <SegmentedControl
        value={mode as (typeof PAYMENT_MODES)[number]}
        onChange={setMode}
        options={PAYMENT_MODES.map((m) => ({ label: t(`detail.paymentModes.${m}`), value: m }))}
        className="mb-2"
      />
    </BottomSheet>
  );
}
