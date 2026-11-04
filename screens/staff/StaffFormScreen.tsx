import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button, Header, InputField, RadioGroup, Text, useToast } from '../../src/components/ui';
import { staffRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import type { SettingsScreenProps } from '../../navigation/types';
import type { WageType } from '../../types';

export default function StaffFormScreen({ navigation, route }: SettingsScreenProps<'StaffForm'>) {
  const { t } = useTranslation('staff');
  const insets = useSafeAreaInsets();
  const staffId = route.params?.staffId;
  const shop = useShop();
  const showToast = useToast();

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
  const phoneRef = useRef<TextInput>(null);
  const shirtRef = useRef<TextInput>(null);

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
    <View className="flex-1 bg-bg">
      <Header title={staffId ? t('form.titleEdit') : t('form.titleAdd')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <InputField
            label={t('form.nameLabel')}
            value={name}
            onChangeText={setName}
            placeholder={t('form.namePlaceholder')}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            error={error}
            required
          />
          <InputField
            ref={phoneRef}
            label={t('form.phoneLabel')}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('form.phonePlaceholder')}
            keyboardType="phone-pad"
            autoComplete="tel"
            prefix="+91"
            maxLength={10}
            optional
          />
          <Text variant="label" className="mb-1.5">
            {t('form.wageTypeLabel')}
          </Text>
          <RadioGroup<WageType> variant="cards" direction="column" value={wageType} onChange={setWageType} options={WAGE_TYPES} className="mb-4" />
          {wageType === 'per_piece' ? (
            <>
              <InputField
                label={t('form.amountPerPantLabel')}
                value={wageAmountPant}
                onChangeText={setWageAmountPant}
                placeholder={t('form.amountPerPantPlaceholder')}
                keyboardType="number-pad"
                prefix="₹"
                returnKeyType="next"
                onSubmitEditing={() => shirtRef.current?.focus()}
              />
              <InputField
                ref={shirtRef}
                label={t('form.amountPerShirtLabel')}
                value={wageAmountShirt}
                onChangeText={setWageAmountShirt}
                placeholder={t('form.amountPerShirtPlaceholder')}
                keyboardType="number-pad"
                prefix="₹"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </>
          ) : (
            <InputField
              label={t('form.wageAmountLabel')}
              value={wageAmount}
              onChangeText={setWageAmount}
              placeholder={t('form.wageAmountPlaceholder')}
              keyboardType="number-pad"
              prefix="₹"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          )}
        </ScrollView>
        <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="border-t border-line bg-surface px-4 pt-3">
          <Button title={staffId ? t('form.updateStaff') : t('form.saveStaff')} size="lg" onPress={handleSave} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
