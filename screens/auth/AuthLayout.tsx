import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Icon, IconButton, LogoMark, Text } from '../../src/components/ui';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useTheme } from '../../context/ThemeContext';

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Link row under the form ("Don't have an account? Sign up"). */
  footer?: ReactNode;
  /** Show the English / Gujarati / Hindi switch (first screens only). */
  showLanguage?: boolean;
  onBack?: () => void;
};

/** Single-purpose auth screen frame: brand, heading, one form, one primary button. */
export function AuthLayout({ title, subtitle, children, footer, showLanguage = false, onBack }: AuthLayoutProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation('common');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-[420px] flex-1 self-center px-6">
          <View className="mb-6 min-h-touch flex-row items-center">
            {onBack ? (
              <IconButton icon="back" onPress={onBack} accessibilityLabel={t('actions.back')} variant="ghost" className="-ml-3 mr-1" />
            ) : null}
            <View className="h-9 w-9 items-center justify-center rounded bg-primary-50">
              <LogoMark size={22} color={colors.primary} />
            </View>
            <Text variant="title" className="ml-2.5">
              True<Text variant="title" tone="primary">Fit</Text>
            </Text>
          </View>

          {showLanguage ? <LanguageSwitcher className="mb-6" /> : null}

          <Text variant="headline" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="muted" className="mb-6 mt-1">
              {subtitle}
            </Text>
          ) : (
            <View className="mb-6" />
          )}

          {children}

          {footer ? <View className="mt-6 flex-row flex-wrap items-center justify-center">{footer}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Centred icon tile used by "check your email" / "link sent" states. */
export function AuthStatusIcon({ name }: { name: string }) {
  const { colors } = useTheme();
  return (
    <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded bg-primary-50">
      <Icon name={name} size={30} color={colors.primary} />
    </View>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <View className="my-4 flex-row items-center">
      <View className="h-px flex-1 bg-line" />
      <Text variant="caption" tone="muted" className="mx-3">
        {label}
      </Text>
      <View className="h-px flex-1 bg-line" />
    </View>
  );
}
