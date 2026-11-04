import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useHeroStatusBar } from '../../context/StatusBarContext';
import { status, typography } from '../../constants/tokens';
import { IconChevronLeft, IconSearch, IconX, type TablerIcon } from './icons';

const f = typography.family;

export type GlassButtonProps = {
  icon: TablerIcon;
  label: string;
  onPress?: () => void;
  /** Red count bubble (number) or plain dot (true). */
  badge?: number | boolean;
  size?: number;
};

/** Round frosted button that sits on the blue header. */
export function GlassButton({ icon: Icon, label, onPress, badge, size = 40 }: GlassButtonProps) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const bubble = typeof badge === 'number';
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.9, { damping: 14, stiffness: 400 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 10, stiffness: 300 }))}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
    >
      <Animated.View style={[styles.glass, { width: size, height: size }, style]}>
        <Icon size={size * 0.5} color="#FFFFFF" strokeWidth={1.9} />
        {badge ? (
          <View style={[bubble ? styles.count : styles.dot, { backgroundColor: status.danger[500] }]}>
            {bubble ? <Text style={{ fontFamily: f.bold, fontSize: 10, color: '#FFFFFF' }}>{badge > 9 ? '9+' : badge}</Text> : null}
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/** Frosted search field for the blue header. */
export function GlassSearch({
  value,
  onChangeText,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.search}>
      <IconSearch size={18} color="rgba(255,255,255,0.6)" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.5)"
        autoFocus={autoFocus}
        returnKeyType="search"
        style={[styles.searchInput, { outlineStyle: 'none' } as object]}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear">
          <IconX size={16} color="rgba(255,255,255,0.9)" />
        </Pressable>
      ) : null}
    </View>
  );
}

export type DSScreenProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: GlassButtonProps[];
  /** Content placed under the title row inside the blue header (search field, summary…). */
  headerExtra?: ReactNode;
  children: ReactNode;
};

/**
 * Inner-screen shell: blue gradient header (back button, title, actions) with
 * the content on a rounded sheet that overlaps it. Matches the sign-in hero.
 */
export function DSScreen({ title, subtitle, onBack, actions = [], headerExtra, children }: DSScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  useHeroStatusBar();

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: headerExtra ? 40 : 34 }}>
        <Animated.View entering={FadeIn.duration(260)} style={styles.row}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
              <IconChevronLeft size={26} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {actions.map((a) => (
              <GlassButton key={a.label} {...a} />
            ))}
          </View>
        </Animated.View>
        {headerExtra ? <View style={{ marginTop: 16 }}>{headerExtra}</View> : null}
      </View>

      <View style={[styles.sheet, { backgroundColor: colors.bgPage }]}>{children}</View>
    </View>
  );
}

/**
 * Form page: black header + sheet holding a scrollable, keyboard-aware form.
 * Children are laid out in a column with 20px gaps.
 */
export function DSFormScreen({ title, subtitle, onBack, actions, children }: Omit<DSScreenProps, 'headerExtra'>) {
  return (
    <DSScreen title={title} subtitle={subtitle} onBack={onBack} actions={actions}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: 60, gap: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  back: { width: 32, height: 40, alignItems: 'flex-start', justifyContent: 'center', marginRight: -4 },
  title: { fontFamily: f.bold, fontSize: 22, lineHeight: 28, color: '#FFFFFF' },
  subtitle: { fontFamily: f.medium, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.8)' },
  glass: {
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { position: 'absolute', top: 7, right: 8, width: 10, height: 10, borderRadius: 9999, borderWidth: 2, borderColor: '#000000' },
  count: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexGrow: 1,
    height: 48,
    borderRadius: 9999,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  searchInput: { flex: 1, fontFamily: f.medium, fontSize: 15, color: '#FFFFFF', padding: 0 },
  sheet: { flex: 1, marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
});
