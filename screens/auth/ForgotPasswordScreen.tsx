import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InputField, Text, useToast } from '../../src/components/ui';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout, AuthStatusIcon } from './AuthLayout';
import type { AuthScreenProps } from '../../navigation/types';

export default function ForgotPasswordScreen({ navigation }: AuthScreenProps<'ForgotPassword'>) {
  const { resetPassword } = useAuth();
  const showToast = useToast();
  const { t } = useTranslation('auth');

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError(t('forgotPassword.errorEmailRequired', { defaultValue: 'Email is required' }));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('forgotPassword.errorSend', { defaultValue: 'Failed to send reset link' }), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      onBack={() => navigation.goBack()}
      title={t('forgotPassword.title', { defaultValue: 'Reset password' })}
      subtitle={sent ? undefined : t('forgotPassword.instructions', { defaultValue: 'Enter your account email to receive a password reset link.' })}
    >
      {sent ? (
        <>
          <AuthStatusIcon name="circleCheck" />
          <Text variant="body" className="mb-6 text-center" accessibilityLiveRegion="polite">
            {t('forgotPassword.sentMessage', { email, defaultValue: `A reset link was sent to ${email}` })}
          </Text>
          <Button title={t('login.signIn', { defaultValue: 'Sign in' })} variant="secondary" onPress={() => navigation.navigate('Login')} />
        </>
      ) : (
        <>
          <InputField
            label={t('forgotPassword.email', { defaultValue: 'Email address' })}
            value={email}
            onChangeText={setEmail}
            placeholder="tailor@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={handleReset}
            error={error}
          />
          <Button title={t('forgotPassword.sendResetLink', { defaultValue: 'Send reset link' })} onPress={handleReset} loading={loading} />
        </>
      )}
    </AuthLayout>
  );
}
