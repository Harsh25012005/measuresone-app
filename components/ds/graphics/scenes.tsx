import { useEffect, useId } from 'react';
import { Text, View } from 'react-native';
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
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { typography } from '../../../constants/tokens';
import { IconBuildingStore, IconCheck, IconUserPlus } from '../icons';
import {
  Appear,
  Backdrop,
  Bob,
  Coin,
  Mannequin,
  Needle,
  Receipt,
  Scissors,
  SewButton,
  Shirt,
  Spool,
  Swing,
  Tag,
  TapeWrap,
  useLoop,
} from './art';
import { CircleBadge, PopIn, SceneFrame, Sparkle } from './primitives';

const f = typography.family;
const BLUE = '#2563EB';

// ═════════════════════════════════ onboarding scenes (320 × 300)

const W = 320;
const H = 300;

/** Slide 1 — a client's measurements: the tape wraps the dress form, the tags swing. */
export function ClientsScene() {
  const p = useLoop({ duration: 1700, hold: 2400, reset: 450 });
  return (
    <SceneFrame baseW={W} baseH={H}>
      <Backdrop width={W} height={H} />

      <View style={{ position: 'absolute', left: 94, top: 22, width: 132, height: 242 }}>
        <Mannequin width={132} />
        <TapeWrap width={132} progress={p} />
      </View>

      <Swing height={76} amp={8} duration={2300} style={{ position: 'absolute', left: 10, top: 36 }}>
        <Tag label="Chest" value="40" />
      </Swing>
      <Swing height={76} amp={7} duration={2700} delay={500} style={{ position: 'absolute', left: 236, top: 92 }}>
        <Tag label="Waist" value="34" accent="#16A34A" />
      </Swing>

      <Appear delay={350} style={{ position: 'absolute', left: 22, top: 190 }}>
        <Spool size={50} />
      </Appear>
      <Appear delay={650} style={{ position: 'absolute', left: 240, top: 208 }}>
        <Scissors size={62} />
      </Appear>
      <Bob amp={4} duration={2400} style={{ position: 'absolute', left: 258, top: 24 }}>
        <SewButton size={30} />
      </Bob>

      <Sparkle x={70} y={22} size={12} delay={200} />
      <Sparkle x={300} y={176} size={10} delay={600} />
      <Sparkle x={26} y={268} size={11} delay={900} />
    </SceneFrame>
  );
}

/** Slide 2 — an order being stitched: the seam draws, the needle travels, the status flips to ready. */
export function OrdersScene() {
  const p = useLoop({ duration: 2200, hold: 1500, reset: 350 });
  const stitching = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, Math.max(0, (p.value - 0.85) * 8)) }));
  const ready = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (p.value - 0.85) * 8)) }));
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));

  return (
    <SceneFrame baseW={W} baseH={H}>
      <Backdrop width={W} height={H} />

      <View style={{ position: 'absolute', left: 58, top: 40 }}>
        <Bob amp={3} duration={3000}>
          <Shirt width={204} progress={p} />
        </Bob>
      </View>
      <Needle progress={p} travel={92} style={{ position: 'absolute', left: 58, top: 190 }} />

      <Swing height={76} amp={7} duration={2500} style={{ position: 'absolute', left: 238, top: 8 }}>
        <Tag label="Due" value="12 Nov" />
      </Swing>

      {/* status */}
      <View style={{ position: 'absolute', left: 80, top: 244, width: 160, alignItems: 'center', gap: 9 }}>
        <View style={{ width: 160, height: 8, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
          <Animated.View style={[{ height: 8, borderRadius: 9999, backgroundColor: '#FFFFFF' }, fill]} />
        </View>
        <View style={{ height: 26, width: 120, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute', paddingHorizontal: 12, height: 26, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center' }, stitching]}>
            <Text style={{ fontFamily: f.semibold, fontSize: 12, color: '#FFFFFF' }}>Stitching…</Text>
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', paddingHorizontal: 12, height: 26, borderRadius: 9999, backgroundColor: '#DCFCE7', justifyContent: 'center' }, ready]}>
            <Text style={{ fontFamily: f.bold, fontSize: 12, color: '#15803D' }}>Ready ✓</Text>
          </Animated.View>
        </View>
      </View>

      <Appear delay={300} style={{ position: 'absolute', left: 14, top: 120 }}>
        <Spool size={46} color="#6366F1" />
      </Appear>
      <Bob amp={4} duration={2500} delay={400} style={{ position: 'absolute', left: 264, top: 150 }}>
        <SewButton size={34} />
      </Bob>
      <Appear delay={600} style={{ position: 'absolute', left: 250, top: 200 }}>
        <Scissors size={54} />
      </Appear>

      <Sparkle x={36} y={60} size={12} delay={200} />
      <Sparkle x={298} y={118} size={10} delay={700} />
      <Sparkle x={150} y={284} size={10} delay={400} />
    </SceneFrame>
  );
}

