import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../src/components/ui/Icon';
import { Text } from '../../src/components/ui/Text';
import { usePalette } from '../../src/theme/usePalette';
import { useReducedMotion } from '../../src/theme/useReducedMotion';
import { radius } from '../../src/theme/tokens';

export type VoiceListeningOverlayProps = {
  visible: boolean;
  /** Called when the user taps out — should stop the recognizer. */
  onStop: () => void;
  label: string;
  hint: string;
};

/**
 * Full-screen "Listening…" popup shown while voice dictation is active, so the
 * mic gives unmistakable feedback to someone glancing at the phone mid-sentence.
 * The pulse is skipped when the OS asks for reduced motion.
 */
export function VoiceListeningOverlay({ visible, onStop, label, hint }: VoiceListeningOverlayProps) {
  const palette = usePalette();
  const reduced = useReducedMotion();
  const { t } = useTranslation('common');
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!visible || reduced) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [visible, reduced, pulse]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onStop}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${t('actions.close')}`}
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: palette.scrim }}
        onPress={onStop}
      >
        <View accessibilityLiveRegion="polite" className="items-center gap-4 rounded border border-line bg-surface px-10 py-8">
          <Animated.View
            className="items-center justify-center"
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.lg,
              backgroundColor: palette.danger,
              transform: [{ scale: pulse }],
            }}
          >
            <Icon name="mic" size={28} color={palette.background} />
          </Animated.View>
          <Text variant="bodyLg">{label}</Text>
          <Text variant="label" tone="muted" weight="regular">
            {hint}
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}
