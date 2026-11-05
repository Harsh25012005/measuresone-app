import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DSButton } from '../../components/ds/Button';
import { DSDateField } from '../../components/ds/DateField';
import { DSFormScreen } from '../../components/ds/Screen';
import { DSQuantity } from '../../components/ds/Quantity';
import { DSTabs } from '../../components/ds/Tabs';
import { useToast } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { staffRepo } from '../../lib/data/repository';
import { formatCurrency } from '../../lib/format';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { primary, status, typography } from '../../constants/tokens';
import type { SettingsScreenProps } from '../../navigation/types';
import type { Enums } from '../../lib/database.types';
import type { Staff } from '../../types';

type WorkType = Enums<'work_item_type'>;

const f = typography.family;

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
  const { t: tCommon } = useTranslation('common');
  const { staffId } = route.params;
  const shop = useShop();
  const showToast = useToast();
  const { colors } = useTheme();

  const WORK_TYPES: { label: string; value: WorkType }[] = [
    { label: t('workEntry.types.pant'), value: 'pant' },
    { label: t('workEntry.types.shirt'), value: 'shirt' },
    { label: t('workEntry.types.pant_shirt'), value: 'pant_shirt' },
  ];

  const [staff, setStaff] = useState<Staff | null>(null);
  const [workDate, setWorkDate] = useState<Date>(new Date());
  const [workType, setWorkType] = useState<WorkType>('pant');
  const [quantity, setQuantity] = useState(1);
  // "Pant + Shirt" asks for each garment's count separately
  const [pantQty, setPantQty] = useState(1);
  const [shirtQty, setShirtQty] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      // Local mirror first: a staff member just added offline isn't on the server yet, which
      // is why per-piece rates read as 0 here when this asked Supabase directly.
      const local = await staffRepo.get(staffId);
      if (local) {
        setStaff(local);
        return;
      }
      const { data } = await supabase.from('staff').select('*').eq('id', staffId).single();
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

  const both = workType === 'pant_shirt';
  const rate = rateFor(workType);
  const pantRate = rateFor('pant');
  const shirtRate = rateFor('shirt');
  const totalPay = both ? pantRate * pantQty + shirtRate * shirtQty : rate * quantity;
  const canSave = both ? pantQty + shirtQty > 0 && (pantQty === 0 || pantRate > 0) && (shirtQty === 0 || shirtRate > 0) : rate > 0;

  const handleSave = async () => {
    if ((both ? pantQty + shirtQty : quantity) <= 0) {
      setError(t('workEntry.quantityRequired'));
      return;
    }
    if (!canSave) {
      showToast(t('workEntry.noRateWarning'), 'error');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const base = { shop_id: shop.id, staff_id: staffId, work_date: toDateString(workDate) };
      // A pant + shirt entry is stored as one row per garment, each at its own rate and count.
      const rows = both
        ? [
            ...(pantQty > 0 ? [{ ...base, work_type: 'pant' as WorkType, quantity: pantQty, rate_applied: pantRate }] : []),
            ...(shirtQty > 0 ? [{ ...base, work_type: 'shirt' as WorkType, quantity: shirtQty, rate_applied: shirtRate }] : []),
          ]
        : [{ ...base, work_type: workType, quantity, rate_applied: rate }];
      const { error: saveError } = await supabase.from('staff_work_entries').insert(rows);
      if (saveError) throw saveError;

      showToast(t('workEntry.saveSuccess'), 'success');
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('workEntry.saveError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DSFormScreen
      title={t('workEntry.title')}
      onBack={() => navigation.goBack()}
      footer={<DSButton title={t('workEntry.save')} size="lg" fullWidth onPress={handleSave} loading={loading} disabled={!canSave} />}
    >
      <DSDateField label={t('workEntry.dateLabel')} value={workDate} onChange={setWorkDate} confirmLabel={tCommon('actions.confirm', { defaultValue: 'Confirm' })} />

      <View style={{ gap: 10 }}>
        <Text style={{ fontFamily: f.semibold, fontSize: 13, color: colors.textSecondary }}>{t('workEntry.typeLabel')}</Text>
        <DSTabs variant="pill" value={workType} onChange={(k) => setWorkType(k as WorkType)} items={WORK_TYPES.map((w) => ({ key: w.value, label: w.label }))} />
      </View>

      <View style={{ gap: 6 }}>
        {both ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <DSQuantity label={t('workEntry.shirtQuantity')} value={shirtQty} min={0} onChange={(n) => { setShirtQty(n); setError(''); }} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <DSQuantity label={t('workEntry.pantQuantity')} value={pantQty} min={0} onChange={(n) => { setPantQty(n); setError(''); }} />
            </View>
          </View>
        ) : (
          <DSQuantity label={t('workEntry.quantityLabel')} value={quantity} min={0} onChange={(n) => { setQuantity(n); setError(''); }} />
        )}
        {error ? <Text style={{ fontFamily: f.regular, fontSize: 12, color: status.danger[600] }}>{error}</Text> : null}
      </View>

      <View style={{ gap: 10, borderRadius: 24, padding: 16, backgroundColor: colors.primaryTint }}>
        {both ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: f.medium, fontSize: 14, color: colors.textSecondary }}>
                {t('workEntry.types.shirt')} × {shirtQty}
              </Text>
              <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }}>{formatCurrency(shirtRate * shirtQty)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: f.medium, fontSize: 14, color: colors.textSecondary }}>
                {t('workEntry.types.pant')} × {pantQty}
              </Text>
              <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }}>{formatCurrency(pantRate * pantQty)}</Text>
            </View>
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: f.medium, fontSize: 14, color: colors.textSecondary }}>{t('workEntry.rateApplied')}</Text>
            <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }}>{formatCurrency(rate)}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: f.semibold, fontSize: 14, color: primary[600] }}>{t('workEntry.totalPay')}</Text>
          <Text style={{ fontFamily: f.bold, fontSize: 22, color: primary[600] }}>{formatCurrency(totalPay)}</Text>
        </View>
        {staff && !canSave ? <Text style={{ fontFamily: f.regular, fontSize: 13, color: status.warning[600] }}>{t('workEntry.noRateWarning')}</Text> : null}
      </View>
    </DSFormScreen>
  );
}
