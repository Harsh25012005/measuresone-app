import { useEffect, useId, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { primary, radii, typography } from '../../constants/tokens';
import { DSBadge, useBadgeTones } from './Badge';
import { IconTrendingDown, IconTrendingUp } from './icons';

const f = typography.family;

export type RevenuePoint = { label: string; value: number };

const rupee = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const compact = (n: number) => {
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${+(n / 1e3).toFixed(n % 1e3 ? 1 : 0)}k`;
  return `₹${n}`;
};

/** Rounds the top of the axis up to a tidy number so gridlines land on round values. */
function niceMax(v: number) {
  if (v <= 0) return 1000;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Smooth line through points (Catmull-Rom → cubic Bézier). */
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return '';
  let d = `M${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    d += ` C${p1.x + (p2.x - p0.x) * t} ${p1.y + (p2.y - p0.y) * t} ${p2.x - (p3.x - p1.x) * t} ${p2.y - (p3.y - p1.y) * t} ${p2.x} ${p2.y}`;
  }
  return d;
}

const AXIS_W = 44;
const LABEL_H = 24;

// ───────────────────────────────── chart

export type DSChartProps = {
  data: RevenuePoint[];
  variant?: 'bar' | 'line';
  height?: number;
};

export function DSChart({ data, variant = 'bar', height = 180 }: DSChartProps) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [w, setW] = useState(0);
  const [active, setActive] = useState(data.length - 1);
  const reveal = useSharedValue(0);

  const plotW = Math.max(0, w - AXIS_W);
  const plotH = height - LABEL_H;
  const max = useMemo(() => niceMax(Math.max(...data.map((d) => d.value), 0) * 1.05), [data]);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * t);
  const colW = data.length ? plotW / data.length : 0;

  useEffect(() => {
    setActive(data.length - 1);
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [data, variant, reveal]);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const gridColor = dark ? '#262626' : '#E8EDF3';

  const yOf = (v: number) => plotH - (v / max) * plotH;
  const pts = data.map((d, i) => ({ x: colW * i + colW / 2, y: yOf(d.value) }));
  const linePath = smoothPath(pts);
  const areaPath = pts.length ? `${linePath} L${pts[pts.length - 1]!.x} ${plotH} L${pts[0]!.x} ${plotH} Z` : '';

  const clip = useAnimatedStyle(() => ({ width: reveal.value * plotW }));

  const act = data[active];
  const ax = pts[active]?.x ?? 0;
  const ay = pts[active]?.y ?? 0;
  const tipW = 86;
  const tipLeft = Math.min(Math.max(ax - tipW / 2, 0), Math.max(0, plotW - tipW));

  return (
    <View onLayout={onLayout} style={{ height: height + 30 }}>
      {w > 0 ? (
        <View style={{ flexDirection: 'row', marginTop: 30 }}>
          {/* y axis */}
          <View style={{ width: AXIS_W, height: plotH }}>
            {ticks.map((t, i) => (
              <Text
                key={i}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: yOf(t) - 7,
                  fontFamily: f.medium,
                  fontSize: 10,
                  color: colors.textMuted,
                }}
              >
                {t === 0 ? '0' : compact(t)}
              </Text>
            ))}
          </View>

          {/* plot */}
          <View style={{ width: plotW, height: height }}>
            <Svg width={plotW} height={plotH} style={StyleSheet.absoluteFill}>
              {ticks.map((t, i) => (
                <Line key={i} x1={0} x2={plotW} y1={yOf(t)} y2={yOf(t)} stroke={gridColor} strokeWidth={1} strokeDasharray={i === 0 ? undefined : '4 5'} />
              ))}
            </Svg>

            {variant === 'bar' ? (
              <View style={{ height: plotH, flexDirection: 'row' }}>
                {data.map((d, i) => (
                  <Bar
                    key={d.label + i}
                    index={i}
                    value={d.value}
                    max={max}
                    plotH={plotH}
                    colW={colW}
                    active={i === active}
                    inactiveColor={dark ? primary[900] : primary[200]}
                    onPress={() => setActive(i)}
                  />
                ))}
              </View>
            ) : (
              <>
                <Animated.View style={[{ height: plotH, overflow: 'hidden' }, clip]}>
                  <Svg width={plotW} height={plotH}>
                    <Defs>
                      <LinearGradient id={`a${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={primary[600]} stopOpacity={dark ? 0.35 : 0.28} />
                        <Stop offset="1" stopColor={primary[600]} stopOpacity="0" />
                      </LinearGradient>
                    </Defs>
                    <Path d={areaPath} fill={`url(#a${uid})`} />
                    <Path d={linePath} stroke={primary[600]} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    {pts.map((p, i) => (
                      <Circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={i === active ? 0 : 3}
                        fill={colors.bgSurface}
                        stroke={primary[600]}
                        strokeWidth={2}
                      />
                    ))}
                  </Svg>
                </Animated.View>
                {/* active marker sits outside the reveal clip so it never gets cut */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: ax - 9,
                    top: ay - 9,
                    width: 18,
                    height: 18,
                    borderRadius: 9999,
                    backgroundColor: dark ? 'rgba(37,99,235,0.3)' : 'rgba(37,99,235,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View style={{ width: 9, height: 9, borderRadius: 9999, backgroundColor: primary[600], borderWidth: 2, borderColor: colors.bgSurface }} />
                </View>
                {/* tap targets */}
                <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', height: plotH }]}>
                  {data.map((d, i) => (
                    <Pressable key={d.label + i} style={{ flex: 1 }} onPress={() => setActive(i)} accessibilityLabel={`${d.label} ${rupee(d.value)}`} />
                  ))}
                </View>
              </>
            )}

            {/* tooltip */}
            {act ? (
              <View pointerEvents="none" style={{ position: 'absolute', left: tipLeft, top: -30, width: tipW, alignItems: 'center' }}>
                <View style={[styles.tip, { backgroundColor: dark ? '#FFFFFF' : '#0F172A' }]}>
                  <Text style={{ fontFamily: f.bold, fontSize: 12, color: dark ? '#0A0A0A' : '#FFFFFF' }}>{rupee(act.value)}</Text>
                </View>
              </View>
            ) : null}

            {/* x labels */}
            <View style={{ flexDirection: 'row', height: LABEL_H, alignItems: 'flex-end' }}>
              {data.map((d, i) => (
                <Text
                  key={d.label + i}
                  numberOfLines={1}
                  style={{
                    width: colW,
                    textAlign: 'center',
                    fontFamily: i === active ? f.semibold : f.medium,
                    fontSize: 11,
                    color: i === active ? colors.textPrimary : colors.textMuted,
                  }}
                >
                  {d.label}
                </Text>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Bar({
  index,
  value,
  max,
  plotH,
  colW,
  active,
  inactiveColor,
  onPress,
}: {
  index: number;
  value: number;
  max: number;
  plotH: number;
  colW: number;
  active: boolean;
  inactiveColor: string;
  onPress: () => void;
}) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = 0;
    h.value = withDelay(index * 45, withSpring((value / max) * plotH, { damping: 16, stiffness: 140 }));
  }, [value, max, plotH, index, h]);
  const style = useAnimatedStyle(() => ({ height: Math.max(0, h.value) }));
  const barW = Math.min(30, colW * 0.56);
  return (
    <Pressable onPress={onPress} style={{ width: colW, height: plotH, justifyContent: 'flex-end', alignItems: 'center' }}>
      <Animated.View
        style={[{ width: barW, borderRadius: barW / 2, backgroundColor: active ? primary[600] : inactiveColor }, style]}
      />
    </Pressable>
  );
}

// ───────────────────────────────── card with header

export type DSRevenueChartProps = DSChartProps & {
  title?: string;
  /** Headline number, e.g. the period total. */
  total: number;
  /** Change vs the previous period, in percent. */
  deltaPct?: number;
  subtitle?: string;
};

export function DSRevenueChart({ title = 'Revenue', total, deltaPct, subtitle, ...chart }: DSRevenueChartProps) {
  const { colors } = useTheme();
  const tones = useBadgeTones();
  const up = (deltaPct ?? 0) >= 0;
  return (
    <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
      <View style={styles.head}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: f.medium, fontSize: 13, color: colors.textMuted }}>{title}</Text>
          <Text style={{ fontFamily: f.bold, fontSize: 28, lineHeight: 34, color: colors.textPrimary }}>{rupee(total)}</Text>
          {subtitle ? <Text style={{ fontFamily: f.regular, fontSize: 12, color: colors.textMuted }}>{subtitle}</Text> : null}
        </View>
        {deltaPct !== undefined ? (
          <DSBadge
            icon={up ? IconTrendingUp : IconTrendingDown}
            label={`${up ? '+' : ''}${deltaPct.toFixed(1)}%`}
            bg={up ? tones.success.bg : tones.danger.bg}
            fg={up ? tones.success.fg : tones.danger.fg}
          />
        ) : null}
      </View>
      <DSChart {...chart} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.card, padding: 16, paddingBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  tip: { height: 24, paddingHorizontal: 10, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
