import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheet, Button, ListRow, Text, useToast } from '../../src/components/ui';
import { AuthLayout, AuthStatusIcon } from './AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getInstalledMailApps,
  openMailApp,
  openSpecificMailApp,
  type MailAppOption,
} from '../../lib/mailApp';
import type { AuthScreenProps } from '../../navigation/types';

const RESEND_COOLDOWN_SECONDS = 60;

export default function ConfirmEmailScreen({ navigation, route }: AuthScreenProps<'ConfirmEmail'>) {
  const { email } = route.params;
  const { resendConfirmationEmail } = useAuth();
  const showToast = useToast();
  const { t } = useTranslation('auth');

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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void supabase.auth.refreshSession();
    });
    return () => subscription.remove();
  }, []);

  const handleOpenMail = async () => {
    const installed = await getInstalledMailApps();
    if (installed.length > 1) {
      setMailApps(installed);
      setShowMailPicker(true);
      return;
    }

    const opened = await openMailApp();
    if (!opened) showToast(t('confirmEmail.errorNoMailApp', { defaultValue: 'Could not open mail app' }), 'info');
  };

  const handlePickMailApp = async (app: MailAppOption) => {
    setShowMailPicker(false);
    const opened = await openSpecificMailApp(app);
    if (!opened) showToast(t('confirmEmail.errorNoMailApp', { defaultValue: 'Could not open mail app' }), 'info');
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendConfirmationEmail(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      showToast(t('confirmEmail.resent', { defaultValue: 'Confirmation email resent' }), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('confirmEmail.errorResend', { defaultValue: 'Could not resend email' }), 'error');
    } finally {
      setResending(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (!data.session?.user?.email_confirmed_at) {
        showToast(t('confirmEmail.notConfirmedYet', { defaultValue: 'Email not confirmed yet. Please check your inbox.' }), 'info');
      }
    } catch {
      showToast(t('confirmEmail.notConfirmedYet', { defaultValue: 'Email not confirmed yet. Please check your inbox.' }), 'info');
    } finally {
      setChecking(false);
    }
  };

  return (
    <AuthLayout
      onBack={() => navigation.goBack()}
      title={t('confirmEmail.title', { defaultValue: 'Check your email' })}
      subtitle={t('confirmEmail.subtitle', { defaultValue: 'We sent a confirmation link to:' })}
    >
      <AuthStatusIcon name="chat" />
      <Text variant="bodyLg" tone="primary" className="mb-6 text-center" selectable>
        {email}
      </Text>

      <Button title={t('confirmEmail.openMailApp', { defaultValue: 'Open Mail App' })} onPress={handleOpenMail} />

      <Button
        title={t('confirmEmail.alreadyConfirmed', { defaultValue: 'I already confirmed' })}
        variant="secondary"
        onPress={handleCheck}
        loading={checking}
        className="mt-3"
      />

      <Text variant="label" tone="muted" weight="regular" className="mt-6 text-center">
        {t('confirmEmail.noEmail', { defaultValue: "Didn't receive the email?" })}
      </Text>
      <Button
        title={
          cooldown > 0
            ? t('confirmEmail.resendIn', { seconds: cooldown, defaultValue: `Resend (${cooldown}s)` })
            : t('confirmEmail.resend', { defaultValue: 'Resend' })
        }
        variant="ghost"
        onPress={handleResend}
        disabled={resending || cooldown > 0}
        loading={resending}
      />

      <BottomSheet
        visible={showMailPicker}
        onClose={() => setShowMailPicker(false)}
        title={t('confirmEmail.chooseMailApp', { defaultValue: 'Choose mail app' })}
      >
        {mailApps.map((app, i) => (
          <ListRow key={app.key} title={app.label} onPress={() => handlePickMailApp(app)} divider={i < mailApps.length - 1} />
        ))}
      </BottomSheet>
    </AuthLayout>
  );
}
