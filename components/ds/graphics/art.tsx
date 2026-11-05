import { useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { typography } from '../../../constants/tokens';

const f = typography.family;
const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Hand-drawn tailoring illustrations (dress form, tape, scissors, shirt, spool, coins…)
 * for the onboarding and sign-in screens. Everything is flat SVG with a soft shadow, and
 * every piece moves for a reason: the tape wraps, the scissors snip, the thread stitches.
 */

// ───────────────────────────────── motion helpers

/** 0 → 1 loop with an optional hold; the value to feed animated styles/props. */
export function useLoop({ duration = 1800, hold = 1200, reset = 300, delay = 0 }: { duration?: number; hold?: number; reset?: number; delay?: number } = {}) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) }),
          withTiming(1, { duration: hold }),
          withTiming(0, { duration: reset, easing: Easing.in(Easing.quad) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(v);
  }, [delay, duration, hold, reset, v]);
  return v;
}

/** Hangs from its top edge and swings like a garment tag. */
export function Swing({
  children,
  height,
  amp = 7,
  duration = 2400,
  delay = 0,
  style,
}: {
  children: ReactNode;
  height: number;
  amp?: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(v);
  }, [delay, duration, v]);
  const s = useAnimatedStyle(() => ({
    transform: [{ translateY: -height / 2 }, { rotate: `${(v.value - 0.5) * 2 * amp}deg` }, { translateY: height / 2 }],
  }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/** Gentle bob, for things that sit on the scene. */
export function Bob({ children, amp = 4, duration = 2600, delay = 0, style }: { children: ReactNode; amp?: number; duration?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(v);
  }, [delay, duration, v]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: (v.value - 0.5) * 2 * amp }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/** Springs in once. */
export function Appear({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 150 }));
  }, [delay, v]);
  const s = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 1.6), transform: [{ scale: 0.6 + 0.4 * v.value }, { translateY: (1 - v.value) * 14 }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

// ───────────────────────────────── dress form

const TORSO =
  'M46 32 C46 24 53 18 60 18 C67 18 74 24 74 32 C94 36 106 46 104 64 C103 82 94 96 92 112 C91 128 98 140 98 152 L22 152 C22 140 29 128 28 112 C26 96 17 82 16 64 C14 46 26 36 46 32 Z';
// the tape: round the waist, then a loose end hanging down
const TAPE = 'M19 108 Q60 132 99 109 C111 104 115 128 106 150';

/** A tailor's dress form on a stand (viewBox 120 × 220). */
export function Mannequin({ width = 120 }: { width?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={width} height={(width * 220) / 120} viewBox="0 0 120 220">
      <Defs>
        <LinearGradient id={`b${uid}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.6" stopColor="#E6EFFF" />
          <Stop offset="1" stopColor="#B7CDFA" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="60" cy="209" rx="38" ry="7" fill="#0B1B4D" opacity="0.28" />
      <Path d="M28 203 Q60 216 92 203 L86 196 Q60 203 34 196 Z" fill="#DCE6F8" />
      <Rect x="57" y="150" width="6" height="48" rx="3" fill="#E9EFFA" />
      <Path d={TORSO} fill={`url(#b${uid})`} stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={1.4} />
      <Path d="M60 24 L60 152" stroke="#9DB8F5" strokeWidth={1.2} strokeDasharray="3 4" />
      <Path d="M33 64 Q47 80 60 78 Q73 80 87 64" stroke="#9DB8F5" strokeWidth={1.2} fill="none" />
      <Path d="M29 112 Q60 122 91 112" stroke="#9DB8F5" strokeWidth={1.2} fill="none" />
      <Ellipse cx="60" cy="19" rx="9" ry="4.5" fill="#A9C3FA" />
      <Rect x="58" y="5" width="4" height="11" rx="2" fill="#E9EFFA" />
      <Circle cx="60" cy="5" r="4" fill="#E9EFFA" />
    </Svg>
  );
}

/** Yellow measuring tape that wraps the form's waist as `progress` goes 0 → 1. */
export function TapeWrap({ width = 120, progress }: { width?: number; progress: { value: number } }) {
  const L = 190;
  const draw = useAnimatedProps(() => ({ strokeDashoffset: L * (1 - Math.min(1, progress.value * 1.15)) }));
  const ticks = useAnimatedProps(() => ({ strokeOpacity: Math.max(0, (progress.value - 0.65) / 0.35) * 0.7 }));
  return (
    <Svg width={width} height={(width * 220) / 120} viewBox="0 0 120 220" style={StyleSheet.absoluteFill}>
      <AnimatedPath d={TAPE} stroke="#B45309" strokeOpacity={0.3} strokeWidth={11} strokeLinecap="round" fill="none" strokeDasharray={`${L} ${L}`} animatedProps={draw} transform="translate(0 3)" />
      <AnimatedPath d={TAPE} stroke="#FBBF24" strokeWidth={9} strokeLinecap="round" fill="none" strokeDasharray={`${L} ${L}`} animatedProps={draw} />
      <AnimatedPath d={TAPE} stroke="#92400E" strokeWidth={9} fill="none" strokeDasharray="1.2 5" animatedProps={ticks} />
    </Svg>
  );
}

// ───────────────────────────────── shirt

const SHIRT = 'M45 8 L20 20 L2 52 L24 62 L34 46 L34 120 L106 120 L106 46 L116 62 L138 52 L120 20 L95 8 C90 20 80 26 70 26 C60 26 50 20 45 8 Z';

/** Flat shirt (viewBox 140 × 130) with stitching that draws on as `progress` goes 0 → 1. */
export function Shirt({ width = 190, progress }: { width?: number; progress: { value: number } }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const collar = useAnimatedProps(() => ({ strokeDashoffset: 60 * (1 - Math.min(1, progress.value * 1.6)) }));
  const hem = useAnimatedProps(() => ({ strokeDashoffset: 72 * (1 - progress.value) }));
  const placket = useAnimatedProps(() => ({ strokeDashoffset: 90 * (1 - Math.max(0, Math.min(1, (progress.value - 0.2) * 1.4))) }));
  return (
    <Svg width={width} height={(width * 130) / 140} viewBox="0 0 140 130">
      <Defs>
        <LinearGradient id={`s${uid}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#CFE0FF" />
        </LinearGradient>
      </Defs>
      <Path d={SHIRT} fill="#0B1B4D" opacity={0.22} transform="translate(0 5)" />
      <Path d={SHIRT} fill={`url(#s${uid})`} stroke="#FFFFFF" strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M45 8 L70 42 L95 8" fill="none" stroke="#B7CDFA" strokeWidth={1.4} />
      <AnimatedPath d="M45 8 L70 42 L95 8" fill="none" stroke="#2563EB" strokeWidth={2} strokeLinecap="round" strokeDasharray="60 60" animatedProps={collar} />
      <AnimatedPath d="M70 44 L70 120" fill="none" stroke="#2563EB" strokeWidth={1.8} strokeLinecap="round" strokeDasharray="4 5" animatedProps={placket} />
      <AnimatedPath d="M38 112 L102 112" fill="none" stroke="#2563EB" strokeWidth={2} strokeLinecap="round" strokeDasharray="72 72" animatedProps={hem} />
      {[58, 76, 94].map((y) => (
        <G key={y}>
          <Circle cx="70" cy={y} r="3.2" fill="#FFFFFF" stroke="#93B4F8" strokeWidth={1} />
          <Circle cx="69" cy={y} r="0.7" fill="#93B4F8" />
          <Circle cx="71" cy={y} r="0.7" fill="#93B4F8" />
        </G>
      ))}
    </Svg>
  );
}

// ───────────────────────────────── small props

/** Scissors whose blades open and close in short bursts. `size` is the box of each blade (60 units). */
export function Scissors({ size = 64 }: { size?: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 180 }),
        withTiming(0, { duration: 180 }),
        withTiming(1, { duration: 180 }),
        withTiming(0, { duration: 180 }),
        withDelay(1700, withTiming(0, { duration: 1 })),
      ),
      -1,
    );
    return () => cancelAnimation(v);
  }, [v]);
  const top = useAnimatedStyle(() => ({ transform: [{ rotate: `${-4 - v.value * 14}deg` }] }));
  const bottom = useAnimatedStyle(() => ({ transform: [{ rotate: `${4 + v.value * 14}deg` }] }));
  const blade = (flip: boolean) => (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <G transform={flip ? 'translate(60 0) scale(-1 1)' : undefined}>
        <Path d="M30 30 L52 5 L56 9 L36 34 Z" fill="#F1F5FF" stroke="#C7D6F5" strokeWidth={0.8} />
        <Path d="M31 30 L24 40" stroke="#E2E8F0" strokeWidth={4} strokeLinecap="round" />
        <Circle cx="17" cy="47" r="9" fill="none" stroke="#FBBF24" strokeWidth={4.2} />
      </G>
    </Svg>
  );
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, top]}>{blade(false)}</Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, bottom]}>{blade(true)}</Animated.View>
      <View style={{ position: 'absolute', left: size / 2 - 3, top: size / 2 - 3, width: 6, height: 6, borderRadius: 9999, backgroundColor: '#64748B' }} />
    </View>
  );
}

