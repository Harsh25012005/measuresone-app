import { memo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { DSAvatar } from '../../components/ds/Avatar';
import { DSBottomSheet } from '../../components/ds/BottomSheet';
import { DSScreen } from '../../components/ds/Screen';
import { DSRadioGroup } from '../../components/ds/Selection';
import {
  IconBuildingStore,
  IconChartBar,
  IconChevronRight,
  IconCompass,
  IconLanguage,
  IconMail,
  IconPalette,
  IconReceipt,
  IconRuler2,
  IconShieldLock,
  IconUsers,
  IconWand,
  type TablerIcon,
} from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useProductTour } from '../../context/ProductTourContext';
import { useTheme } from '../../context/ThemeContext';
import { haptics } from '../../lib/haptics';
import { setAppLanguage, SUPPORTED_LANGUAGES, type AppLanguage } from '../../lib/i18n';
import { THEME_MODES, type ThemeMode } from '../../lib/theme';
import { primary, status, typography } from '../../constants/tokens';
import type { SettingsScreenProps } from '../../navigation/types';

const f = typography.family;

const LANGUAGE_LABEL_KEY: Record<AppLanguage, string> = {
  en: 'language.english',
  gu: 'language.gujarati',
  hi: 'language.hindi',
};

const THEME_LABEL_KEY: Record<ThemeMode, string> = {
  light: 'themeLight',
  dark: 'themeDark',
  system: 'themeSystem',
};

type Kind = 'blue' | 'green' | 'purple' | 'amber';

/*
 * Row and Group live at module level on purpose. When they were declared inside
 * the screen, every state change (opening the Appearance or Language sheet) made
 * React treat them as brand-new components, remounting the whole list and
 * replaying its entrance animation — the page looked like it refreshed.
 */
const Row = memo(function Row({
  icon: Icon,
  kind,
  label,
  value,
  onPress,
  last,
}: {
  icon: TablerIcon;
  kind: Kind;
  label: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const tone = {
    blue: { tint: colors.primaryTint, fg: primary[600] },
    green: { tint: dark ? '#0F2E1C' : status.success[100], fg: status.success[600] },
    purple: { tint: dark ? '#2A1A4A' : '#EDE9FE', fg: '#7C3AED' },
    amber: { tint: dark ? '#33240A' : status.warning[100], fg: status.warning[600] },
  }[kind];
  return (
    <View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.bgSubtle : 'transparent' }]}
      >
        <View style={[styles.rowIcon, { backgroundColor: tone.tint }]}>
          <Icon size={18} color={tone.fg} strokeWidth={2} />
        </View>
        <Text style={{ flex: 1, fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }}>{label}</Text>
        {value ? <Text style={{ fontFamily: f.medium, fontSize: 13, color: colors.textMuted }}>{value}</Text> : null}
        <IconChevronRight size={16} color={colors.textFaint} />
      </Pressable>
      {last ? null : <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 70, backgroundColor: colors.borderSubtle }} />}
    </View>
  );
});

const Group = memo(function Group({ title, children, delay }: { title: string; children: React.ReactNode; delay: number }) {
  const { colors, scheme } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(300)} style={{ gap: 8 }}>
      <Text style={{ fontFamily: f.semibold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.textMuted, paddingHorizontal: 4 }}>
        {title}
      </Text>
      <View style={[styles.group, { backgroundColor: colors.bgSurface, borderColor: scheme === 'dark' ? '#262626' : colors.borderDefault }]}>
        {children}
      </View>
    </Animated.View>
  );
});

