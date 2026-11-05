import { useEffect } from 'react';
import { View, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

function Word({ word, index, baseDelay, style, accent, accentColor, gap }: {
  word: string;
  index: number;
  baseDelay: number;
  style: TextStyle;
  accent: boolean;
  accentColor?: string;
  gap: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(baseDelay + index * 45, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, [baseDelay, index, p]);
  const s = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.4),
    transform: [{ translateY: (1 - p.value) * 20 }, { scale: 0.94 + 0.06 * p.value }],
  }));
  return (
    <Animated.Text style={[style, { marginRight: gap }, accent && accentColor ? { color: accentColor } : null, s]}>{word}</Animated.Text>
  );
}

/**
 * Headline whose words rise into place one after another. Remount it (change
 * `key`) to replay the animation, e.g. when a carousel page changes.
 * The last `accentCount` words can take an accent colour.
 */
export function AnimatedWords({
  text,
  style,
  accentCount = 0,
  accentColor,
  baseDelay = 0,
  align = 'left',
}: {
  text: string;
  style: TextStyle;
  accentCount?: number;
  accentColor?: string;
  baseDelay?: number;
  align?: 'left' | 'center';
}) {
  const words = text.split(' ').filter(Boolean);
  const gap = (style.fontSize ?? 28) * 0.26;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
      {words.map((w, i) => (
        <Word
          key={`${w}-${i}`}
          word={w}
          index={i}
          baseDelay={baseDelay}
          style={style}
          accent={i >= words.length - accentCount}
          accentColor={accentColor}
          gap={gap}
        />
      ))}
    </View>
  );
}
