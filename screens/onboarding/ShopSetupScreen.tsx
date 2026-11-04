import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../../components/ds/AuthLayout';
import { DSButton } from '../../components/ds/Button';
import { DSImagePicker } from '../../components/ds/ImagePicker';
import { DSInput } from '../../components/ds/Input';
import { DSTabs } from '../../components/ds/Tabs';
import { IconChevronDown } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { uploadImage } from '../../lib/storage';
import { setAppLanguage, SUPPORTED_LANGUAGES, type AppLanguage } from '../../lib/i18n';
import { typography } from '../../constants/tokens';

type ShopSetupErrors = { shopName?: string; ownerName?: string };

/** Endonyms — deliberately not translated, each option shows its own script. */
const LANGUAGE_ENDONYMS: Record<AppLanguage, string> = {
  en: 'English',
  gu: 'ગુજરાતી',
  hi: 'हिन्दी',
};

export default function ShopSetupScreen() {
  const { user, refreshShop } = useAuth();
  const showToast = useToast();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation('auth');
  const currentLanguage = (i18n.language as AppLanguage) || 'en';

  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<ShopSetupErrors>({});
  const [loading, setLoading] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const validate = () => {
    const next: ShopSetupErrors = {};
    if (!shopName.trim()) next.shopName = t('shopSetup.errorShopNameRequired');
    if (!ownerName.trim()) next.ownerName = t('shopSetup.errorOwnerNameRequired');
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
          // The shop row is already saved — a failed logo upload shouldn't
          // block onboarding. The owner can re-upload from Settings later.
          showToast(t('shopSetup.logoUploadFailed'), 'info');
        }
      }

      await refreshShop();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('shopSetup.errorSave'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout scene="shop" title={t('shopSetup.title')} subtitle={t('shopSetup.subtitle')}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: typography.family.semibold, fontSize: 13, color: colors.textSecondary }}>
          {t('shopSetup.language')}
        </Text>
        <DSTabs
          variant="pill"
          value={currentLanguage}
          onChange={(k) => setAppLanguage(k as AppLanguage)}
          items={SUPPORTED_LANGUAGES.map((lang) => ({ key: lang, label: LANGUAGE_ENDONYMS[lang] }))}
        />
        <Text style={{ fontFamily: typography.family.regular, fontSize: 12, color: colors.textMuted, marginLeft: 4 }}>
          {t('shopSetup.languageHint')}
        </Text>
      </View>

      <DSInput
        label={`${t('shopSetup.shopName')} *`}
        value={shopName}
        onChangeText={setShopName}
        placeholder={t('shopSetup.shopNamePlaceholder')}
        error={errors.shopName}
      />

      <DSInput
        label={`${t('shopSetup.ownerName')} *`}
        value={ownerName}
        onChangeText={setOwnerName}
        placeholder={t('shopSetup.ownerNamePlaceholder')}
        error={errors.ownerName}
      />

      {/* Progressive disclosure: only the two fields above are required to
          get into the app. Everything else — logo, address, phone — is an
          optional expansion the user opts into, not a gate they must clear. */}
      {showMoreDetails ? (
        <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 20 }}>
          <DSImagePicker label={t('shopSetup.shopLogo')} uri={logoUri} onChange={setLogoUri} />
          <DSInput
            label={t('shopSetup.address')}
            value={address}
            onChangeText={setAddress}
            placeholder={t('shopSetup.addressPlaceholder')}
          />
          <DSInput
            label={t('shopSetup.phone')}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('shopSetup.phonePlaceholder')}
            keyboardType="phone-pad"
          />
        </Animated.View>
      ) : (
        <View style={{ gap: 2 }}>
          <DSButton
            title={t('shopSetup.addMoreDetails')}
            variant="link"
            size="sm"
            rightIcon={IconChevronDown}
            onPress={() => setShowMoreDetails(true)}
          />
          <Text style={{ fontFamily: typography.family.regular, fontSize: 13, color: colors.textMuted, marginLeft: 8 }}>
            {t('shopSetup.addMoreDetailsHint')}
          </Text>
        </View>
      )}

      <DSButton title={t('shopSetup.continue')} size="lg" fullWidth onPress={handleSave} loading={loading} />
    </AuthLayout>
  );
}
