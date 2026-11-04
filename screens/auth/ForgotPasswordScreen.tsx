import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../../components/ds/AuthLayout';
import { DSButton } from '../../components/ds/Button';
import { DSInput } from '../../components/ds/Input';
import { useToast } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
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
      setError(t('forgotPassword.errorEmailRequired'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('forgotPassword.errorSend'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        scene="mail"
        title={t('forgotPassword.title')}
        subtitle={t('forgotPassword.sentMessage', { email })}
        onBack={() => navigation.goBack()}
      >
        <DSButton title={t('confirmEmail.backToLogin')} size="lg" fullWidth onPress={() => navigation.navigate('Login')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      scene="forgot"
      title={t('forgotPassword.title')}
      subtitle={t('forgotPassword.instructions')}
      onBack={() => navigation.goBack()}
    >
      <DSInput
        label={t('forgotPassword.email')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('forgotPassword.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        error={error}
      />
      <DSButton title={t('forgotPassword.sendResetLink')} size="lg" fullWidth onPress={handleReset} loading={loading} />
    </AuthLayout>
  );
}