/** A spool of thread that slowly turns while thread sways off it. */
export function Spool({ size = 52, color = '#F43F5E' }: { size?: number; color?: string }) {
  const sway = useSharedValue(0);
  useEffect(() => {
    sway.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(sway);
  }, [sway]);
  const thread = useAnimatedProps(() => ({ strokeDashoffset: -sway.value * 10 }));
  const rot = useAnimatedStyle(() => ({ transform: [{ rotate: `${(sway.value - 0.5) * 10}deg` }] }));
  return (
    <Animated.View style={[{ width: size, height: size * 1.25 }, rot]}>
      <Svg width={size} height={size * 1.25} viewBox="0 0 40 50">
        <Rect x="4" y="2" width="32" height="7" rx="3.5" fill="#F8FAFF" />
        <Rect x="4" y="41" width="32" height="7" rx="3.5" fill="#F8FAFF" />
        <Rect x="8" y="9" width="24" height="32" rx="3" fill={color} />
        {[14, 19, 24, 29, 34].map((y) => (
          <Path key={y} d={`M8 ${y} L32 ${y - 2}`} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.2} />
        ))}
        <AnimatedPath d="M32 38 C42 38 40 49 30 49" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeDasharray="4 3" animatedProps={thread} />
      </Svg>
    </Animated.View>
  );
}

