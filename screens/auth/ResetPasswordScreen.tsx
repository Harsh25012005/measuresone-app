import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../../components/ds/AuthLayout';
import { DSButton } from '../../components/ds/Button';
import { DSInput } from '../../components/ds/Input';
import { useToast } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

type ResetPasswordErrors = { password?: string; confirmPassword?: string };

export default function ResetPasswordScreen() {
  const { completePasswordReset } = useAuth();
  const showToast = useToast();
  const { t } = useTranslation('auth');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: ResetPasswordErrors = {};
    if (!password) next.password = t('resetPassword.errorPasswordRequired');
    else if (password.length < 6) next.password = t('resetPassword.errorPasswordLength');
    if (confirmPassword !== password) next.confirmPassword = t('resetPassword.errorPasswordMismatch');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await completePasswordReset(password);
      showToast(t('resetPassword.success'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('resetPassword.errorSave'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout scene="reset" title={t('resetPassword.title')} subtitle={t('resetPassword.instructions')}>
      <DSInput
        kind="password"
        label={t('resetPassword.password')}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        error={errors.password}
      />

      <DSInput
        kind="password"
        label={t('resetPassword.confirmPassword')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="••••••••"
        error={errors.confirmPassword}
      />

      <DSButton title={t('resetPassword.save')} size="lg" fullWidth onPress={handleSave} loading={loading} />
    </AuthLayout>
  );
}
