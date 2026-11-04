import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DSButton } from '../../components/ds/Button';
import { DSInput } from '../../components/ds/Input';
import { DSFormScreen } from '../../components/ds/Screen';
import { DSTabs } from '../../components/ds/Tabs';
import { useToast } from '../../components/ui';
import { staffRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../constants/tokens';
import type { SettingsScreenProps } from '../../navigation/types';
import type { WageType } from '../../types';

export default function StaffFormScreen({ navigation, route }: SettingsScreenProps<'StaffForm'>) {
  const { t } = useTranslation('staff');
  const staffId = route.params?.staffId;
  const shop = useShop();
  const showToast = useToast();
  const { colors } = useTheme();

  const WAGE_TYPES: { label: string; value: WageType }[] = [
    { label: t('form.wageTypes.daily'), value: 'daily' },
    { label: t('form.wageTypes.monthly'), value: 'monthly' },
    { label: t('form.wageTypes.perPiece'), value: 'per_piece' },
  ];

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wageType, setWageType] = useState<WageType>('monthly');
  const [wageAmount, setWageAmount] = useState('');
  const [wageAmountPant, setWageAmountPant] = useState('');
  const [wageAmountShirt, setWageAmountShirt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!staffId) return;
    void (async () => {
      const data = await staffRepo.get(staffId);
      if (!data) return;
      setName(data.name);
      setPhone(data.phone ?? '');
      setWageType(data.wage_type);
      setWageAmount(String(data.wage_amount ?? ''));
      setWageAmountPant(data.wage_amount_pant != null ? String(data.wage_amount_pant) : '');
      setWageAmountShirt(data.wage_amount_shirt != null ? String(data.wage_amount_shirt) : '');
    })();
  }, [staffId]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('form.nameRequired'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const parsedWage = Number(wageAmount.trim());
      const parsedPant = Number(wageAmountPant.trim());
      const parsedShirt = Number(wageAmountShirt.trim());
      const isPerPiece = wageType === 'per_piece';
      const payload = {
        shop_id: shop.id,
        name: name.trim(),
        phone: phone.trim() || null,
        wage_type: wageType,
        wage_amount: !isPerPiece && Number.isFinite(parsedWage) && parsedWage > 0 ? parsedWage : 0,
        wage_amount_pant: isPerPiece && Number.isFinite(parsedPant) && parsedPant > 0 ? parsedPant : null,
        wage_amount_shirt: isPerPiece && Number.isFinite(parsedShirt) && parsedShirt > 0 ? parsedShirt : null,
        wage_amount_pair: null,
      };

      if (staffId) {
        await staffRepo.update(staffId, shop.id, payload);
      } else {
        await staffRepo.create(payload);
      }

      showToast(staffId ? t('form.updateSuccess') : t('form.addSuccess'), 'success');
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('form.saveError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DSFormScreen
      title={staffId ? t('form.titleEdit') : t('form.titleAdd')}
      onBack={() => navigation.goBack()}
      footer={<DSButton title={staffId ? t('form.updateStaff') : t('form.saveStaff')} size="lg" fullWidth onPress={handleSave} loading={loading} />}
    >
      <DSInput
        label={`${t('form.nameLabel')} *`}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError('');
        }}
        placeholder={t('form.namePlaceholder')}
        error={error || undefined}
      />
      <DSInput label={t('form.phoneLabel')} value={phone} onChangeText={setPhone} placeholder={t('form.phonePlaceholder')} keyboardType="phone-pad" />

      <View style={{ gap: 10 }}>
        <Text style={{ fontFamily: typography.family.semibold, fontSize: 13, color: colors.textSecondary }}>{t('form.wageTypeLabel')}</Text>
        <DSTabs variant="pill" value={wageType} onChange={(k) => setWageType(k as WageType)} items={WAGE_TYPES.map((w) => ({ key: w.value, label: w.label }))} />
      </View>

      {wageType === 'per_piece' ? (
        <>
          <DSInput label={t('form.amountPerPantLabel')} value={wageAmountPant} onChangeText={setWageAmountPant} placeholder={t('form.amountPerPantPlaceholder')} keyboardType="number-pad" />
          <DSInput label={t('form.amountPerShirtLabel')} value={wageAmountShirt} onChangeText={setWageAmountShirt} placeholder={t('form.amountPerShirtPlaceholder')} keyboardType="number-pad" />
        </>
      ) : (
        <DSInput label={t('form.wageAmountLabel')} value={wageAmount} onChangeText={setWageAmount} placeholder={t('form.wageAmountPlaceholder')} keyboardType="number-pad" />
      )}
    </DSFormScreen>
  );
}
