import { Alert, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, Header, Icon, ListRow, LogoMark, SegmentedControl, Section, Text, useToast } from '../../src/components/ui';
import { usePalette } from '../../src/theme/usePalette';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useAuth } from '../../context/AuthContext';
import { useProductTour } from '../../context/ProductTourContext';
import { useTheme } from '../../context/ThemeContext';
import { haptics } from '../../lib/haptics';
import { THEME_MODES, type ThemeMode } from '../../lib/theme';
import type { SettingsScreenProps } from '../../navigation/types';

/** Icon tile used as the leading element of every More-tab row. */
function RowIcon({ name }: { name: string }) {
  const { colors } = useTheme();
  return (
    <View className="h-10 w-10 items-center justify-center rounded bg-primary-50">
      <Icon name={name} size={20} color={colors.primary} />
    </View>
  );
}

export default function SettingsScreen({ navigation }: SettingsScreenProps<'SettingsHome'>) {
  const { shop, user, signOut } = useAuth();
  const { start: startTour } = useProductTour();
  const { mode, setMode } = useTheme();
  const palette = usePalette();
  const showToast = useToast();
  const { t } = useTranslation(['settings', 'common']);

  const changeTheme = (next: ThemeMode) => {
    haptics.tap();
    void setMode(next);
  };

  const confirmSignOut = () => {
    haptics.warning();
    Alert.alert(t('signOutConfirmTitle'), t('signOutConfirmMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('signOut'),
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (err) {
            showToast(err instanceof Error ? err.message : t('errorSignOut'), 'error');
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-bg">
      <Header title={t('title')} showBack={false} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 20 }}>
        {/* Shop */}
        <Card onPress={() => navigation.navigate('ShopEdit')} accessibilityLabel={`${shop?.shop_name ?? 'TrueFit'}, ${t('common:actions.edit')}`}>
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded bg-primary-50">
              <LogoMark size={28} color={palette.primary} />
            </View>
            <View className="ml-3 min-w-0 flex-1">
              <Text variant="bodyLg" numberOfLines={1}>
                {shop?.shop_name || 'TrueFit'}
              </Text>
              <Text variant="label" tone="muted" weight="regular" numberOfLines={1}>
                {shop?.owner_name ? `${shop.owner_name} · ` : ''}
                {shop?.phone ? `+91 ${shop.phone}` : user?.email || ''}
              </Text>
            </View>
            <Icon name="edit" size={20} color={palette.textMuted} />
          </View>
        </Card>

        {/* Staff and money */}
        <Section title={t('business', { defaultValue: 'Business & Finances' })} padded={false}>
          <ListRow
            title={t('revenue:menuTitle', { defaultValue: 'Revenue & Reports' })}
            subtitle={t('menuDesc.revenue')}
            leading={<RowIcon name="chart" />}
            onPress={() => navigation.navigate('Revenue')}
          />
          <ListRow
            title={t('staffManagement', { defaultValue: 'Staff & karigars' })}
            subtitle={t('menuDesc.staff')}
            leading={<RowIcon name="users" />}
            onPress={() => navigation.navigate('Staff')}
          />
          <ListRow
            title={t('dashboard:calendar.title')}
            subtitle={t('menuDesc.calendar')}
            leading={<RowIcon name="calendar" />}
            onPress={() => navigation.navigate('Calendar' as any)}
            divider={false}
          />
        </Section>

        {/* Measurements */}
        <Section title={t('shopManagement', { defaultValue: 'Shop Management' })} padded={false}>
          <ListRow
            title={t('universalMeasurements.menuTitle', { defaultValue: 'Cloth types' })}
            subtitle={t('menuDesc.universalMeasurements')}
            leading={<RowIcon name="scissors" />}
            onPress={() => navigation.navigate('UniversalMeasurements')}
            divider={false}
          />
        </Section>

        {/* App */}
        <Section title={t('appearance')}>
          <LanguageSwitcher className="mb-4" />
          <SegmentedControl
            value={mode}
            onChange={changeTheme}
            options={THEME_MODES.map((m) => ({
              value: m,
              label: t(`theme${m.charAt(0).toUpperCase()}${m.slice(1)}`),
            }))}
          />
        </Section>

        <View className="gap-3">
          <Button
            title={t('productTour.replay', { defaultValue: 'Replay Product Tour' })}
            variant="secondary"
            icon={<Icon name="info" size={20} color={palette.text} />}
            onPress={() => startTour()}
          />
          <Button
            title={t('signOut')}
            variant="danger"
            icon={<Icon name="logout" size={20} color={palette.danger} />}
            onPress={confirmSignOut}
          />
        </View>
      </ScrollView>
    </View>
  );
}