/** Slide 3 — money in: coins drop into a stack and the receipt gets stamped PAID. */
export function BillingScene() {
  const stamp = useSharedValue(0);
  useEffect(() => {
    stamp.value = withRepeat(
      withSequence(withTiming(0, { duration: 1 }), withDelay(1500, withSpring(1, { damping: 7, stiffness: 220 })), withDelay(2300, withTiming(0, { duration: 220 }))),
      -1,
    );
    return () => cancelAnimation(stamp);
  }, [stamp]);
  const stampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, stamp.value * 3),
    transform: [{ rotate: '-12deg' }, { scale: 2.1 - 1.1 * stamp.value }],
  }));

  return (
    <SceneFrame baseW={W} baseH={H}>
      <Backdrop width={W} height={H} />

      <Bob amp={4} duration={3200} style={{ position: 'absolute', left: 26, top: 32 }}>
        <Receipt width={150} height={196}>
          <View style={{ padding: 18, gap: 10 }}>
            <Text style={{ fontFamily: f.bold, fontSize: 13, color: '#0F172A' }}>Bill #B-045</Text>
            <View style={{ height: 6, width: '66%', borderRadius: 9999, backgroundColor: '#E2E8F0' }} />
            <View style={{ height: 1, backgroundColor: '#EEF2F7' }} />
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ height: 6, width: 52 + i * 9, borderRadius: 9999, backgroundColor: '#E2E8F0' }} />
                <View style={{ height: 6, width: 24, borderRadius: 9999, backgroundColor: '#CBD5E1' }} />
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: '#EEF2F7' }} />
            <Text style={{ fontFamily: f.medium, fontSize: 10, color: '#64748B' }}>Total</Text>
            <Text style={{ fontFamily: f.bold, fontSize: 24, color: '#0F172A' }}>₹2,500</Text>
          </View>
        </Receipt>
      </Bob>

      <Animated.View style={[{ position: 'absolute', left: 76, top: 108, paddingHorizontal: 12, height: 32, borderRadius: 9, borderWidth: 2.5, borderColor: '#16A34A', backgroundColor: 'rgba(240,253,244,0.96)', alignItems: 'center', justifyContent: 'center' }, stampStyle]}>
        <Text style={{ fontFamily: f.bold, fontSize: 15, letterSpacing: 2, color: '#16A34A' }}>PAID</Text>
      </Animated.View>

      {/* coins land one after another */}
      {[0, 1, 2, 3].map((i) => (
        <FallingCoin key={i} index={i} />
      ))}
      <Bob amp={3} duration={2200} delay={300} style={{ position: 'absolute', left: 226, top: 62 }}>
        <View style={{ paddingHorizontal: 11, height: 28, borderRadius: 9999, backgroundColor: '#DCFCE7', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' }}>
          <Text style={{ fontFamily: f.bold, fontSize: 12, color: '#15803D' }}>+ ₹2,500</Text>
        </View>
      </Bob>

      <Bob amp={4} duration={2600} delay={500} style={{ position: 'absolute', left: 30, top: 246 }}>
        <SewButton size={30} />
      </Bob>

      <Sparkle x={300} y={40} size={13} delay={100} />
      <Sparkle x={196} y={30} size={10} delay={500} />
      <Sparkle x={150} y={274} size={11} delay={800} />
    </SceneFrame>
  );
}

