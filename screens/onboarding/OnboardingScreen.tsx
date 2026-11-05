import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AnimatedWords } from '../../components/ds/AnimatedText';
import { HeroGradient } from '../../components/ds/AuthLayout';
import { DSButton } from '../../components/ds/Button';
import { BillingScene, ClientsScene, OrdersScene } from '../../components/ds/graphics/scenes';
import { useHeroStatusBar } from '../../context/StatusBarContext';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';
import { haptics } from '../../lib/haptics';
import { markOnboardingSeen } from '../../lib/onboarding';
import type { AuthScreenProps } from '../../navigation/types';

const f = typography.family;

const SLIDES = [
  { key: 'clients', Scene: ClientsScene, colors: ['#5B93FF', '#2563EB', '#1E3FAE'] as const },
  { key: 'orders', Scene: OrdersScene, colors: ['#7C8CFF', '#4F46E5', '#3730A3'] as const },
  { key: 'billing', Scene: BillingScene, colors: ['#38BDF8', '#2563EB', '#1D4ED8'] as const },
];

/** One full-screen gradient per slide; they cross-fade as the pager moves. */
function Backdrop({ i, x, w, colors }: { i: number; x: { value: number }; w: number; colors: readonly [string, string, string] }) {
  const s = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [(i - 1) * w, i * w, (i + 1) * w], [0, 1, 0], 'clamp'),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, s]} pointerEvents="none">
      <HeroGradient colors={colors} />
    </Animated.View>
  );
}

/** Wraps a slide's artwork with parallax, scale and fade driven by the pager. */
function Page({ i, x, w, near, children }: { i: number; x: { value: number }; w: number; near: boolean; children: React.ReactNode }) {
  const s = useAnimatedStyle(() => {
    const input = [(i - 1) * w, i * w, (i + 1) * w];
    return {
      opacity: interpolate(x.value, input, [0, 1, 0], 'clamp'),
      transform: [
        { translateX: interpolate(x.value, input, [w * 0.3, 0, -w * 0.3], 'clamp') },
        { scale: interpolate(x.value, input, [0.82, 1, 0.82], 'clamp') },
      ],
    };
  });
  return (
    <View style={{ width: w, justifyContent: 'center', paddingHorizontal: 14 }}>
      <Animated.View style={s} renderToHardwareTextureAndroid>{near ? children : null}</Animated.View>
    </View>
  );
}

/** Pager dot that stretches into a pill while its slide is in view. */
function Dot({ i, x, w }: { i: number; x: { value: number }; w: number }) {
  const { colors } = useTheme();
  const s = useAnimatedStyle(() => {
    const input = [(i - 1) * w, i * w, (i + 1) * w];
    return {
      width: interpolate(x.value, input, [8, 28, 8], 'clamp'),
      backgroundColor: interpolateColor(x.value, input, [colors.borderDefault, primary[600], colors.borderDefault]),
    };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 9999 }, s]} />;
}

export default function OnboardingScreen({ navigation }: AuthScreenProps<'Onboarding'>) {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);
  const x = useSharedValue(0);
  const activeIdx = useSharedValue(0);
  const [index, setIndex] = useState(0);
  useHeroStatusBar();

  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index]!;

  const finish = async (to: 'Signup' | 'Login') => {
    await markOnboardingSeen();
    navigation.replace(to);
  };

  const onPage = (i: number) => {
    setIndex(i);
    haptics.tap();
  };

  // runs on the UI thread so the parallax never waits on the JS thread
  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
    const i = Math.round(e.contentOffset.x / width);
    if (i !== activeIdx.value && i >= 0 && i < SLIDES.length) {
      activeIdx.value = i;
      scheduleOnRN(onPage, i);
    }
  });

  const next = () => {
    haptics.tap();
    pager.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#2F66F0' }}>
      <StatusBar style="light" />
      {SLIDES.map((s, i) => (
        <Backdrop key={s.key} i={i} x={x} w={width} colors={s.colors} />
      ))}

      {/* just a skip link, top right */}
      <View style={[styles.topBar, { paddingTop: insets.top + 14 }]}>
        {!last ? (
          <Animated.View entering={FadeIn.duration(250)}>
            <Pressable onPress={() => finish('Login')} hitSlop={12} accessibilityRole="link" accessibilityLabel={t('onboarding.skip')}>
              <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>

      {/* artwork pager */}
      <View style={{ flex: 1 }}>
        <Animated.ScrollView
          ref={pager as never}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          bounces={false}
          onScroll={onScroll}
          contentContainerStyle={{ alignItems: 'center' }}
        >
          {SLIDES.map((s, i) => (
            <Page key={s.key} i={i} x={x} w={width} near={Math.abs(i - index) <= 1}>
              <s.Scene />
            </Page>
          ))}
        </Animated.ScrollView>
      </View>

      {/* bottom sheet: copy, dots, actions */}
      <Animated.View
        entering={FadeInDown.duration(280)}
        style={[styles.sheet, { backgroundColor: colors.bgPage, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 560 }}>
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <Dot key={s.key} i={i} x={x} w={width} />
            ))}
          </View>

          <View style={{ minHeight: 116, marginTop: 20 }}>
            <AnimatedWords
              key={slide.key}
              text={t(`onboarding.slides.${slide.key}.title`)}
              style={{ fontFamily: f.bold, fontSize: 30, lineHeight: 38, color: colors.textPrimary }}
              accentCount={1}
              accentColor={primary[600]}
            />
            <Animated.Text
              key={`${slide.key}-d`}
              entering={FadeInDown.delay(150).duration(280)}
              style={{ fontFamily: f.regular, fontSize: 15, lineHeight: 23, color: colors.textMuted, marginTop: 10 }}
            >
              {t(`onboarding.slides.${slide.key}.description`)}
            </Animated.Text>
          </View>

          <View style={{ marginTop: 22, gap: 6 }}>
            {last ? (
              <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 6 }}>
                <DSButton title={t('onboarding.getStarted')} size="lg" fullWidth rightIcon onPress={() => finish('Signup')} />
                <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                  <Text style={{ fontFamily: f.regular, fontSize: 14, color: colors.textMuted }}>{t('onboarding.haveAccount')}</Text>
                  <DSButton title={t('onboarding.signIn')} variant="link" size="sm" onPress={() => finish('Login')} />
                </View>
              </Animated.View>
            ) : (
              <DSButton title={t('onboarding.next')} size="lg" fullWidth rightIcon onPress={next} />
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 6, minHeight: 44, zIndex: 2 },
  skipText: { fontFamily: f.semibold, fontSize: 15, color: '#FFFFFF', textDecorationLine: 'underline', textDecorationColor: 'rgba(255,255,255,0.6)' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 26, paddingHorizontal: 24 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
});
