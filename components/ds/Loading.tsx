import { useEffect, useId, useState } from 'react';
import { StyleSheet, Text, View, type DimensionValue, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';

const f = typography.family;

// ───────────────────────────────── Skeleton

/** One shimmering placeholder block. Fully rounded unless `radius` says otherwise. */
export function DSSkeleton({
  width = '100%',
  height = 14,
  radius = 9999,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: object;
}) {
  const { scheme } = useTheme();
  const dark = scheme === 'dark';
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [w, setW] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(x);
  }, [x]);

  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: -w + x.value * w * 2 }] }));
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      style={[{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: dark ? '#1F1F1F' : '#E8EDF3' }, style]}
    >
      {w > 0 ? (
        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: w }, sweep]}>
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id={`s${uid}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={dark ? '#FFFFFF' : '#FFFFFF'} stopOpacity="0" />
                <Stop offset="0.5" stopColor={dark ? '#FFFFFF' : '#FFFFFF'} stopOpacity={dark ? 0.08 : 0.7} />
                <Stop offset="1" stopColor={dark ? '#FFFFFF' : '#FFFFFF'} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect width={w} height={height} fill={`url(#s${uid})`} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Placeholder rows that mirror the client / order list rows. */
export function DSSkeletonList({ rows = 5, circle = 44 }: { rows?: number; circle?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.listShell, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i}>
          <View style={styles.listRow}>
            <DSSkeleton width={circle} height={circle} />
            <View style={{ flex: 1, gap: 8 }}>
              <DSSkeleton width={`${55 + ((i * 13) % 30)}%`} height={14} />
              <DSSkeleton width={`${35 + ((i * 7) % 25)}%`} height={11} />
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <DSSkeleton width={56} height={14} />
              <DSSkeleton width={44} height={18} />
            </View>
          </View>
          {i < rows - 1 ? <View style={[styles.hair, { backgroundColor: colors.borderSubtle }]} /> : null}
        </View>
      ))}
    </View>
  );
}

/** Placeholder for a stat / summary card. */
export function DSSkeletonCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
      <DSSkeleton width={90} height={12} />
      <DSSkeleton width={150} height={28} radius={12} style={{ marginTop: 12 }} />
      <DSSkeleton width="100%" height={72} radius={16} style={{ marginTop: 16 }} />
    </View>
  );
}

// ───────────────────────────────── Spinner

const SPIN_SIZES = { sm: 16, md: 28, lg: 44 } as const;

/** Rotating arc spinner. */
export function DSSpinner({
  size = 'md',
  color = primary[600],
}: {
  size?: keyof typeof SPIN_SIZES;
  color?: string;
}) {
  const px = SPIN_SIZES[size];
  const stroke = Math.max(2, px / 9);
  const r = (px - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const rot = useSharedValue(0);

  useEffect(() => {
    rot.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rot);
  }, [rot]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value * 360}deg` }] }));

  const len = circ * 0.28;
  return (
    <Animated.View style={[{ width: px, height: px }, spin]} accessibilityRole="progressbar">
      <Svg width={px} height={px}>
        <Circle cx={px / 2} cy={px / 2} r={r} stroke={color} strokeOpacity={0.18} strokeWidth={stroke} fill="none" />
        <Circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${len} ${circ}`}
        />
      </Svg>
    </Animated.View>
  );
}

/** Three bouncing dots — for inline "typing" / "thinking" feedback. */
export function DSDots({ color = primary[600], size = 8 }: { color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: size * 0.7, alignItems: 'center', height: size * 2.2 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 140} color={color} size={size} />
      ))}
    </View>
  );
}

function Dot({ delay, color, size }: { delay: number; color: string; size: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(-size * 0.7, { duration: 280 }), withTiming(0, { duration: 280 }), withTiming(0, { duration: 300 })), -1),
    );
    return () => cancelAnimation(y);
  }, [delay, size, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: 9999, backgroundColor: color }, style]} />;
}

/** Full-area loader with an optional label (screen / sheet while data loads). */
export function DSLoadingOverlay({ label, fill = true }: { label?: string; fill?: boolean }) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      style={[fill ? StyleSheet.absoluteFill : { paddingVertical: 40 }, styles.overlay, { backgroundColor: colors.bgPage }]}
    >
      <DSSpinner size="lg" />
      {label ? <Text style={{ fontFamily: f.medium, fontSize: 14, color: colors.textMuted, marginTop: 14 }}>{label}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  listShell: { borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  hair: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  card: { borderWidth: 1, borderRadius: 24, padding: 16 },
  overlay: { alignItems: 'center', justifyContent: 'center' },
});
