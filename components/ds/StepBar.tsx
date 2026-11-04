import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';

const f = typography.family;

function Segment({ filled }: { filled: boolean }) {
  const { scheme } = useTheme();
  const w = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    w.value = withSpring(filled ? 1 : 0, { damping: 18, stiffness: 160 });
  }, [filled, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={[styles.seg, { backgroundColor: scheme === 'dark' ? '#262626' : '#E2E8F0' }]}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

/** Wizard progress: "Step 2 of 3 · Photos" over a row of segments that fill in. */
export function DSStepBar({ step, total, title, stepLabel }: { step: number; total: number; title: string; stepLabel: string }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontFamily: f.semibold, fontSize: 13, color: primary[600] }}>
        {stepLabel} · {title}
      </Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => (
          <Segment key={i} filled={i <= step} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seg: { flex: 1, height: 6, borderRadius: 9999, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 9999, backgroundColor: primary[600] },
});
