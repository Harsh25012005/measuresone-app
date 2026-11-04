import { useId, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { IconArrowRight, IconPlus, type TablerIcon } from './icons';
import { buttonHeights, primary, status, typography } from '../../constants/tokens';

export type DSButtonVariant = 'primary' | 'black' | 'line' | 'link' | 'destructive';
export type DSButtonSize = 'sm' | 'rg' | 'md' | 'lg';

const SIZES: Record<DSButtonSize, { h: number; px: number; font: number; icon: number; gap: number }> = {
  sm: { h: buttonHeights.sm, px: 14, font: 13, icon: 14, gap: 6 },
  rg: { h: buttonHeights.rg, px: 18, font: 14, icon: 16, gap: 6 },
  md: { h: buttonHeights.md, px: 22, font: 15, icon: 18, gap: 8 },
  lg: { h: buttonHeights.lg, px: 24, font: 17, icon: 20, gap: 8 },
};

export type DSButtonProps = {
  /** Omit for an icon-only button. */
  title?: string;
  onPress?: () => void;
  variant?: DSButtonVariant;
  size?: DSButtonSize;
  /** true → default icon, or pass a Tabler icon component. */
  leftIcon?: boolean | TablerIcon;
  rightIcon?: boolean | TablerIcon;
  /** Icon-only button: pass a Tabler icon component. Renders a circle of the size's height. */
  icon?: TablerIcon;
  /** Custom node before the label (e.g. a brand logo that isn't a Tabler icon). */
  leftNode?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
};

export function DSButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  icon,
  leftNode,
  loading = false,
  disabled = false,
  fullWidth = false,
}: DSButtonProps) {
  const { scheme, colors } = useTheme();
  const gradId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const s = SIZES[size];
  const scale = useSharedValue(1);
  const pressedOpacity = useSharedValue(0);
  const inactive = disabled || loading;
  const iconOnly = !!icon && !title;

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const overlay = useAnimatedStyle(() => ({ opacity: pressedOpacity.value }));

  const isDark = scheme === 'dark';
  const fg =
    variant === 'primary' || variant === 'black' || variant === 'destructive'
      ? '#FFFFFF'
      : primary[600];
  const gradient: [string, string] | null =
    variant === 'primary' ? ['#5283EF', primary[600]] : variant === 'black' ? ['#2E2E2E', '#000000'] : null;
  const solidBg = variant === 'destructive' ? status.danger[600] : undefined;
  const borderColor =
    variant === 'line' ? primary[600] : variant === 'black' && isDark ? '#2A2A2A' : undefined;
  // Press tint: darken filled variants, soft wash on line/link.
  const washed = variant === 'line' || variant === 'link';
  const tint = washed ? colors.primaryTint : '#000000';
  const tintOpacity = washed ? 1 : 0.18;

  const LeftIcon = leftIcon === true ? IconPlus : leftIcon || undefined;
  const RightIcon = rightIcon === true ? IconArrowRight : rightIcon || undefined;
  const MainIcon = iconOnly ? icon : undefined;

  const press = (down: boolean) => {
    if (inactive) return;
    scale.value = withSpring(down ? 0.96 : 1, { damping: 14, stiffness: 320 });
    pressedOpacity.value = withSpring(down ? tintOpacity : 0, { damping: 20, stiffness: 400 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => press(true)}
      onPressOut={() => press(false)}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title ?? 'button'}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={{ alignSelf: fullWidth ? 'stretch' : 'flex-start' }}
    >
      <Animated.View
        style={[
          styles.base,
          {
            height: s.h,
            width: iconOnly ? s.h : undefined,
            paddingHorizontal: iconOnly ? 0 : variant === 'link' ? 8 : fullWidth ? Math.min(s.px, 12) : s.px,
            backgroundColor: solidBg,
            borderColor,
            borderWidth: borderColor ? 1 : 0,
            opacity: disabled ? 0.4 : 1,
          },
          animated,
        ]}
      >
        {gradient ? (
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={gradient[0]} />
                <Stop offset="1" stopColor={gradient[1]} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${gradId})`} />
          </Svg>
        ) : null}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint }, overlay]} />
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <View style={[styles.row, { gap: s.gap }]}>
            {leftNode}
            {LeftIcon ? <LeftIcon size={s.icon} color={fg} strokeWidth={2.25} /> : null}
            {MainIcon ? <MainIcon size={s.icon + 2} color={fg} strokeWidth={2.25} /> : null}
            {title ? (
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: typography.family.semibold,
                  fontSize: s.font,
                  color: fg,
                  letterSpacing: -0.01 * s.font,
                  textDecorationLine: variant === 'link' ? 'underline' : 'none',
                }}
              >
                {title}
              </Text>
            ) : null}
            {RightIcon ? <RightIcon size={s.icon} color={fg} strokeWidth={2.25} /> : null}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 9999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
