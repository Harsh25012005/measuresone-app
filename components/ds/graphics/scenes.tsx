import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { typography } from '../../../constants/tokens';
import {
  IconBell,
  IconBuildingStore,
  IconCalendarEvent,
  IconCheck,
  IconCircleCheck,
  IconCurrencyRupee,
  IconHanger,
  IconKey,
  IconLock,
  IconMailOpened,
  IconNeedleThread,
  IconPackage,
  IconRulerMeasure,
  IconScissors,
  IconSend,
  IconShieldCheck,
  IconShirt,
  IconStar,
  IconTruckDelivery,
  IconUserPlus,
  type TablerIcon,
} from '../icons';
import { Bar, Chip, CircleBadge, Float, GlassTile, MiniCard, PopIn, SceneBackdrop, SceneFrame, Sparkle, Tape } from './primitives';

const f = typography.family;
const BLUE = '#2563EB';

// ═════════════════════════════════ onboarding scenes (320 × 300)

const W = 320;
const H = 300;

/** Slide 1 — clients and measurements. */
export function ClientsScene() {
  return (
    <SceneFrame baseW={W} baseH={H}>
      <SceneBackdrop width={W} height={H} />

      <Float amp={5} duration={3600} tilt={2} style={{ position: 'absolute', left: 14, top: 120 }}>
        <Tape width={292} height={130} />
      </Float>

      <Float amp={5} duration={3200} style={{ position: 'absolute', left: 50, top: 46 }}>
        <MiniCard width={220} height={176}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 9999, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: f.bold, fontSize: 16, color: '#FFFFFF' }}>RP</Text>
            </View>
            <View style={{ gap: 7 }}>
              <Text style={{ fontFamily: f.bold, fontSize: 15, color: '#0F172A' }}>Rajesh Patel</Text>
              <Bar w={92} h={7} />
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: '#EEF2F7', marginHorizontal: 16 }} />
          <View style={{ flexDirection: 'row', gap: 8, padding: 16, paddingTop: 12 }}>
            {[
              ['Chest', '40'],
              ['Waist', '34'],
              ['Length', '28'],
            ].map(([k, v]) => (
              <View key={k} style={{ flex: 1, borderRadius: 14, backgroundColor: '#EFF6FF', paddingVertical: 9, alignItems: 'center' }}>
                <Text style={{ fontFamily: f.medium, fontSize: 10, color: '#64748B' }}>{k}</Text>
                <Text style={{ fontFamily: f.bold, fontSize: 17, color: BLUE }}>{v}</Text>
              </View>
            ))}
          </View>
          <View style={{ paddingHorizontal: 16 }}>
            <Chip label="Saved for next orders" bg="#DCFCE7" fg="#15803D" size={10} />
          </View>
        </MiniCard>
      </Float>

      <Float amp={7} duration={3000} tilt={5} delay={300} style={{ position: 'absolute', left: 6, top: 38 }}>
        <GlassTile icon={IconShirt} size={62} />
      </Float>
      <Float amp={6} duration={2700} tilt={-6} delay={700} style={{ position: 'absolute', left: 250, top: 196 }}>
        <GlassTile icon={IconScissors} size={58} solid />
      </Float>
      <PopIn delay={500} style={{ position: 'absolute', left: 252, top: 38 }}>
        <CircleBadge icon={IconCheck} size={32} />
      </PopIn>

      <Sparkle x={296} y={96} size={16} />
      <Sparkle x={30} y={236} size={12} delay={400} />
      <Sparkle x={160} y={20} size={10} delay={800} />
    </SceneFrame>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Slide 2 — orders, status and delivery dates. */