export default function SettingsScreen({ navigation }: SettingsScreenProps<'SettingsHome'>) {
  const { shop, user } = useAuth();
  const { start: startTour } = useProductTour();
  const { mode, setMode, colors } = useTheme();
  const showToast = useToast();
  const { t, i18n } = useTranslation(['settings', 'common']);
  const currentLanguage = (i18n.language as AppLanguage) || 'en';
  const [sheet, setSheet] = useState<'theme' | 'language' | null>(null);
  const version = Constants.expoConfig?.version;

  const changeLanguage = async (language: AppLanguage) => {
    haptics.tap();
    setSheet(null);
    try {
      await setAppLanguage(language);
    } catch {
      showToast(t('errorChangeLanguage'), 'error');
    }
  };

  const changeTheme = (next: ThemeMode) => {
    haptics.tap();
    setSheet(null);
    void setMode(next);
  };

  return (
    <DSScreen title={t('title')}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 22 }} showsVerticalScrollIndicator={false}>
        {/* who is signed in stays at the top, centred */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.identity}>
          {shop?.logo_url ? (
            <Image source={{ uri: shop.logo_url }} style={styles.logo} />
          ) : (
            <DSAvatar name={shop?.shop_name ?? ''} size="xl" />
          )}
          <Text style={{ fontFamily: f.bold, fontSize: 24, lineHeight: 30, color: colors.textPrimary, textAlign: 'center' }} numberOfLines={2}>
            {shop?.shop_name}
          </Text>
          <View style={[styles.chip, { backgroundColor: colors.bgSubtle, maxWidth: '100%' }]}>
            <IconMail size={14} color={colors.textMuted} />
            <Text style={{ fontFamily: f.medium, fontSize: 13, color: colors.textSecondary, flexShrink: 1 }} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </Animated.View>

        <Group title={t('account')} delay={0}>
          <Row icon={IconBuildingStore} kind="blue" label={t('editShopProfile')} onPress={() => navigation.navigate('ShopEdit')} />
          <Row icon={IconShieldLock} kind="green" label={t('security.menu')} onPress={() => navigation.navigate('Security')} last />
        </Group>

        <Group title={t('business')} delay={50}>
          <Row icon={IconReceipt} kind="amber" label={t('billingAndPayments')} onPress={() => navigation.navigate('Billing')} />
          <Row icon={IconChartBar} kind="green" label={t('revenue:menuTitle')} onPress={() => navigation.navigate('Revenue')} />
          <Row icon={IconUsers} kind="purple" label={t('staffManagement')} onPress={() => navigation.navigate('Staff')} />
          <Row icon={IconRuler2} kind="blue" label={t('universalMeasurements.menuTitle')} onPress={() => navigation.navigate('UniversalMeasurements')} last />
        </Group>

        <Group title={t('preferences')} delay={100}>
          <Row icon={IconPalette} kind="purple" label={t('appearance')} value={t(THEME_LABEL_KEY[mode])} onPress={() => setSheet('theme')} />
          <Row icon={IconLanguage} kind="green" label={t('common:language.title')} value={t(`common:${LANGUAGE_LABEL_KEY[currentLanguage]}`)} onPress={() => setSheet('language')} last />
        </Group>

        <Group title={t('help')} delay={150}>
          <Row icon={IconCompass} kind="green" label={t('howToUse')} onPress={startTour} last={!__DEV__} />
          {/* Dev-only shortcut to the redesign's component reference page */}
          {__DEV__ ? (
            <Row
              icon={IconWand}
              kind="blue"
              label="Design system"
              onPress={() => (navigation as unknown as { navigate: (name: string) => void }).navigate('DesignSystem')}
              last
            />
          ) : null}
        </Group>

        {version ? (
          <Text style={{ fontFamily: f.regular, fontSize: 12, color: colors.textFaint, textAlign: 'center' }}>
            {t('version', { version })}
          </Text>
        ) : null}
      </ScrollView>

      <DSBottomSheet visible={sheet === 'theme'} onClose={() => setSheet(null)} title={t('appearance')}>
        <View style={{ paddingTop: 12, paddingBottom: 16 }}>
          <DSRadioGroup
            value={mode}
            onChange={(v) => changeTheme(v as ThemeMode)}
            options={THEME_MODES.map((m) => ({ value: m, label: t(THEME_LABEL_KEY[m]) }))}
          />
        </View>
      </DSBottomSheet>

      <DSBottomSheet visible={sheet === 'language'} onClose={() => setSheet(null)} title={t('common:language.title')}>
        <View style={{ paddingTop: 12, paddingBottom: 16 }}>
          <DSRadioGroup
            value={currentLanguage}
            onChange={(v) => void changeLanguage(v as AppLanguage)}
            options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: t(`common:${LANGUAGE_LABEL_KEY[l]}`) }))}
          />
        </View>
      </DSBottomSheet>
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: 12, paddingTop: 4 },
  logo: { width: 80, height: 80, borderRadius: 9999 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 9999 },
  group: { borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
