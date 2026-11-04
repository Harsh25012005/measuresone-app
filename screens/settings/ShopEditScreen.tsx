import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DSButton } from '../../components/ds/Button';
import { DSImagePicker } from '../../components/ds/ImagePicker';
import { DSInput } from '../../components/ds/Input';
import { DSFormScreen } from '../../components/ds/Screen';
import { useToast } from '../../components/ui';
import { useAuth, useShop } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadImage } from '../../lib/storage';
import type { SettingsScreenProps } from '../../navigation/types';

type ShopEditErrors = { shopName?: string; ownerName?: string };

export default function ShopEditScreen({ navigation }: SettingsScreenProps<'ShopEdit'>) {
  const shop = useShop();
  const { refreshShop } = useAuth();
  const showToast = useToast();
  const { t } = useTranslation('settings');

  const [shopName, setShopName] = useState(shop.shop_name ?? '');
  const [ownerName, setOwnerName] = useState(shop.owner_name ?? '');
  const [address, setAddress] = useState(shop.address ?? '');
  const [phone, setPhone] = useState(shop.phone ?? '');
  const [logoUri, setLogoUri] = useState<string | null>(shop.logo_url ?? null);
  const [errors, setErrors] = useState<ShopEditErrors>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: ShopEditErrors = {};
    if (!shopName.trim()) next.shopName = t('shopEdit.errorShopNameRequired');
    if (!ownerName.trim()) next.ownerName = t('shopEdit.errorOwnerNameRequired');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      let logoUrl = shop.logo_url ?? null;
      if (logoUri && logoUri !== shop.logo_url) {
        try {
          logoUrl = await uploadImage({
            bucket: 'shop-logos',
            shopId: shop.id,
            localUri: logoUri,
            fileName: 'logo',
          });
        } catch {
          showToast(t('shopEdit.logoUploadFailed'), 'info');
        }
      }

      const { error } = await supabase
        .from('shops')
        .update({
          shop_name: shopName.trim(),
          owner_name: ownerName.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          logo_url: logoUrl,
        })
        .eq('id', shop.id);
      if (error) throw error;

      await refreshShop();
      showToast(t('shopEdit.saveSuccess'), 'success');
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('shopEdit.saveError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DSFormScreen
      title={t('shopEdit.title')}
      onBack={() => navigation.goBack()}
      footer={<DSButton title={t('shopEdit.save')} size="lg" fullWidth onPress={handleSave} loading={loading} />}
    >
      <View style={{ alignItems: 'center' }}>
        <DSImagePicker uri={logoUri} onChange={setLogoUri} />
      </View>

      <DSInput
        label={`${t('shopEdit.shopName')} *`}
        value={shopName}
        onChangeText={(v) => {
          setShopName(v);
          setErrors((e) => ({ ...e, shopName: undefined }));
        }}
        placeholder={t('shopEdit.shopNamePlaceholder')}
        error={errors.shopName}
      />
      <DSInput
        label={`${t('shopEdit.ownerName')} *`}
        value={ownerName}
        onChangeText={(v) => {
          setOwnerName(v);
          setErrors((e) => ({ ...e, ownerName: undefined }));
        }}
        placeholder={t('shopEdit.ownerNamePlaceholder')}
        error={errors.ownerName}
      />
      <DSInput label={t('shopEdit.address')} value={address} onChangeText={setAddress} placeholder={t('shopEdit.addressPlaceholder')} />
      <DSInput label={t('shopEdit.phone')} value={phone} onChangeText={setPhone} placeholder={t('shopEdit.phonePlaceholder')} keyboardType="phone-pad" />
    </DSFormScreen>
  );
}
