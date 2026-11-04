import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button, Card, DatePickerField, Header, NumberStepper, SegmentedControl, Text, useToast } from '../../src/components/ui';
import { supabase } from '../../lib/supabase';
import { staffRepo } from '../../lib/data/repository';
import { runSync } from '../../lib/data/sync';
import { formatCurrency } from '../../lib/format';
import { useShop } from '../../context/AuthContext';
import type { SettingsScreenProps } from '../../navigation/types';
import type { Enums } from '../../lib/database.types';
import type { Staff } from '../../types';

type WorkType = Enums<'work_item_type'>;

/** Local YYYY-MM-DD (the column is a plain `date`, so avoid UTC shifting). */
function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export default function StaffWorkEntryFormScreen({
  navigation,
  route,
}: SettingsScreenProps<'StaffWorkEntryForm'>) {
  const { t } = useTranslation('staff');
  const insets = useSafeAreaInsets();
  const { staffId, prefill } = route.params;
  const shop = useShop();
  const showToast = useToast();

  const WORK_TYPES: { label: string; value: WorkType }[] = [
    { label: t('workEntry.types.pant'), value: 'pant' },
    { label: t('workEntry.types.shirt'), value: 'shirt' },
    { label: t('workEntry.types.pant_shirt'), value: 'pant_shirt' },
  ];

  const [staff, setStaff] = useState<Staff | null>(null);
  const [workDate, setWorkDate] = useState<Date>(new Date());
  const [workType, setWorkType] = useState<WorkType>(prefill?.workType ?? 'pant');
  const [quantity, setQuantity] = useState(String(prefill?.quantity && prefill.quantity > 0 ? prefill.quantity : 1));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      // Local mirror, not Supabase: staff edits (incl. per-piece rates) land
      // here first and may not have synced to the server yet.
      const data = await staffRepo.get(staffId);
      if (data) setStaff(data);
    })();
  }, [staffId]);

  /**
   * Per-piece staff store a separate rate per garment (pant / shirt / both),
   * so the rate must follow the selected work type. Reading the flat
   * `wage_amount` meant per-piece staff always priced at 0 — their
   * `wage_amount` is 0 by design — which blocked saving entirely.
   */
  const rateFor = (type: WorkType): number => {
    if (!staff) return 0;
    if (staff.wage_type !== 'per_piece') return Number(staff.wage_amount ?? 0);
    if (type === 'pant') return Number(staff.wage_amount_pant ?? 0);
    if (type === 'shirt') return Number(staff.wage_amount_shirt ?? 0);
    // "Pant + Shirt" bills as the two garment rates combined.
    return Number(staff.wage_amount_pant ?? 0) + Number(staff.wage_amount_shirt ?? 0);
  };

  const rate = rateFor(workType);
  const parsedQty = Number(quantity.trim());
  const previewQty = Number.isFinite(parsedQty) && parsedQty > 0 ? Math.floor(parsedQty) : 0;

  const handleSave = async () => {
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError(t('workEntry.quantityRequired'));
      return;
    }
    if (rate === 0) {
      showToast(t('workEntry.noRateWarning'), 'error');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Push any pending local staff changes first so the entry's staff_id exists server-side.
      await runSync(shop.id).catch(() => undefined);
      const { error: saveError } = await supabase.from('staff_work_entries').insert({
        shop_id: shop.id,
        staff_id: staffId,
        work_date: toDateString(workDate),
        work_type: workType,
        quantity: Math.floor(parsedQty),
        rate_applied: rate,
      });
      if (saveError) throw saveError;

      showToast(t('workEntry.saveSuccess'), 'success');
      navigation.goBack();
    } catch (err) {
      const message = (err as { message?: string } | null)?.message;
      showToast(message || t('workEntry.saveError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <Header title={t('workEntry.title')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <DatePickerField
            label={t('workEntry.dateLabel')}
            value={workDate}
            onChange={setWorkDate}
            placeholder={t('workEntry.datePlaceholder')}
            quickChips={[{ label: t('workEntry.today'), daysFromNow: 0 }, { label: t('workEntry.yesterday'), daysFromNow: -1 }]}
          />

          <Text variant="label" className="mb-1.5">
            {t('workEntry.typeLabel')}
          </Text>
          <SegmentedControl options={WORK_TYPES} value={workType} onChange={setWorkType} className="mb-4" />

          <NumberStepper
            label={t('workEntry.quantityLabel')}
            value={Number.isFinite(parsedQty) ? parsedQty : null}
            onChange={(n) => {
              setQuantity(n == null ? '' : String(n));
              setError('');
            }}
            min={1}
            placeholder={t('workEntry.quantityPlaceholder')}
          />
          {error ? (
            <Text variant="caption" tone="danger" className="-mt-2 mb-4" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <Card variant="subtle" className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text variant="label" tone="muted" weight="regular">
                {t('workEntry.rateApplied')}
              </Text>
              <Text variant="bodyLg" tabular>
                {formatCurrency(rate)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text variant="label" tone="muted" weight="regular">
                {t('workEntry.totalPay')}
              </Text>
              <Text variant="bodyLg" tabular>
                {formatCurrency(rate * previewQty)}
              </Text>
            </View>
            {rate === 0 ? (
              <Text variant="label" tone="warning">
                {t('workEntry.noRateWarning')}
              </Text>
            ) : null}
          </Card>
        </ScrollView>
        <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="border-t border-line bg-surface px-4 pt-3">
          <Button title={t('workEntry.save')} size="lg" onPress={handleSave} loading={loading} disabled={rate === 0} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
