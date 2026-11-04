import { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, GoogleIcon, InputField, Text, useToast } from '../../src/components/ui';
import { useAuth } from '../../context/AuthContext';
import { AuthDivider, AuthLayout } from './AuthLayout';
import type { AuthScreenProps } from '../../navigation/types';

type SignupErrors = { email?: string; password?: string };

export default function SignupScreen({ navigation }: AuthScreenProps<'Signup'>) {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const showToast = useToast();
  const { t } = useTranslation('auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<SignupErrors>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const validate = () => {
    const next: SignupErrors = {};
    if (!email.trim()) next.email = t('signup.errorEmailRequired', { defaultValue: 'Email is required' });
    if (!password) next.password = t('signup.errorPasswordRequired', { defaultValue: 'Password is required' });
    else if (password.length < 6) next.password = t('signup.errorPasswordLength', { defaultValue: 'Password must be at least 6 characters' });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { alreadyRegistered } = await signUpWithEmail(email.trim(), password);
      if (alreadyRegistered) {
        const text = t('signup.errorAlreadyRegistered', { defaultValue: 'This email is already registered' });
        setErrors({ email: text });
        showToast(text, 'error');
        return;
      }
      navigation.navigate('ConfirmEmail', { email: email.trim() });
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('signup.errorSignUp', { defaultValue: 'Sign up failed' }), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('signup.errorGoogle', { defaultValue: 'Google sign-up failed' }), 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      showLanguage
      title={t('signup.title', { defaultValue: 'Create Account' })}
      subtitle={t('signup.subtitle', { defaultValue: 'Set up your shop in a few steps' })}
      footer={
        <>
          <Text variant="body" tone="muted">
            {t('signup.haveAccount')}{' '}
          </Text>
          <Button
            title={t('signup.signIn', { defaultValue: 'Sign in' })}
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={() => navigation.navigate('Login')}
          />
        </>
      }
    >
      <InputField
        label={t('signup.email', { defaultValue: 'Email address' })}
        value={email}
        onChangeText={setEmail}
        placeholder="tailor@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={errors.email}
      />

      <InputField
        ref={passwordRef}
        label={t('signup.password', { defaultValue: 'Password (min. 6 characters)' })}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={handleSignup}
        error={errors.password}
      />

      <Button title={t('signup.signUp', { defaultValue: 'Create account' })} onPress={handleSignup} loading={loading} />

      <AuthDivider label={t('signup.or', { defaultValue: 'or' })} />

      <Button
        title={t('signup.continueWithGoogle', { defaultValue: 'Continue with Google' })}
        variant="google"
        onPress={handleGoogle}
        loading={googleLoading}
        icon={<GoogleIcon size={18} />}
      />
    </AuthLayout>
  );
}
