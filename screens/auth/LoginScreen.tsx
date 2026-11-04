import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, GoogleIcon, InputField, Text, useToast } from '../../src/components/ui';
import { useAuth } from '../../context/AuthContext';
import { AuthDivider, AuthLayout } from './AuthLayout';
import type { AuthScreenProps } from '../../navigation/types';

export default function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const showToast = useToast();
  const { t } = useTranslation('auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = t('login.errorEmailRequired', { defaultValue: 'Email is required' });
    if (!password) next.password = t('login.errorPasswordRequired', { defaultValue: 'Password is required' });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (/email not confirmed|not confirmed/i.test(message)) {
        navigation.navigate('ConfirmEmail', { email: email.trim() });
        return;
      }

      if (/invalid login credentials|invalid_credentials/i.test(message)) {
        const text = t('login.errorNoAccountOrPassword', { defaultValue: 'Invalid credentials or no account found' });
        setErrors({ password: text });
        showToast(text, 'error');
        return;
      }

      showToast(message || t('login.errorSignIn', { defaultValue: 'Sign in failed' }), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('login.errorGoogle', { defaultValue: 'Google sign-in failed' }), 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      showLanguage
      title={t('login.welcome', { defaultValue: 'Welcome back' })}
      subtitle={t('login.subtitle', { defaultValue: 'Sign in to manage your shop' })}
      footer={
        <>
          <Text variant="body" tone="muted">
            {t('login.noAccount', { defaultValue: "Don't have an account?" })}{' '}
          </Text>
          <Button
            title={t('login.signUp', { defaultValue: 'Sign up' })}
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={() => navigation.navigate('Signup')}
          />
        </>
      }
    >
      <InputField
        label={t('login.email', { defaultValue: 'Email address' })}
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
        label={t('login.password', { defaultValue: 'Password' })}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
        error={errors.password}
        className="mb-1"
      />

      <View className="mb-4 items-end">
        <Button
          title={t('login.forgotPassword', { defaultValue: 'Forgot password?' })}
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => navigation.navigate('ForgotPassword')}
        />
      </View>

      <Button title={t('login.signIn', { defaultValue: 'Sign in' })} onPress={handleLogin} loading={loading} />

      <AuthDivider label={t('login.or', { defaultValue: 'or' })} />

      <Button
        title={t('login.continueWithGoogle', { defaultValue: 'Continue with Google' })}
        variant="google"
        onPress={handleGoogle}
        loading={googleLoading}
        icon={<GoogleIcon size={18} />}
      />
    </AuthLayout>
  );
}
