import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button, Header, InputField, Skeleton, useToast } from '../../src/components/ui';
import { customersRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import type { CustomersScreenProps } from '../../navigation/types';

export default function CustomerFormScreen({ navigation, route }: CustomersScreenProps<'CustomerForm'>) {
  const customerId = route.params?.customerId;
  const prefill = route.params?.prefill;
  const isEditing = Boolean(customerId);

  const { t } = useTranslation('customers');
  const insets = useSafeAreaInsets();
  const shop = useShop();
  const showToast = useToast();

  const [name, setName] = useState(prefill?.name ?? '');
  const [phone, setPhone] = useState(prefill?.phone ?? '');
  const [address, setAddress] = useState('');
  const [bookNumber, setBookNumber] = useState(prefill?.bookNumber ?? '');
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [bookNumberError, setBookNumberError] = useState('');
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);

  const phoneDigits = phone.trim().replace(/\D/g, '');
  const [fetching, setFetching] = useState(isEditing);

  const load = useCallback(async () => {
    if (!customerId) return;
    try {
      const data = await customersRepo.get(customerId);
      if (!data) throw new Error(t('form.loadError'));

      setName(data.name ?? '');
      setPhone(data.phone ?? '');
      setAddress(data.address ?? '');
      setBookNumber(data.book_number ?? '');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('form.loadError'), 'error');
    } finally {
      setFetching(false);
    }
  }, [customerId, showToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    let hasError = false;

    if (!bookNumber.trim()) {
      setBookNumberError(t('form.bookNumberRequired'));
      hasError = true;
    } else {
      setBookNumberError('');
    }

    if (!name.trim()) {
      setError(t('form.nameRequired'));
      hasError = true;
    } else {
      setError('');
    }

    const digits = phone.trim().replace(/\D/g, '');
    if (!digits) {
      setPhoneError(t('form.phoneRequired'));
      hasError = true;
    } else if (digits.length !== 10) {
      setPhoneError(t('form.phoneInvalid'));
      hasError = true;
    } else {
      setPhoneError('');
    }

    if (hasError) return;

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        phone: digits,
        address: address.trim() || null,
        book_number: bookNumber.trim() || null,
      };

      if (isEditing) {
        await customersRepo.update(customerId!, shop.id, payload);
        showToast(t('form.updateSuccess'), 'success');
        navigation.goBack();
      } else {
        const created = await customersRepo.create({ shop_id: shop.id, ...payload });
        showToast(t('form.saveSuccess'), 'success');
        Alert.alert(t('form.addMeasurementsPromptTitle'), t('form.addMeasurementsPromptMessage'), [
          { text: t('form.addMeasurementsPromptNo'), style: 'cancel', onPress: () => navigation.goBack() },
          {
            text: t('form.addMeasurementsPromptYes'),
            onPress: () => navigation.replace('MeasurementForm', { customerId: created.id }),
          },
        ]);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('form.saveError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('form.loading')} onBack={() => navigation.goBack()} />
        <View className="gap-4 p-4">
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <Header title={t(isEditing ? 'form.editTitle' : 'form.title')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {/* Order matches how a shop owner works from their paper book:
              client number first, then name, phone, address. */}
          <InputField
            label={t('form.bookNumberLabel')}
            value={bookNumber}
            onChangeText={(v) => {
              setBookNumber(v);
              setBookNumberError('');
            }}
            placeholder={t('form.bookNumberPlaceholder')}
            returnKeyType="next"
            onSubmitEditing={() => nameRef.current?.focus()}
            error={bookNumberError}
            required
          />
          <InputField
            ref={nameRef}
            label={t('form.nameLabel')}
            value={name}
            onChangeText={setName}
            placeholder={t('form.namePlaceholder')}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            error={error}
            required
          />
          <InputField
            ref={phoneRef}
            label={t('form.phoneLabel')}
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setPhoneError('');
            }}
            placeholder={t('form.phonePlaceholder')}
            keyboardType="phone-pad"
            autoComplete="tel"
            prefix="+91"
            maxLength={10}
            returnKeyType="next"
            onSubmitEditing={() => addressRef.current?.focus()}
            error={phoneError}
            helperText={!phoneError && phoneDigits.length === 10 ? t('form.phoneValid') : undefined}
            required
          />
          <InputField
            ref={addressRef}
            label={t('form.addressLabel')}
            value={address}
            onChangeText={setAddress}
            placeholder={t('form.addressPlaceholder')}
            autoComplete="street-address"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            optional
          />
        </ScrollView>
        <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="border-t border-line bg-surface px-4 pt-3">
          <Button title={t(isEditing ? 'form.updateCustomer' : 'form.saveCustomer')} size="lg" onPress={handleSave} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
