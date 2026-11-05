import { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { Pressable } from '../../components/ds/Pressable';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../../components/ds/AuthLayout';
import { DSBottomSheet } from '../../components/ds/BottomSheet';
import { DSButton } from '../../components/ds/Button';
import { IconChevronRight, IconMail } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../constants/tokens';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getInstalledMailApps,
  openMailApp,
  openSpecificMailApp,
  type MailAppOption,
} from '../../lib/mailApp';
import type { AuthScreenProps } from '../../navigation/types';

/** How long to disable "Resend" for, so Supabase's rate limit isn't tripped. */
const RESEND_COOLDOWN_SECONDS = 60;

export default function ConfirmEmailScreen({ navigation, route }: AuthScreenProps<'ConfirmEmail'>) {
  const { email } = route.params;
  const { resendConfirmationEmail } = useAuth();
  const showToast = useToast();
  const { t } = useTranslation('auth');
  const { colors, scheme } = useTheme();

  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [mailApps, setMailApps] = useState<MailAppOption[]>([]);
  const [showMailPicker, setShowMailPicker] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Coming back from the mail app is the most likely moment for confirmation
  // to have just happened, so re-check the session then. The deep link
  // handler in AuthContext covers the case where the link opened the app
  // directly; this covers the user confirming on another device or the link
  // opening in a browser instead.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void supabase.auth.refreshSession();
    });
    return () => subscription.remove();
  }, []);

  const handleOpenMail = async () => {
    // On iOS several clients may be installed and there's no system chooser,
    // so offer one. Android's APP_EMAIL intent already handles this natively.
    const installed = await getInstalledMailApps();
    if (installed.length > 1) {
      setMailApps(installed);
      setShowMailPicker(true);
      return;
    }

    const opened = await openMailApp();
    if (!opened) showToast(t('confirmEmail.errorNoMailApp'), 'info');
  };

  const handlePickMailApp = async (app: MailAppOption) => {
    setShowMailPicker(false);
    const opened = await openSpecificMailApp(app);
    if (!opened) showToast(t('confirmEmail.errorNoMailApp'), 'info');
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendConfirmationEmail(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      showToast(t('confirmEmail.resent'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('confirmEmail.errorResend'), 'error');
    } finally {
      setResending(false);
    }
  };

  // Manual escape hatch: if the session is now confirmed, AuthProvider's
  // listener swaps the navigator over automatically once it refreshes.
  const handleCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (!data.session?.user?.email_confirmed_at) {
        showToast(t('confirmEmail.notConfirmedYet'), 'info');
      }
    } catch {
      showToast(t('confirmEmail.notConfirmedYet'), 'info');
    } finally {
      setChecking(false);
    }
  };

  return (
    <AuthLayout
      scene="mail"
      title={t('confirmEmail.title')}
      subtitle={t('confirmEmail.subtitle')}
      footer={
        <DSButton title={t('confirmEmail.backToLogin')} variant="link" size="sm" onPress={() => navigation.navigate('Login')} />
      }
      overlay={
        <DSBottomSheet visible={showMailPicker} onClose={() => setShowMailPicker(false)} title={t('confirmEmail.chooseMailApp')}>
          <View style={{ gap: 8, paddingBottom: 4 }}>
            {mailApps.map((app) => (
              <Pressable
                key={app.key}
                onPress={() => handlePickMailApp(app)}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: 52,
                  paddingHorizontal: 20,
                  borderRadius: 9999,
                  borderWidth: 1,
                  backgroundColor: pressed ? colors.primaryTint : colors.bgSubtle,
                  borderColor: scheme === 'dark' ? '#262626' : colors.borderSubtle,
                })}
              >
                <Text style={{ fontFamily: typography.family.semibold, fontSize: 15, color: colors.textPrimary }}>{app.label}</Text>
                <IconChevronRight size={16} color={colors.textFaint} />
              </Pressable>
            ))}
          </View>
        </DSBottomSheet>
      }
    >
      {/* the address, shown as a pill so it's easy to double-check */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          alignSelf: 'flex-start',
          maxWidth: '100%',
          paddingHorizontal: 14,
          height: 40,
          borderRadius: 9999,
          backgroundColor: colors.primaryTint,
        }}
      >
        <IconMail size={16} color={colors.primary} />
        <Text style={{ fontFamily: typography.family.semibold, fontSize: 14, color: colors.textPrimary, flexShrink: 1 }} numberOfLines={1}>
          {email}
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <DSButton title={t('confirmEmail.openMailApp')} size="lg" fullWidth leftIcon={IconMail} onPress={handleOpenMail} />
        <DSButton
          title={t('confirmEmail.alreadyConfirmed')}
          variant="line"
          size="lg"
          fullWidth
          onPress={handleCheck}
          loading={checking}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 4 }}>
        <Text style={{ fontFamily: typography.family.regular, fontSize: 14, color: colors.textMuted }}>
          {t('confirmEmail.noEmail')}
        </Text>
        <DSButton
          title={cooldown > 0 ? t('confirmEmail.resendIn', { seconds: cooldown }) : t('confirmEmail.resend')}
          variant="link"
          size="sm"
          disabled={resending || cooldown > 0}
          onPress={handleResend}
        />
      </View>
    </AuthLayout>
  );
}
