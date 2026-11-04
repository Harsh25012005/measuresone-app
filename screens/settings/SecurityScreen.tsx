import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { DSButton } from '../../components/ds/Button';
import { useConfirmDelete } from '../../components/ds/ConfirmDelete';
import { DSScreen } from '../../components/ds/Screen';
import { IconLogout, IconMail } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { haptics } from '../../lib/haptics';
import { primary, typography } from '../../constants/tokens';
import type { SettingsScreenProps } from '../../navigation/types';

const f = typography.family;

export default function SecurityScreen({ navigation }: SettingsScreenProps<'Security'>) {
  const { user, signOut } = useAuth();
  const { t } = useTranslation('settings');
  const showToast = useToast();
  const { colors, scheme } = useTheme();
  const { confirm, popup } = useConfirmDelete();
  const border = scheme === 'dark' ? '#262626' : colors.borderDefault;

  const confirmSignOut = () => {
    haptics.warning();
    confirm({
      title: t('signOutConfirmTitle'),
      description: t('signOutConfirmMessage'),
      confirmLabel: t('signOut'),
      cancelLabel: t('cancel'),
      icon: IconLogout,
      onConfirm: async () => {
        try {
          await signOut();
        } catch (err) {
          showToast(err instanceof Error ? err.message : t('errorSignOut'), 'error');
        }
      },
    });
  };

  const heading = (text: string) => (
    <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary }}>{text}</Text>
  );

  return (
    <DSScreen title={t('security.title')} onBack={() => navigation.goBack()}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* which account this is */}
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: border }]}>
          <View style={[styles.icon, { backgroundColor: colors.primaryTint }]}>
            <IconMail size={20} color={primary[600]} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: f.medium, fontSize: 12, color: colors.textMuted }}>{t('security.signedInAs')}</Text>
            <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(300)} style={{ gap: 10 }}>
          {heading(t('security.session'))}
          <Text style={{ fontFamily: f.regular, fontSize: 13, lineHeight: 19, color: colors.textMuted }}>{t('security.sessionHint')}</Text>
          <DSButton title={t('signOut')} variant="destructive" size="lg" fullWidth leftIcon={IconLogout} onPress={confirmSignOut} />
        </Animated.View>
      </ScrollView>
      {popup}
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 24, padding: 16 },
  icon: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
