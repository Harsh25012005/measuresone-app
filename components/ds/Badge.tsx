import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../constants/tokens';
import type { TablerIcon } from './icons';

export type DSBadgeProps = {
  label: string;
  /** Resolved colours — build with the helpers below or pass your own. */
  bg: string;
  fg: string;
  icon?: TablerIcon;
  size?: 'sm' | 'md';
};

export function DSBadge({ label, bg, fg, icon: Icon, size = 'md' }: DSBadgeProps) {
  const sm = size === 'sm';
  return (
    <View style={[styles.badge, { backgroundColor: bg, height: sm ? 22 : 26, paddingHorizontal: sm ? 8 : 10 }]}>
      {Icon ? <Icon size={sm ? 11 : 13} color={fg} strokeWidth={2.5} /> : null}
      <Text style={{ fontFamily: typography.family.semibold, fontSize: sm ? 11 : 12, color: fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Neutral/primary pill used for counts and tags. */
export function useBadgeTones() {
  const { scheme } = useTheme();
  const dark = scheme === 'dark';
  return {
    neutral: { bg: dark ? '#242424' : '#F1F5F9', fg: dark ? '#CBD5E1' : '#475569' },
    primary: { bg: dark ? '#172554' : '#DBEAFE', fg: dark ? '#93C5FD' : '#1D4ED8' },
    success: { bg: dark ? '#0F3D2E' : '#D1FAE5', fg: dark ? '#6EE7B7' : '#047857' },
    warning: { bg: dark ? '#4A3A0F' : '#FEF3C7', fg: dark ? '#FCD34D' : '#B45309' },
    danger: { bg: dark ? '#4C1D1D' : '#FEE2E2', fg: dark ? '#FCA5A5' : '#B91C1C' },
  };
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 9999, alignSelf: 'flex-start' },
});