/** Sewing button that turns. */
export function SewButton({ size = 34 }: { size?: number }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(r);
  }, [r]);
  const s = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value * 360}deg` }] }));
  return (
    <Animated.View style={[{ width: size, height: size }, s]}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Circle cx="20" cy="20" r="18" fill="#FFFFFF" />
        <Circle cx="20" cy="20" r="13" fill="none" stroke="#C7D6F5" strokeWidth={1.6} />
        <Circle cx="15" cy="16" r="2.2" fill="#93B4F8" />
        <Circle cx="25" cy="16" r="2.2" fill="#93B4F8" />
        <Circle cx="15" cy="24" r="2.2" fill="#93B4F8" />
        <Circle cx="25" cy="24" r="2.2" fill="#93B4F8" />
      </Svg>
    </Animated.View>
  );
}

/** Sewing needle with its thread, travelling along a seam as `progress` goes 0 → 1. */
export function Needle({ progress, travel, style }: { progress: { value: number }; travel: number; style?: StyleProp<ViewStyle> }) {
  const s = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * travel }, { translateY: Math.sin(progress.value * Math.PI * 10) * 2.5 }, { rotate: '-28deg' }],
  }));
  return (
    <Animated.View style={[{ width: 74, height: 20 }, style, s]}>
      <Svg width={74} height={20} viewBox="0 0 74 20">
        <Path d="M0 10 C10 4 16 16 26 10" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={1.6} fill="none" />
        <Path d="M24 10 L70 10" stroke="#E2E8F0" strokeWidth={2.4} strokeLinecap="round" />
        <Ellipse cx="28" cy="10" rx="3" ry="1.6" fill="none" stroke="#94A3B8" strokeWidth={1} />
        <Path d="M66 10 L73 10" stroke="#94A3B8" strokeWidth={1.4} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

/** A hang-tag: string, punched hole and a label/value. */
export function Tag({ label, value, accent = '#2563EB' }: { label: string; value: string; accent?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 1.5, height: 16, backgroundColor: 'rgba(255,255,255,0.85)' }} />
      <View
        style={{
          width: 74,
          paddingTop: 12,
          paddingBottom: 9,
          alignItems: 'center',
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
          shadowColor: '#0B1B4D',
          shadowOpacity: 0.25,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <View style={{ position: 'absolute', top: 5, width: 8, height: 8, borderRadius: 9999, backgroundColor: '#DCE6F8' }} />
        <Text style={{ fontFamily: f.medium, fontSize: 10, color: '#64748B' }}>{label}</Text>
        <Text style={{ fontFamily: f.bold, fontSize: 21, lineHeight: 26, color: accent }}>{value}</Text>
      </View>
    </View>
  );
}

/** Gold coin with a rupee mark. */
export function Coin({ size = 46 }: { size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 50 50">
        <Defs>
          <RadialGradient id={`c${uid}`} cx="35%" cy="30%" r="80%">
            <Stop offset="0" stopColor="#FEF3C7" />
            <Stop offset="0.5" stopColor="#FBBF24" />
            <Stop offset="1" stopColor="#D97706" />
          </RadialGradient>
        </Defs>
        <Circle cx="25" cy="25" r="24" fill={`url(#c${uid})`} />
        <Circle cx="25" cy="25" r="18.5" fill="none" stroke="#B45309" strokeOpacity={0.45} strokeWidth={1.6} />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: f.bold, fontSize: size * 0.46, color: '#92400E' }}>₹</Text>
      </View>
    </View>
  );
}

