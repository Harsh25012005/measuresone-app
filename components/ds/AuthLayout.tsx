import { Children, useId, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useHeroStatusBar } from '../../context/StatusBarContext';
import { typography } from '../../constants/tokens';
import { IconChevronLeft } from './icons';
import { HeroScene, type HeroVariant } from './graphics/scenes';

const f = typography.family;

/** The brand's blue hero gradient with soft light spots. Fills its parent. */
export function HeroGradient({ colors = ['#5B93FF', '#2563EB', '#1E3FAE'] as readonly [string, string, string] }: { colors?: readonly [string, string, string] }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`h${uid}`} x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="0.55" stopColor={colors[1]} />
            <Stop offset="1" stopColor={colors[2]} />
          </LinearGradient>
          <RadialGradient id={`s${uid}`} cx="18%" cy="0%" rx="70%" ry="60%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.38" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={`d${uid}`} cx="100%" cy="100%" rx="70%" ry="70%">
            <Stop offset="0" stopColor="#0B1B4D" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#0B1B4D" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#h${uid})`} />
        <Rect width="100%" height="100%" fill={`url(#s${uid})`} />
        <Rect width="100%" height="100%" fill={`url(#d${uid})`} />
      </Svg>
    </View>
  );
}

/** Hairline with a centred label, e.g. "or". */
export function OrDivider({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderDefault }} />
      <Text style={{ fontFamily: f.medium, fontSize: 13, color: colors.textMuted }}>{label}</Text>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderDefault }} />
    </View>
  );
}

export type AuthLayoutProps = {
  /** Which illustration the blue hero shows. */
  scene: HeroVariant;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Small line under the form, e.g. "No account? Sign up". */
  footer?: ReactNode;
  /** Shows a round back button on the hero. */
  onBack?: () => void;
  /** Rendered outside the form stack (modals / sheets). */
  overlay?: ReactNode;
};

/**
 * Shell for the sign-in family: an illustrated blue hero on top and a rounded
 * white sheet that slides up over it holding the form. Form rows fade up one
 * after another.
 */
export function AuthLayout({ scene, title, subtitle, children, footer, onBack, overlay }: AuthLayoutProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const rows = Children.toArray(children);
  useHeroStatusBar();

  const enter = (i: number) => FadeInDown.delay(180 + i * 70).duration(340).springify().damping(18);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#2F66F0' }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* hero */}
        <View style={{ paddingTop: insets.top + 8, paddingBottom: 44, paddingHorizontal: 12 }}>
          <HeroGradient />
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
              <IconChevronLeft size={20} color="#FFFFFF" />
            </Pressable>
          ) : (
            <View style={{ height: 40 }} />
          )}
          <HeroScene variant={scene} />
        </View>

        {/* sheet */}
        <Animated.View
          entering={FadeInUp.duration(420).springify().damping(20)}
          style={[styles.sheet, { backgroundColor: colors.bgPage, paddingBottom: insets.bottom + 28 }]}
        >
          <Animated.View entering={enter(0)}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
          </Animated.View>

          <View style={{ gap: 20, marginTop: 24 }}>
            {rows.map((child, i) => (
              <Animated.View key={i} entering={enter(i + 1)}>
                {child}
              </Animated.View>
            ))}
          </View>

          {footer ? (
            <Animated.View entering={enter(rows.length + 1)} style={styles.footer}>
              {footer}
            </Animated.View>
          ) : null}
        </Animated.View>
      </ScrollView>
      {overlay}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  back: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sheet: {
    flexGrow: 1,
    marginTop: -30,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 28,
    paddingHorizontal: 24,
  },
  title: { fontFamily: f.bold, fontSize: 28, lineHeight: 36 },
  subtitle: { fontFamily: f.regular, fontSize: 15, lineHeight: 22, marginTop: 6 },
  footer: { marginTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 4 },
});
