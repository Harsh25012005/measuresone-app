import { useEffect, useId, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { primary, typography } from '../../constants/tokens';
import { IconMicrophone, IconSend } from './icons';

const f = typography.family;

const ORB_SHEET = require('../../assets/ds/ai-orb-sheet.png');
// Sprite sheet made from the orb clip: background keyed out to real transparency.
const SHEET = { cols: 13, rows: 12, frames: 150, fps: 15 } as const;

/**
 * Orb animation played from a transparent sprite sheet (the source video had
 * a solid backdrop, which can't be blended reliably on every platform).
 * One shared value steps through the frames on the UI thread.
 */
function AiOrb({ size = 44 }: { size?: number }) {
  const frame = useSharedValue(0);
  useEffect(() => {
    frame.value = 0;
    frame.value = withRepeat(
      withTiming(SHEET.frames, { duration: (SHEET.frames / SHEET.fps) * 1000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(frame);
  }, [frame]);

  const style = useAnimatedStyle(() => {
    const i = Math.floor(frame.value) % SHEET.frames;
    return {
      transform: [{ translateX: -(i % SHEET.cols) * size }, { translateY: -Math.floor(i / SHEET.cols) * size }],
    };
  });

  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }} pointerEvents="none">
      <Animated.Image
        source={ORB_SHEET}
        style={[{ width: SHEET.cols * size, height: SHEET.rows * size }, style]}
        resizeMode="stretch"
      />
    </View>
  );
}

export type DSAiAssistantProps = {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  /** Called with the typed text when the user sends. */
  onSend?: (text: string) => void;
  onMicPress?: () => void;
};

export function DSAiAssistant({
  title = 'Craig AI Assistant',
  subtitle = 'Some sentence with two lines.',
  placeholder = 'How can I help you?',
  onSend,
  onMicPress,
}: DSAiAssistantProps) {
  const gradId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [text, setText] = useState('');
  const hasText = text.trim().length > 0;
  const send = () => {
    if (!hasText) return;
    onSend?.(text.trim());
    setText('');
  };

  return (
    <View style={styles.card}>
      {/* Figma: transparent → black vertical fade on the dark surface */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#242424" />
            <Stop offset="1" stopColor="#000000" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradId})`} />
      </Svg>

      <View style={styles.header}>
        <View style={{ flex: 1, gap: 6, paddingTop: 4 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <AiOrb />
      </View>

      <View style={styles.input}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor="#7B7B7B"
          onSubmitEditing={send}
          returnKeyType="send"
          style={[styles.field, { outlineStyle: 'none' } as object]}
        />
        {hasText ? (
          <Pressable onPress={send} hitSlop={10} accessibilityLabel="Send" style={styles.micBtn}>
            <IconSend size={20} color={primary[400]} strokeWidth={2} />
          </Pressable>
        ) : (
          <Pressable onPress={onMicPress} hitSlop={10} accessibilityLabel="Voice input" style={styles.micBtn}>
            <IconMicrophone size={20} color="#7B7B7B" strokeWidth={2} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: 'hidden', padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontFamily: f.semibold, fontSize: 20, lineHeight: 27, color: '#FFFFFF', letterSpacing: -0.6 },
  subtitle: { fontFamily: f.medium, fontSize: 14, lineHeight: 16, color: '#7B7B7B', letterSpacing: -0.14 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingLeft: 14,
    paddingRight: 12,
    height: 44,
  },
  field: { flex: 1, fontFamily: f.medium, fontSize: 14, color: '#FFFFFF', letterSpacing: -0.14, padding: 0 },
  micBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
});