/** Paper receipt with a stitched border and a torn bottom edge. */
export function Receipt({ width = 150, height = 200, children }: { width?: number; height?: number; children?: ReactNode }) {
  return (
    <View style={{ width, height }}>
      <View
        style={{
          flex: 1,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          backgroundColor: '#FFFFFF',
          shadowColor: '#0B1B4D',
          shadowOpacity: 0.28,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 12 },
          elevation: 10,
        }}
      >
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Rect x="7" y="7" width={width - 14} height={height - 18} rx="11" fill="none" stroke="#C7D6F5" strokeWidth={1.2} strokeDasharray="4 4" />
        </Svg>
        {children}
      </View>
      <Svg width={width} height={10} viewBox={`0 0 ${width} 10`} style={{ position: 'absolute', bottom: -9, left: 0 }}>
        <Path d={`M0 0 H${width} ${Array.from({ length: Math.floor(width / 10) }, (_, i) => `L${width - i * 10 - 5} 9 L${width - (i + 1) * 10} 0`).join(' ')} Z`} fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

/** Soft backdrop: a glow and two slow-drifting stitched seams — no dot grid, no rings. */
export function Backdrop({ width, height }: { width: number; height: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const drift = useSharedValue(0);
  useEffect(() => {
    // static: continuously animating SVG dash offsets forces a native re-commit every frame
    drift.value = 0.35;
  }, [drift]);
  const a = useAnimatedProps(() => ({ strokeDashoffset: -drift.value * 28 }));
  const b = useAnimatedProps(() => ({ strokeDashoffset: drift.value * 28 }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={`g${uid}`} cx="50%" cy="48%" r="52%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={width / 2} cy={height / 2} r={Math.min(width, height) * 0.52} fill={`url(#g${uid})`} />
        <AnimatedPath d={`M-10 ${height * 0.74} C ${width * 0.25} ${height * 0.5}, ${width * 0.6} ${height * 0.98}, ${width + 10} ${height * 0.62}`} stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1.6} strokeDasharray="7 7" fill="none" animatedProps={a} />
        <AnimatedPath d={`M-10 ${height * 0.3} C ${width * 0.3} ${height * 0.5}, ${width * 0.65} ${height * 0.05}, ${width + 10} ${height * 0.3}`} stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={1.4} strokeDasharray="5 8" fill="none" animatedProps={b} />
      </Svg>
    </View>
  );
}