function FallingCoin({ index }: { index: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(
      withSequence(
        withDelay(index * 240, withSpring(1, { damping: 9, stiffness: 140 })),
        withDelay((3 - index) * 240 + 2300, withTiming(0, { duration: 240 })),
      ),
      -1,
    );
    return () => cancelAnimation(v);
  }, [index, v]);
  const s = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 4), transform: [{ translateY: (1 - v.value) * -120 }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 226, top: 214 - index * 17, zIndex: index }, s]}>
      <Coin size={56} />
    </Animated.View>
  );
}

// ═════════════════════════════════ auth hero scenes (320 × 210)

export type HeroVariant = 'login' | 'signup' | 'forgot' | 'mail' | 'reset' | 'shop';

const HW = 320;
const HH = 210;

/** Padlock built from the same stitched paper style; it rattles (forgot) or springs open (reset). */
function Padlock({ opening }: { opening?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(
      withSequence(withDelay(1200, withTiming(1, { duration: 120 })), withTiming(-1, { duration: 120 }), withTiming(1, { duration: 120 }), withTiming(-1, { duration: 120 }), withTiming(0, { duration: 120 }), withDelay(1400, withTiming(0, { duration: 1 }))),
      -1,
    );
    return () => cancelAnimation(v);
  }, [v]);
  const rattle = useAnimatedStyle(() => ({ transform: [{ rotate: `${opening ? 0 : v.value * 5}deg` }] }));
  const shackle = useAnimatedStyle(() => ({ transform: [{ translateY: opening ? -Math.abs(v.value) * 9 : 0 }] }));
  return (
    <Animated.View style={[{ width: 96, height: 118 }, rattle]}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, shackle]}>
        <Svg width={96} height={64} viewBox="0 0 96 64">
          <Path d="M26 62 V36 C26 8 70 8 70 36 V62" stroke="#E7EEFF" strokeWidth={9} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Svg width={96} height={118} viewBox="0 0 96 118" style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id={`p${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#BFD3FB" />
          </LinearGradient>
        </Defs>
        <Rect x="8" y="50" width="80" height="62" rx="18" fill="#0B1B4D" opacity={0.25} transform="translate(0 5)" />
        <Rect x="8" y="50" width="80" height="62" rx="18" fill={`url(#p${uid})`} />
        <Rect x="15" y="57" width="66" height="48" rx="12" fill="none" stroke="#9DB8F5" strokeWidth={1.2} strokeDasharray="4 4" />
        <Circle cx="48" cy="77" r="7" fill={BLUE} />
        <Path d="M48 80 V92" stroke={BLUE} strokeWidth={4.5} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

/** Envelope whose letter slides up out of it, again and again. */
function Envelope() {
  const p = useLoop({ duration: 900, hold: 1600, reset: 500 });
  const letter = useAnimatedStyle(() => ({ transform: [{ translateY: -p.value * 26 }] }));
  const flap = useAnimatedStyle(() => ({ transform: [{ translateY: -p.value * 2 }] }));
  return (
    <View style={{ width: 128, height: 98 }}>
      <Animated.View style={[{ position: 'absolute', left: 20, top: 10, width: 88, height: 64, borderRadius: 8, backgroundColor: '#FFFFFF', padding: 10, gap: 6 }, letter]}>
        <View style={{ height: 5, width: '70%', borderRadius: 9999, backgroundColor: '#DCE6F8' }} />
        <View style={{ height: 5, width: '90%', borderRadius: 9999, backgroundColor: '#E8EEF9' }} />
        <View style={{ height: 5, width: '55%', borderRadius: 9999, backgroundColor: '#E8EEF9' }} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, flap]}>
        <Svg width={128} height={98} viewBox="0 0 128 98">
          <Rect x="4" y="22" width="120" height="72" rx="14" fill="#0B1B4D" opacity={0.25} transform="translate(0 4)" />
          <Rect x="4" y="22" width="120" height="72" rx="14" fill="#F4F8FF" />
          <Path d="M4 36 L64 70 L124 36" stroke="#BFD3FB" strokeWidth={2} fill="none" strokeLinejoin="round" />
          <Path d="M4 92 L50 58 M124 92 L78 58" stroke="#DCE6F8" strokeWidth={2} />
          <Rect x="10" y="28" width="108" height="60" rx="10" fill="none" stroke="#9DB8F5" strokeWidth={1} strokeDasharray="4 4" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Compact hero artwork for the sign-in family of screens. */
export function HeroScene({ variant }: { variant: HeroVariant }) {
  const p = useLoop({ duration: 1600, hold: 2200, reset: 400 });
  const form = variant === 'login' || variant === 'signup' || variant === 'shop';

  return (
    <SceneFrame baseW={HW} baseH={HH} maxScale={1.1}>
      <Backdrop width={HW} height={HH} />

      {form ? (
        <Bob amp={3} duration={3000} style={{ position: 'absolute', left: 118, top: 22 }}>
          <View style={{ width: 84, height: 154 }}>
            <Mannequin width={84} />
            <TapeWrap width={84} progress={p} />
          </View>
        </Bob>
      ) : variant === 'mail' ? (
        <Bob amp={4} duration={3000} style={{ position: 'absolute', left: 96, top: 50 }}>
          <Envelope />
        </Bob>
      ) : (
        <Bob amp={4} duration={3000} style={{ position: 'absolute', left: 112, top: 34 }}>
          <Padlock opening={variant === 'reset'} />
        </Bob>
      )}

      {/* a badge that says what this screen is about */}
      {variant === 'signup' ? (
        <PopIn delay={500} style={{ position: 'absolute', left: 196, top: 26 }}>
          <CircleBadge icon={IconUserPlus} size={34} bg={BLUE} />
        </PopIn>
      ) : variant === 'shop' ? (
        <PopIn delay={500} style={{ position: 'absolute', left: 196, top: 26 }}>
          <CircleBadge icon={IconBuildingStore} size={34} bg={BLUE} />
        </PopIn>
      ) : variant === 'mail' || variant === 'reset' ? (
        <PopIn delay={800} style={{ position: 'absolute', left: variant === 'mail' ? 202 : 196, top: variant === 'mail' ? 36 : 30 }}>
          <CircleBadge icon={IconCheck} size={32} />
        </PopIn>
      ) : null}

      {/* tools around the form */}
      <Appear delay={300} style={{ position: 'absolute', left: 36, top: 112 }}>
        {variant === 'forgot' || variant === 'mail' ? <Spool size={44} color="#6366F1" /> : <Scissors size={58} />}
      </Appear>
      <Appear delay={550} style={{ position: 'absolute', left: 244, top: 96 }}>
        {variant === 'login' || variant === 'shop' ? <Spool size={44} /> : variant === 'reset' ? <Scissors size={54} /> : <Spool size={44} color="#F59E0B" />}
      </Appear>
      <Bob amp={4} duration={2500} delay={200} style={{ position: 'absolute', left: 46, top: 36 }}>
        <SewButton size={30} />
      </Bob>
      {variant === 'login' ? (
        <Swing height={72} amp={7} duration={2500} style={{ position: 'absolute', left: 240, top: 6 }}>
          <Tag label="Chest" value="40" />
        </Swing>
      ) : null}

      <Sparkle x={92} y={20} size={12} delay={100} />
      <Sparkle x={232} y={150} size={10} delay={500} />
      <Sparkle x={290} y={190} size={9} delay={300} />
    </SceneFrame>
  );
}
