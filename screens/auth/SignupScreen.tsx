import { useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthLayout, OrDivider } from '../../components/ds/AuthLayout';
import { DSButton } from '../../components/ds/Button';
import { DSInput } from '../../components/ds/Input';
import { GoogleIcon, useToast } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { typography } from '../../constants/tokens';
import type { AuthScreenProps } from '../../navigation/types';

type SignupErrors = { email?: string; password?: string };

export default function SignupScreen({ navigation }: AuthScreenProps<'Signup'>) {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const showToast = useToast();
  const { t } = useTranslation('auth');
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<SignupErrors>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validate = () => {
    const next: SignupErrors = {};
    if (!email.trim()) next.email = t('signup.errorEmailRequired');
    if (!password) next.password = t('signup.errorPasswordRequired');
    else if (password.length < 6) next.password = t('signup.errorPasswordLength');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { alreadyRegistered } = await signUpWithEmail(email.trim(), password);
      if (alreadyRegistered) {
        setErrors({ email: t('signup.errorAlreadyRegistered') });
        showToast(t('signup.errorAlreadyRegistered'), 'error');
        return;
      }
      navigation.navigate('ConfirmEmail', { email: email.trim() });
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('signup.errorSignUp'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('signup.errorGoogle'), 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      scene="signup"
      title={t('signup.title')}
      subtitle={t('signup.subtitle')}
      footer={
        <>
          <Text style={{ fontFamily: typography.family.regular, fontSize: 14, color: colors.textMuted }}>
            {t('signup.haveAccount')}
          </Text>
          <DSButton title={t('signup.signIn')} variant="link" size="sm" onPress={() => navigation.navigate('Login')} />
        </>
      }
    >
      <DSInput
        label={t('signup.email')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('signup.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />

      <DSInput
        kind="password"
        label={t('signup.password')}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        error={errors.password}
        helper={errors.password ? undefined : t('signup.passwordHint')}
      />

      <DSButton title={t('signup.signUp')} size="lg" fullWidth onPress={handleSignup} loading={loading} />

      <OrDivider label={t('signup.or')} />

      <DSButton
        title={t('signup.continueWithGoogle')}
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
