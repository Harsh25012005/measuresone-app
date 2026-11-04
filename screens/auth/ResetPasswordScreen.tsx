import { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, InputField, useToast } from '../../src/components/ui';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from './AuthLayout';

type ResetPasswordErrors = { password?: string; confirmPassword?: string };

export default function ResetPasswordScreen() {
  const { completePasswordReset } = useAuth();
  const showToast = useToast();
  const { t } = useTranslation('auth');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [loading, setLoading] = useState(false);
  const confirmRef = useRef<TextInput>(null);

  const validate = () => {
    const next: ResetPasswordErrors = {};
    if (!password) next.password = t('resetPassword.errorPasswordRequired', { defaultValue: 'Password is required' });
    else if (password.length < 6) next.password = t('resetPassword.errorPasswordLength', { defaultValue: 'Password must be at least 6 characters' });
    if (confirmPassword !== password) next.confirmPassword = t('resetPassword.errorPasswordMismatch', { defaultValue: 'Passwords do not match' });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await completePasswordReset(password);
      showToast(t('resetPassword.success', { defaultValue: 'Password updated successfully' }), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('resetPassword.errorSave', { defaultValue: 'Could not reset password' }), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('resetPassword.title', { defaultValue: 'Create new password' })}
      subtitle={t('resetPassword.instructions', { defaultValue: 'Enter your new password below.' })}
    >
      <InputField
        label={t('resetPassword.password')}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        error={errors.password}
      />

      <InputField
        ref={confirmRef}
        label={t('resetPassword.confirmPassword', { defaultValue: 'Confirm new password' })}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        returnKeyType="done"
        onSubmitEditing={handleSave}
        error={errors.confirmPassword}
      />

      <Button title={t('resetPassword.save')} onPress={handleSave} loading={loading} />
    </AuthLayout>
  );
}