export function OrdersScene() {
  const dash = useSharedValue(0);
  const fill = useSharedValue(0);
  useEffect(() => {
    dash.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, false);
    fill.value = withDelay(500, withSpring(1, { damping: 18, stiffness: 70 }));
    return () => cancelAnimation(dash);
  }, [dash, fill]);
  const thread = useAnimatedProps(() => ({ strokeDashoffset: -dash.value * 24 }));
  const progress = useAnimatedStyle(() => ({ width: `${fill.value * 60}%` }));

  return (
    <SceneFrame baseW={W} baseH={H}>
      <SceneBackdrop width={W} height={H} />

      {/* thread from the calendar to the card */}
      <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <AnimatedPath
          d="M262 92 C 290 150, 230 170, 196 200"
          stroke="#FFFFFF"
          strokeOpacity={0.9}
          strokeWidth={2.2}
          strokeDasharray="6 6"
          strokeLinecap="round"
          fill="none"
          animatedProps={thread}
        />
      </Svg>

      {/* stacked cards behind */}
      <View style={{ position: 'absolute', left: 44, top: 70, transform: [{ rotate: '-7deg' }] }}>
        <MiniCard width={196} height={150} style={{ opacity: 0.45 }} />
      </View>
      <View style={{ position: 'absolute', left: 38, top: 62, transform: [{ rotate: '5deg' }] }}>
        <MiniCard width={196} height={150} style={{ opacity: 0.7 }} />
      </View>

      <Float amp={5} duration={3400} style={{ position: 'absolute', left: 36, top: 70 }}>
        <MiniCard width={206} height={160}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, paddingBottom: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 9999, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' }}>
              <IconShirt size={20} color={BLUE} strokeWidth={2} />
            </View>
            <View style={{ gap: 3 }}>
              <Text style={{ fontFamily: f.bold, fontSize: 14, color: '#0F172A' }}>Shirt × 2</Text>
              <Text style={{ fontFamily: f.medium, fontSize: 11, color: '#64748B' }}>O-101 · Rajesh Patel</Text>
            </View>
          </View>
          <View style={{ paddingHorizontal: 14, gap: 9 }}>
            <View style={{ height: 7, borderRadius: 9999, backgroundColor: '#E2E8F0', overflow: 'hidden' }}>
              <Animated.View style={[{ height: 7, borderRadius: 9999, backgroundColor: BLUE }, progress]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Chip label="Stitching" bg="#DBEAFE" fg="#1D4ED8" size={10} />
              <Text style={{ fontFamily: f.semibold, fontSize: 11, color: '#475569' }}>Due 12 Nov</Text>
            </View>
          </View>
        </MiniCard>
      </Float>

      {/* calendar */}
      <Float amp={7} duration={3000} tilt={4} delay={200} style={{ position: 'absolute', left: 232, top: 36 }}>
        <MiniCard width={70} height={78} radius={20}>
          <View style={{ height: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: f.bold, fontSize: 10, color: '#FFFFFF', letterSpacing: 1 }}>NOV</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: f.bold, fontSize: 28, color: '#0F172A' }}>12</Text>
          </View>
        </MiniCard>
      </Float>
      <PopIn delay={600} style={{ position: 'absolute', left: 284, top: 26 }}>
        <Float amp={3} duration={1800}>
          <CircleBadge icon={IconBell} size={30} bg="#F59E0B" />
        </Float>
      </PopIn>

      <Float amp={6} duration={2800} tilt={-5} delay={500} style={{ position: 'absolute', left: 8, top: 214 }}>
        <GlassTile icon={IconTruckDelivery} size={58} />
      </Float>
      <Float amp={5} duration={3100} tilt={6} delay={900} style={{ position: 'absolute', left: 246, top: 206 }}>
        <GlassTile icon={IconPackage} size={54} solid />
      </Float>

      <Sparkle x={20} y={62} size={14} delay={200} />
      <Sparkle x={300} y={170} size={12} delay={600} />
      <Sparkle x={150} y={270} size={10} delay={900} />
    </SceneFrame>
  );
}

