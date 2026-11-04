import { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '../../src/components/ui/Button';
import { InputField } from '../../src/components/ui/InputField';
import { BottomSheet } from '../../src/components/ui/Modal';
import { useToast } from '../../src/components/ui/Toast';
import { customersRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import type { Tables } from '../../lib/database.types';

export type QuickAddCustomerSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Called with the newly-created customer once saved, sheet is closed automatically. */
  onCreated: (customer: Tables<'customers'>) => void;
};

/**
 * Minimum-friction "add client" flow used inside other flows (New Order, New Bill).
 * Only asks for name + phone; full details (address, book number) can be added
 * later from the Customer Detail screen.
 */
export function QuickAddCustomerSheet({ visible, onClose, onCreated }: QuickAddCustomerSheetProps) {
  const { t } = useTranslation('customers');
  const shop = useShop();
  const showToast = useToast();

  const [bookNumber, setBookNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bookNumberError, setBookNumberError] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const reset = () => {
    setBookNumber('');
    setName('');
    setPhone('');
    setBookNumberError('');
    setNameError('');
    setPhoneError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    let hasError = false;

    if (!bookNumber.trim()) {
      setBookNumberError(t('form.bookNumberRequired'));
      hasError = true;
    } else {
      setBookNumberError('');
    }

    if (!name.trim()) {
      setNameError(t('form.nameRequired'));
      hasError = true;
    } else {
      setNameError('');
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
      const customer = await customersRepo.create({
        shop_id: shop.id,
        name: name.trim(),
        phone: digits,
        address: null,
        book_number: bookNumber.trim(),
      });

      showToast(t('form.saveSuccess'), 'success');
      reset();
      onCreated(customer);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('form.saveError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={t('quickAdd.title')}
      footer={<Button title={t('quickAdd.save')} size="lg" onPress={handleSave} loading={loading} />}
    >
      {/* Same field order as the full client form: client number, name,
          phone — matching how a shop owner reads their paper order book. */}
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
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
        error={nameError}
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
        prefix="+91"
        maxLength={10}
        returnKeyType="done"
        onSubmitEditing={handleSave}
        error={phoneError}
        required
      />
    </BottomSheet>
  );
}
