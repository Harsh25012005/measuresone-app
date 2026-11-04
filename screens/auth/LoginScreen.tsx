import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthLayout, OrDivider } from '../../components/ds/AuthLayout';
import { DSButton } from '../../components/ds/Button';
import { DSInput } from '../../components/ds/Input';
import { GoogleIcon, useToast } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { typography } from '../../constants/tokens';
import type { AuthScreenProps } from '../../navigation/types';

export default function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const showToast = useToast();
  const { t } = useTranslation('auth');
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = t('login.errorEmailRequired');
    if (!password) next.password = t('login.errorPasswordRequired');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err) {
      // Supabase refuses the sign-in until the address is verified — send the
      // user to the confirmation screen instead of a dead-end error toast.
      const message = err instanceof Error ? err.message : '';
      if (/email not confirmed|not confirmed/i.test(message)) {
        navigation.navigate('ConfirmEmail', { email: email.trim() });
        return;
      }

      // Supabase returns the same "invalid credentials" for a wrong password
      // and for an address that was never registered — it won't reveal which,
      // by design. So the message has to cover both and point at sign-up.
      if (/invalid login credentials|invalid_credentials/i.test(message)) {
        setErrors({ password: t('login.errorNoAccountOrPassword') });
        showToast(t('login.errorNoAccountOrPassword'), 'error');
        return;
      }

      showToast(message || t('login.errorSignIn'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('login.errorGoogle'), 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      scene="login"
      title={t('login.appName')}
      subtitle={t('login.subtitle')}
      footer={
        <>
          <Text style={{ fontFamily: typography.family.regular, fontSize: 14, color: colors.textMuted }}>
            {t('login.noAccount')}
          </Text>
          <DSButton title={t('login.signUp')} variant="link" size="sm" onPress={() => navigation.navigate('Signup')} />
        </>
      }
    >
      <DSInput
        label={t('login.email')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('login.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />

      <View>
        <DSInput
          kind="password"
          label={t('login.password')}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          error={errors.password}
        />
        <View style={{ alignSelf: 'flex-end', marginTop: 4 }}>
          <DSButton title={t('login.forgotPassword')} variant="link" size="sm" onPress={() => navigation.navigate('ForgotPassword')} />
        </View>
      </View>

      <DSButton title={t('login.signIn')} size="lg" fullWidth onPress={handleLogin} loading={loading} />

      <OrDivider label={t('login.or')} />

      <DSButton
        title={t('login.continueWithGoogle')}
        variant="black"
        size="lg"
        fullWidth
        onPress={handleGoogle}
        loading={googleLoading}
        leftNode={<GoogleIcon size={20} />}
      />
    </AuthLayout>
  );
}