/** Slide 3 — bills, payments and revenue. */
export function BillingScene() {
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = withDelay(500, withSpring(1, { damping: 14, stiffness: 80 }));
  }, [grow]);
  const bars = [0.35, 0.55, 0.42, 0.78, 0.62, 1];
  return (
    <SceneFrame baseW={W} baseH={H}>
      <SceneBackdrop width={W} height={H} />

      {/* receipt */}
      <Float amp={5} duration={3400} tilt={-2} style={{ position: 'absolute', left: 28, top: 30 }}>
        <MiniCard width={158} height={214} radius={18}>
          <View style={{ padding: 16, gap: 10 }}>
            <Text style={{ fontFamily: f.bold, fontSize: 13, color: '#0F172A' }}>Bill #B-045</Text>
            <Bar w="70%" h={6} />
            <View style={{ height: 1, backgroundColor: '#EEF2F7', marginVertical: 2 }} />
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Bar w={60 + i * 8} h={6} />
                <Bar w={26} h={6} color="#CBD5E1" />
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: '#EEF2F7', marginVertical: 2 }} />
            <Text style={{ fontFamily: f.medium, fontSize: 10, color: '#64748B' }}>Total</Text>
            <Text style={{ fontFamily: f.bold, fontSize: 24, color: '#0F172A' }}>₹2,500</Text>
          </View>
          {/* zig-zag tear */}
          <Svg width={158} height={10} viewBox="0 0 158 10" style={{ position: 'absolute', bottom: -1, left: 0 }}>
            <Path d="M0 0 H158 V10 L148 2 L138 10 L128 2 L118 10 L108 2 L98 10 L88 2 L78 10 L68 2 L58 10 L48 2 L38 10 L28 2 L18 10 L8 2 L0 10 Z" fill="#FFFFFF" />
          </Svg>
        </MiniCard>
      </Float>

      <PopIn delay={700} style={{ position: 'absolute', left: 104, top: 204, transform: [{ rotate: '-12deg' }] }}>
        <View style={{ paddingHorizontal: 12, height: 32, borderRadius: 9, borderWidth: 2.5, borderColor: '#16A34A', backgroundColor: 'rgba(240,253,244,0.95)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: f.bold, fontSize: 15, letterSpacing: 2, color: '#16A34A' }}>PAID</Text>
        </View>
      </PopIn>

      {/* chart */}
      <Float amp={6} duration={3000} tilt={2} delay={250} style={{ position: 'absolute', left: 172, top: 128 }}>
        <MiniCard width={134} height={112} radius={20}>
          <View style={{ padding: 12, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: f.semibold, fontSize: 10, color: '#64748B' }}>Revenue</Text>
              <Chip label="+12%" bg="#DCFCE7" fg="#15803D" size={9} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 54 }}>
              {bars.map((b, i) => (
                <GrowBar key={i} value={b} index={i} last={i === bars.length - 1} progress={grow} />
              ))}
            </View>
          </View>
        </MiniCard>
      </Float>

      {/* coin */}
      <Float amp={8} duration={2600} tilt={8} delay={400} style={{ position: 'absolute', left: 218, top: 24 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 9999,
            backgroundColor: '#FBBF24',
            borderWidth: 4,
            borderColor: '#FDE68A',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#92400E',
            shadowOpacity: 0.35,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 10 },
            elevation: 10,
          }}
        >
          <IconCurrencyRupee size={30} color="#92400E" strokeWidth={2.4} />
        </View>
      </Float>
      <Float amp={5} duration={3200} tilt={-6} delay={900} style={{ position: 'absolute', left: 18, top: 236 }}>
        <GlassTile icon={IconCircleCheck} size={50} />
      </Float>

      <Sparkle x={300} y={92} size={16} delay={100} />
      <Sparkle x={196} y={262} size={12} delay={500} />
      <Sparkle x={14} y={30} size={10} delay={900} />
    </SceneFrame>
  );
}

function GrowBar({ value, index, last, progress }: { value: number; index: number; last: boolean; progress: { value: number } }) {
  const s = useAnimatedStyle(() => ({ height: Math.max(2, 54 * value * Math.min(1, progress.value * (1 + index * 0.08))) }));
  return <Animated.View style={[{ flex: 1, borderRadius: 6, backgroundColor: last ? BLUE : '#BFDBFE' }, s]} />;
}

// ═════════════════════════════════ auth hero scenes (320 × 210)

export type HeroVariant = 'login' | 'signup' | 'forgot' | 'mail' | 'reset' | 'shop';

type Sat = { icon: TablerIcon; x: number; y: number; size: number; solid?: boolean; tilt?: number; delay?: number };

