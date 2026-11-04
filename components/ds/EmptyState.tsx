import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';
import { DSButton } from './Button';
import { IconInbox, type TablerIcon } from './icons';

const f = typography.family;

export type DSEmptyStateProps = {
  icon?: TablerIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** full centers in the available space; compact is a tighter inline block. */
  variant?: 'full' | 'compact';
};

export function DSEmptyState({
  icon: Icon = IconInbox,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  variant = 'full',
}: DSEmptyStateProps) {
  const { colors } = useTheme();
  const compact = variant === 'compact';
  const badge = compact ? 64 : 88;

  return (
    <View style={[compact ? styles.compact : styles.full, compact && { borderColor: colors.borderDefault }]}>
      <View style={[styles.badge, { width: badge, height: badge, backgroundColor: colors.primaryTint }]}>
        <Icon size={compact ? 28 : 38} color={primary[600]} strokeWidth={1.8} />
      </View>

      <Text
        style={{ fontFamily: f.bold, fontSize: compact ? 17 : 20, color: colors.textPrimary, textAlign: 'center', marginTop: compact ? 16 : 22 }}
      >
        {title}
      </Text>
      {description ? (
        <Text
          style={{ fontFamily: f.regular, fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: 'center', marginTop: 6, maxWidth: 300 }}
        >
          {description}
        </Text>
      ) : null}

      {actionLabel || secondaryLabel ? (
        <View style={styles.actions}>
          {actionLabel ? (
            <View style={styles.center}>
              <DSButton title={actionLabel} onPress={onAction} leftIcon />
            </View>
          ) : null}
          {secondaryLabel ? (
            <View style={styles.center}>
              <DSButton title={secondaryLabel} variant="link" onPress={onSecondary} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  compact: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 24,
  },
  badge: { borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  actions: { alignSelf: 'stretch', alignItems: 'center', gap: 6, marginTop: 20 },
  center: { alignSelf: 'center' },
});
