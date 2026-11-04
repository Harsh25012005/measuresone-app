import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { typography } from '../../../constants/tokens';
import type { TablerIcon } from '../icons';

const f = typography.family;

// ───────────────────────────────── motion helpers

/** Gently bobs its children up/down (and optionally tilts them), forever. */
export function Float({
  children,
  delay = 0,
  amp = 6,
  duration = 2800,
  tilt = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  amp?: number;
  duration?: number;
  tilt?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(v);
  }, [delay, duration, v]);
  const s = useAnimatedStyle(() => ({
    transform: [{ translateY: (v.value - 0.5) * 2 * amp }, { rotate: `${(v.value - 0.5) * 2 * tilt}deg` }],
  }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/** Springs in (scale + fade) after `delay`, then stays. */
export function PopIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withSpring(1, { damping: 11, stiffness: 160 }));
  }, [delay, v]);
  const s = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 1.5), transform: [{ scale: 0.4 + 0.6 * v.value }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/** Four-point sparkle that twinkles. */
export function Sparkle({ x, y, size = 14, delay = 0, color = '#FFFFFF' }: { x: number; y: number; size?: number; delay?: number; color?: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0.15, { duration: 900 })), -1),
    );
    return () => cancelAnimation(v);
  }, [delay, v]);
  const s = useAnimatedStyle(() => ({ opacity: 0.3 + 0.7 * v.value, transform: [{ scale: 0.55 + 0.6 * v.value }, { rotate: `${v.value * 45}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }, s]}>
      <Svg width={size} height={size} viewBox="-1 -1 2 2">
        <Path
          d="M0,-1 C0.12,-0.2 0.2,-0.12 1,0 C0.2,0.12 0.12,0.2 0,1 C-0.12,0.2 -0.2,0.12 -1,0 C-0.2,-0.12 -0.12,-0.2 0,-1Z"
          fill={color}
        />
      </Svg>
    </Animated.View>
  );
}

// ───────────────────────────────── surfaces

/** Frosted tile with an icon — sits on the blue hero gradient. */
export function GlassTile({
  icon: Icon,
  size = 64,
  radius,
  solid = false,
  iconColor,
  accent = '#2563EB',
  style,
}: {
  icon: TablerIcon;
  size?: number;
  radius?: number;
  /** White elevated tile with a coloured icon instead of frosted glass. */
  solid?: boolean;
  iconColor?: string;
  accent?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const r = radius ?? size * 0.3;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: solid ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
          borderWidth: 1,
          borderColor: solid ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
          shadowColor: '#0B1B4D',
          shadowOpacity: solid ? 0.22 : 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        },
        style,
      ]}
    >
      <Icon size={size * 0.46} color={iconColor ?? (solid ? accent : '#FFFFFF')} strokeWidth={1.8} />
    </View>
  );
}

/** White elevated card used for the mini "app UI" in the illustrations. */
export function MiniCard({
  width,
  height,
  children,
  style,
  radius = 22,
}: {
  width: number;
  height: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: '#FFFFFF',
          shadowColor: '#0B1B4D',
          shadowOpacity: 0.25,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 14 },
          elevation: 10,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Bar({ w, h = 8, color = '#E2E8F0', style }: { w: number | `${number}%`; h?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: w, height: h, borderRadius: 9999, backgroundColor: color }, style]} />;
}

export function Chip({ label, bg, fg, size = 11 }: { label: string; bg: string; fg: string; size?: number }) {
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 9, height: size + 12, borderRadius: 9999, backgroundColor: bg, justifyContent: 'center' }}>
      <Text style={{ fontFamily: f.semibold, fontSize: size, color: fg }}>{label}</Text>
    </View>
  );
}

export function CircleBadge({ icon: Icon, size = 28, bg = '#22C55E', color = '#FFFFFF' }: { icon: TablerIcon; size?: number; bg?: string; color?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }}
    >
      <Icon size={size * 0.55} color={color} strokeWidth={2.4} />
    </View>
  );
}

// ───────────────────────────────── backdrop

/** Rings, dot grid and soft glows behind a scene. Rings rotate slowly. */
export function SceneBackdrop({ width, height }: { width: number; height: number }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(1, { duration: 42000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rot);
  }, [rot]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value * 360}deg` }] }));
  const cx = width / 2;
  const cy = height / 2;
  const dots: ReactNode[] = [];
  for (let gx = 0; gx < 11; gx++) {
    for (let gy = 0; gy < 8; gy++) {
      dots.push(<Circle key={`${gx}-${gy}`} cx={14 + gx * ((width - 28) / 10)} cy={12 + gy * ((height - 24) / 7)} r={1.3} fill="#FFFFFF" fillOpacity={0.14} />);
    }
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.38" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {dots}
        <Circle cx={cx} cy={cy} r={Math.min(width, height) * 0.5} fill="url(#glow)" />
        <Circle cx={cx} cy={cy} r={Math.min(width, height) * 0.46} stroke="#FFFFFF" strokeOpacity={0.16} strokeWidth={1} fill="none" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, spin]}>
        <Svg width={width} height={height}>
          <Circle cx={cx} cy={cy} r={Math.min(width, height) * 0.36} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.2} strokeDasharray="3 9" fill="none" />
          <Circle cx={cx + Math.min(width, height) * 0.36} cy={cy} r={4} fill="#FFFFFF" fillOpacity={0.85} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ───────────────────────────────── measuring tape

/** A curved measuring tape with tick marks (yellow, as on a tailor's tape). */
export function Tape({ width = 280, height = 120 }: { width?: number; height?: number }) {
  const p0 = { x: 8, y: height * 0.85 };
  const p1 = { x: width * 0.3, y: -height * 0.1 };
  const p2 = { x: width * 0.7, y: height * 1.1 };
  const p3 = { x: width - 8, y: height * 0.2 };
  const at = (t: number) => {
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
  };
  const ticks: ReactNode[] = [];
  for (let i = 1; i < 40; i++) {
    const t = i / 40;
    const a = at(t);
    const b = at(t + 0.001);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const big = i % 5 === 0;
    const l = big ? 9 : 5;
    ticks.push(<Path key={i} d={`M${a.x - nx * 7} ${a.y - ny * 7} L${a.x - nx * (7 - l)} ${a.y - ny * (7 - l)}`} stroke="#92400E" strokeWidth={big ? 1.6 : 1} strokeOpacity={0.75} />);
  }
  const d = `M${p0.x} ${p0.y} C${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke="#B45309" strokeOpacity={0.35} strokeWidth={20} strokeLinecap="round" fill="none" transform="translate(0 4)" />
      <Path d={d} stroke="#FBBF24" strokeWidth={18} strokeLinecap="round" fill="none" />
      <Path d={d} stroke="#FDE68A" strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" fill="none" transform="translate(0 -4)" />
      {ticks}
    </Svg>
  );
}

// ───────────────────────────────── scene frame

/** Scales a fixed-size scene to whatever width the layout gives it. */
export function SceneFrame({ baseW, baseH, maxScale = 1.15, children }: { baseW: number; baseH: number; maxScale?: number; children: ReactNode }) {
  const [w, setW] = useState(0);
  const scale = w ? Math.min(maxScale, w / baseW) : 1;
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  return (
    <View onLayout={onLayout} style={{ width: '100%', height: baseH * scale, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: baseW, height: baseH, transform: [{ scale }] }}>{children}</View>
    </View>
  );
}