const HERO: Record<HeroVariant, { center: TablerIcon; badge?: TablerIcon; sats: Sat[] }> = {
  login: {
    center: IconShirt,
    sats: [
      { icon: IconScissors, x: 22, y: 30, size: 52, tilt: -8 },
      { icon: IconRulerMeasure, x: 246, y: 22, size: 54, solid: true, tilt: 7, delay: 300 },
      { icon: IconNeedleThread, x: 252, y: 128, size: 50, tilt: -6, delay: 600 },
      { icon: IconHanger, x: 14, y: 124, size: 48, solid: true, tilt: 6, delay: 900 },
    ],
  },
  signup: {
    center: IconUserPlus,
    sats: [
      { icon: IconShirt, x: 24, y: 28, size: 52, tilt: -8 },
      { icon: IconStar, x: 250, y: 26, size: 50, solid: true, tilt: 8, delay: 300 },
      { icon: IconScissors, x: 254, y: 130, size: 50, tilt: -6, delay: 600 },
      { icon: IconRulerMeasure, x: 14, y: 126, size: 48, solid: true, tilt: 6, delay: 900 },
    ],
  },
  forgot: {
    center: IconLock,
    sats: [
      { icon: IconKey, x: 246, y: 26, size: 54, solid: true, tilt: 14 },
      { icon: IconShieldCheck, x: 22, y: 34, size: 52, tilt: -8, delay: 400 },
      { icon: IconStar, x: 258, y: 134, size: 44, tilt: -6, delay: 800 },
    ],
  },
  mail: {
    center: IconMailOpened,
    badge: IconCheck,
    sats: [
      { icon: IconSend, x: 244, y: 22, size: 54, solid: true, tilt: 10 },
      { icon: IconStar, x: 24, y: 40, size: 46, tilt: -8, delay: 400 },
      { icon: IconShirt, x: 250, y: 132, size: 46, tilt: -6, delay: 800 },
    ],
  },
  reset: {
    center: IconShieldCheck,
    sats: [
      { icon: IconLock, x: 22, y: 30, size: 52, solid: true, tilt: -8 },
      { icon: IconKey, x: 248, y: 28, size: 52, tilt: 10, delay: 300 },
      { icon: IconCheck, x: 254, y: 132, size: 44, tilt: -6, delay: 700 },
    ],
  },
  shop: {
    center: IconBuildingStore,
    sats: [
      { icon: IconHanger, x: 22, y: 30, size: 52, tilt: -8 },
      { icon: IconShirt, x: 248, y: 24, size: 54, solid: true, tilt: 8, delay: 300 },
      { icon: IconCurrencyRupee, x: 254, y: 130, size: 48, tilt: -6, delay: 600 },
      { icon: IconScissors, x: 14, y: 128, size: 48, solid: true, tilt: 6, delay: 900 },
    ],
  },
};

const HW = 320;
const HH = 210;

/** Compact hero artwork for the sign-in family of screens. */
export function HeroScene({ variant }: { variant: HeroVariant }) {
  const cfg = HERO[variant];
  const Center = cfg.center;
  return (
    <SceneFrame baseW={HW} baseH={HH} maxScale={1.1}>
      <SceneBackdrop width={HW} height={HH} />

      <PopIn delay={80} style={{ position: 'absolute', left: HW / 2 - 52, top: HH / 2 - 52 }}>
        <Float amp={5} duration={3200}>
          <View
            style={{
              width: 104,
              height: 104,
              borderRadius: 34,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#0B1B4D',
              shadowOpacity: 0.3,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 16 },
              elevation: 12,
            }}
          >
            <Center size={50} color={BLUE} strokeWidth={1.7} />
          </View>
          {cfg.badge ? (
            <PopIn delay={700} style={{ position: 'absolute', right: -8, top: -8 }}>
              <CircleBadge icon={cfg.badge} size={32} />
            </PopIn>
          ) : null}
        </Float>
      </PopIn>

      {cfg.sats.map((s, i) => (
        <Float key={i} amp={6} duration={2800 + i * 250} tilt={s.tilt ?? 0} delay={s.delay ?? 0} style={{ position: 'absolute', left: s.x, top: s.y }}>
          <GlassTile icon={s.icon} size={s.size} solid={s.solid} />
        </Float>
      ))}

      <Sparkle x={86} y={20} size={13} delay={100} />
      <Sparkle x={232} y={96} size={11} delay={500} />
      <Sparkle x={96} y={188} size={12} delay={800} />
      <Sparkle x={300} y={190} size={9} delay={300} />
    </SceneFrame>
  );
}
