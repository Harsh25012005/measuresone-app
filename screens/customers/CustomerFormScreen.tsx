import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DSPopup } from '../../components/ds/Popup';
import { DSButton } from '../../components/ds/Button';
import { DSInput } from '../../components/ds/Input';
import { DSSkeletonList } from '../../components/ds/Loading';
import { IconRuler2 } from '../../components/ds/icons';
import { DSFormScreen } from '../../components/ds/Screen';
import { useToast } from '../../components/ui';
import { customersRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import type { CustomersScreenProps } from '../../navigation/types';

export default function CustomerFormScreen({ navigation, route }: CustomersScreenProps<'CustomerForm'>) {
  const customerId = route.params?.customerId;
  const isEditing = Boolean(customerId);

  const { t } = useTranslation('customers');
  const shop = useShop();
  const showToast = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bookNumber, setBookNumber] = useState('');
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [bookNumberError, setBookNumberError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

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
        // Alert.alert has no web implementation, so ask with the design-system popup.
        setCreatedId(created.id);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('form.saveError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DSFormScreen title={t(isEditing ? 'form.editTitle' : 'form.title')} onBack={() => navigation.goBack()}>
      {fetching ? (
        <DSSkeletonList rows={4} />
      ) : (
        <>
          {/* Order matches how a shop owner works from their paper book:
              client number first, then name, phone, address. */}
          <DSInput
            label={`${t('form.bookNumberLabel')} *`}
            value={bookNumber}
            onChangeText={(v) => {
              setBookNumber(v);
              setBookNumberError('');
            }}
            placeholder={t('form.bookNumberPlaceholder')}
            error={bookNumberError}
          />
          <DSInput
            label={`${t('form.nameLabel')} *`}
            value={name}
            onChangeText={setName}
            placeholder={t('form.namePlaceholder')}
            error={error}
          />
          <DSInput
            label={`${t('form.phoneLabel')} *`}
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setPhoneError('');
            }}
            placeholder={t('form.phonePlaceholder')}
            keyboardType="phone-pad"
            error={phoneError}
            helper={!phoneError && phoneDigits.length === 10 ? t('form.phoneValid') : undefined}
          />
          <DSInput
            kind="textarea"
            label={t('form.addressLabel')}
            value={address}
            onChangeText={setAddress}
            placeholder={t('form.addressPlaceholder')}
          />
          <View style={{ marginTop: 8 }}>
            <DSButton
              title={t(isEditing ? 'form.updateCustomer' : 'form.saveCustomer')}
              size="lg"
              fullWidth
              onPress={handleSave}
              loading={loading}
            />
          </View>
        </>
      )}
      <DSPopup
        visible={createdId !== null}
        onClose={() => {
          setCreatedId(null);
          navigation.goBack();
        }}
        dismissOnScrim={false}
        tone="info"
        icon={IconRuler2}
        title={t('form.addMeasurementsPromptTitle')}
        description={t('form.addMeasurementsPromptMessage')}
        primaryLabel={t('form.addMeasurementsPromptYes')}
        onPrimary={() => {
          const id = createdId;
          setCreatedId(null);
          if (id) navigation.replace('MeasurementForm', { customerId: id });
        }}
        secondaryLabel={t('form.addMeasurementsPromptNo')}
        onSecondary={() => {
          setCreatedId(null);
          navigation.goBack();
        }}
      />
    </DSFormScreen>
  );
}
