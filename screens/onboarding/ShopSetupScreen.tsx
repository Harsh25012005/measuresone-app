import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, ImagePickerField, InputField, useToast } from '../../src/components/ui';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadImage } from '../../lib/storage';
import { AuthLayout } from '../auth/AuthLayout';

type ShopSetupErrors = { shopName?: string; ownerName?: string };

export default function ShopSetupScreen() {
  const { user, refreshShop } = useAuth();
  const showToast = useToast();
  const { t } = useTranslation('auth');

  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<ShopSetupErrors>({});
  const [loading, setLoading] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const ownerRef = useRef<TextInput>(null);

  const validate = () => {
    const next: ShopSetupErrors = {};
    if (!shopName.trim()) next.shopName = t('shopSetup.errorShopNameRequired', { defaultValue: 'Shop name is required' });
    if (!ownerName.trim()) next.ownerName = t('shopSetup.errorOwnerNameRequired', { defaultValue: 'Owner name is required' });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    setLoading(true);
    try {
      const { data: shop, error } = await supabase
        .from('shops')
        .insert({
          owner_id: user.id,
          shop_name: shopName.trim(),
          owner_name: ownerName.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (logoUri) {
        try {
          const logoUrl = await uploadImage({
            bucket: 'shop-logos',
            shopId: shop.id,
            localUri: logoUri,
            fileName: 'logo',
          });
          await supabase.from('shops').update({ logo_url: logoUrl }).eq('id', shop.id);
        } catch {
          showToast(t('shopSetup.logoUploadFailed', { defaultValue: 'Logo upload failed, can add later' }), 'info');
        }
      }

      await refreshShop();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('shopSetup.errorSave', { defaultValue: 'Save failed' }), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      showLanguage
      title={t('shopSetup.title', { defaultValue: 'Set up your tailor shop' })}
      subtitle={t('shopSetup.subtitle', { defaultValue: 'Takes less than a minute to get started' })}
    >
      <InputField
        label={t('shopSetup.shopName', { defaultValue: 'Shop name' })}
        value={shopName}
        onChangeText={setShopName}
        placeholder={t('shopSetup.shopNamePlaceholder', { defaultValue: 'e.g. Royal Tailors' })}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => ownerRef.current?.focus()}
        error={errors.shopName}
        required
      />

      <InputField
        ref={ownerRef}
        label={t('shopSetup.ownerName', { defaultValue: 'Master / Owner name' })}
        value={ownerName}
        onChangeText={setOwnerName}
        placeholder={t('shopSetup.ownerNamePlaceholder', { defaultValue: 'e.g. Rameshbhai' })}
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType={showMoreDetails ? 'next' : 'done'}
        onSubmitEditing={showMoreDetails ? undefined : handleSave}
        error={errors.ownerName}
        required
      />

      {showMoreDetails ? (
        <View>
          <InputField
            label={t('shopSetup.phone', { defaultValue: 'Shop phone' })}
            value={phone}
            onChangeText={setPhone}
            placeholder="98765 43210"
            keyboardType="phone-pad"
            autoComplete="tel"
            prefix="+91"
            maxLength={10}
            optional
          />

          <InputField
            label={t('shopSetup.address', { defaultValue: 'Shop address' })}
            value={address}
            onChangeText={setAddress}
            placeholder={t('shopSetup.addressPlaceholder')}
            autoComplete="street-address"
            optional
          />

          <ImagePickerField label={t('shopSetup.shopLogo', { defaultValue: 'Shop logo' })} uri={logoUri} onChange={setLogoUri} size={96} />
        </View>
      ) : (
        <Button
          title={`+ ${t('shopSetup.addMoreDetails', { defaultValue: 'Add phone & address (optional)' })}`}
          variant="ghost"
          fullWidth={false}
          className="mb-2 self-start"
          onPress={() => setShowMoreDetails(true)}
        />
      )}

      <Button title={t('shopSetup.continue', { defaultValue: 'Continue to shop' })} onPress={handleSave} loading={loading} />
    </AuthLayout>
  );
}
