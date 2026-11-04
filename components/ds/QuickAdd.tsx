import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { primary, status, typography } from '../../constants/tokens';
import { IconPlus, type TablerIcon } from './icons';

const f = typography.family;

export type DSQuickAction = {
  key: string;
  label: string;
  description?: string;
  icon: TablerIcon;
  tone?: 'primary' | 'success' | 'warning' | 'pink';
  onPress: () => void;
};

const TONES = {
  primary: { fg: primary[600], light: primary[100], dark: primary[950] },
  success: { fg: status.success[600], light: status.success[100], dark: '#0F2E1C' },
  warning: { fg: status.warning[600], light: status.warning[100], dark: '#33240A' },
  pink: { fg: '#DB2777', light: '#FCE7F3', dark: '#3A1228' },
} as const;

/** Geometry other layers (e.g. the product tour) need to line up with the menu rows. */
export const QUICK_ADD_LAYOUT = { ITEM_W: 264, ITEM_H: 62, GAP: 10, FAB: 58, FAB_GAP: 16 } as const;

export type DSQuickAddProps = {
  visible: boolean;
  onClose: () => void;
  actions: DSQuickAction[];
  /** Distance from the screen bottom to the bottom of the round button. */
  fabBottom?: number;
  /** Distance from the screen's right edge to the round button. */
  fabRight?: number;
  /** Dims every row except this one (used by the product tour). */
  highlightedKey?: string;
  /** Extra content drawn above the menu, inside the same modal (e.g. tour tooltip). */
  overlay?: ReactNode;
};

/**
 * Menu that opens from the nav bar's plus button: the screen blurs, the plus
 * turns into a close (×), and the actions fan up in a staggered spring.
 */
export function DSQuickAdd({
  visible,
  onClose,
  actions,
  fabBottom = 24,
  fabRight = 16,
  highlightedKey,
  overlay,
}: DSQuickAddProps) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const scrim = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      scrim.value = withTiming(1, { duration: 200 });
      spin.value = withSpring(1, { damping: 14, stiffness: 240 });
    } else if (mounted) {
      scrim.value = withTiming(0, { duration: 160 });
      spin.value = withTiming(0, { duration: 160 });
      const id = setTimeout(() => setMounted(false), 170);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 135}deg` }] }));

  if (!mounted) return null;

  const bottom = insets.bottom + fabBottom;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
          <BlurView intensity={30} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(0,0,0,0.45)' : 'rgba(15,23,42,0.18)' }]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
        </Animated.View>

        {/* actions, nearest-to-button first */}
        <View pointerEvents="box-none" style={[styles.stack, { right: fabRight, bottom: bottom + QUICK_ADD_LAYOUT.FAB + QUICK_ADD_LAYOUT.FAB_GAP }]}>
          {[...actions].reverse().map((a, i) => {
            const tone = TONES[a.tone ?? 'primary'];
            const Icon = a.icon;
            const dimmed = !!highlightedKey && highlightedKey !== a.key;
            return (
              <Animated.View
                key={a.key}
                pointerEvents={highlightedKey ? 'none' : 'auto'}
                entering={FadeInDown.delay(i * 55).springify().damping(15).stiffness(220)}
                exiting={FadeOutDown.duration(120)}
              >
                <Pressable
                  onPress={() => {
                    onClose();
                    a.onPress();
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.item,
                    {
                      backgroundColor: dark ? '#1C1C1C' : '#FFFFFF',
                      borderColor: dark ? '#2E2E2E' : colors.borderDefault,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                      opacity: dimmed ? 0.3 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1, paddingLeft: 6 }}>
                    <Text numberOfLines={1} style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }}>
                      {a.label}
                    </Text>
                    {a.description ? (
                      <Text numberOfLines={1} style={{ fontFamily: f.regular, fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                        {a.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.itemIcon, { backgroundColor: dark ? tone.dark : tone.light }]}>
                    <Icon size={20} color={tone.fg} strokeWidth={2} />
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {overlay}

        {/* the plus, now a close */}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={[styles.fab, { right: fabRight, bottom }]}
        >
          <Animated.View style={fabStyle}>
            <IconPlus size={30} color="#FFFFFF" strokeWidth={2} />
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  stack: { position: 'absolute', gap: 10, alignItems: 'flex-end' },
  item: {
    width: QUICK_ADD_LAYOUT.ITEM_W,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    paddingLeft: 12,
    borderRadius: 9999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  itemIcon: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 9999,
    backgroundColor: primary[600],
    borderWidth: 1,
    borderColor: primary[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
