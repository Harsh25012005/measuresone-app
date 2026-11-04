import { Modal, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, LogoMark, Text } from '../src/components/ui';
import { usePalette } from '../src/theme/usePalette';
import { useReducedMotion } from '../src/theme/useReducedMotion';
import { useTheme } from '../context/ThemeContext';
import { useProductTour } from '../context/ProductTourContext';

export function ProductTourWelcome() {
  const { t } = useTranslation('settings');
  const { colors } = useTheme();
  const palette = usePalette();
  const reduced = useReducedMotion();
  const { step, next, finish } = useProductTour();

  return (
    <Modal visible={step === 'welcome'} transparent animationType={reduced ? 'none' : 'fade'} statusBarTranslucent>
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: palette.scrim }}>
        <View accessibilityViewIsModal className="w-full max-w-sm items-center rounded border border-line bg-surface p-6">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded bg-primary-50">
            <LogoMark size={36} color={colors.primary} />
          </View>
          <Text variant="title" className="mb-1 text-center" accessibilityRole="header">
            {t('appGuide.welcome.title', { defaultValue: 'Welcome to TrueFit' })}
          </Text>
          <Text variant="body" tone="muted" className="mb-6 text-center">
            {t('appGuide.welcome.subtitle', {
              defaultValue:
                'Take a quick 1-minute tour to see how to manage orders, measurements, and customer records effortlessly.',
            })}
          </Text>
          <Button title={t('appGuide.welcome.cta', { defaultValue: 'Start tour' })} onPress={next} />
          <Button
            title={t('appGuide.skip', { defaultValue: 'Skip tour' })}
            variant="ghost"
            onPress={finish}
            className="mt-2"
          />
        </View>
      </View>
    </Modal>
  );
}
