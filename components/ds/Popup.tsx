import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { primary, radii, status, typography } from '../../constants/tokens';
import { DSButton } from './Button';
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconTrash, type TablerIcon } from './icons';

const f = typography.family;

export type DSPopupTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<DSPopupTone, { color: string; tintLight: string; tintDark: string; Icon: TablerIcon }> = {
  info: { color: primary[600], tintLight: primary[50], tintDark: primary[950], Icon: IconInfoCircle },
  success: { color: status.success[600], tintLight: status.success[100], tintDark: '#0F2E1C', Icon: IconCircleCheck },
  warning: { color: status.warning[600], tintLight: status.warning[100], tintDark: '#33240A', Icon: IconAlertTriangle },
  danger: { color: status.danger[600], tintLight: status.danger[100], tintDark: '#3A1414', Icon: IconTrash },
};

export type DSPopupProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  tone?: DSPopupTone;
  /** Replace the default tone icon. */
  icon?: TablerIcon;
  /** Extra content between the description and the buttons. */
  children?: ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  /** Omit for a single-button popup. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  dismissOnScrim?: boolean;
};

export function DSPopup({
  visible,
  onClose,
  title,
  description,
  tone = 'info',
  icon,
  children,
  primaryLabel = 'OK',
  onPrimary,
  secondaryLabel,
  onSecondary,
  dismissOnScrim = true,
}: DSPopupProps) {
  const { colors, scheme } = useTheme();
  const [mounted, setMounted] = useState(visible);
  const scrim = useSharedValue(0);
  const pop = useSharedValue(0);
  const t = TONES[tone];
  const Icon = icon ?? t.Icon;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      scrim.value = withTiming(1, { duration: 180 });
      pop.value = withSpring(1, { damping: 16, stiffness: 260, mass: 0.8 });
    } else if (mounted) {
      scrim.value = withTiming(0, { duration: 150 });
      pop.value = withTiming(0, { duration: 150 });
      const id = setTimeout(() => setMounted(false), 160);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.6),
    transform: [{ scale: 0.88 + 0.12 * pop.value }, { translateY: (1 - pop.value) * 12 }],
  }));

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)' }, scrimStyle]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissOnScrim ? onClose : undefined}
            accessibilityLabel="Dismiss"
          />
        </Animated.View>

        <Animated.View
          accessibilityRole="alert"
          style={[
            styles.card,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
            cardStyle,
          ]}
        >
          <View style={[styles.badge, { backgroundColor: scheme === 'dark' ? t.tintDark : t.tintLight }]}>
            <Icon size={26} color={t.color} strokeWidth={2} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {description ? <Text style={[styles.desc, { color: colors.textMuted }]}>{description}</Text> : null}
          {children ? <View style={{ alignSelf: 'stretch', marginTop: 16 }}>{children}</View> : null}

          <View style={styles.actions}>
            {secondaryLabel ? (
              <View style={{ flex: 1 }}>
                <DSButton
                  title={secondaryLabel}
                  variant="line"
                  size="md"
                  fullWidth
                  onPress={onSecondary ?? onClose}
                />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <DSButton
                title={primaryLabel}
                variant={tone === 'danger' ? 'destructive' : 'primary'}
                size="md"
                fullWidth
                onPress={onPrimary ?? onClose}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  badge: { width: 56, height: 56, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: f.bold, fontSize: 20, lineHeight: 26, textAlign: 'center' },
  desc: { fontFamily: f.regular, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 24 },
});
