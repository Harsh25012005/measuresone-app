import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';
import type { TablerIcon } from './icons';

const f = typography.family;

export type DSTabItem = {
  key: string;
  label: string;
  icon?: TablerIcon;
  /** Small count bubble, e.g. number of orders. */
  count?: number;
};

export type DSTabsProps = {
  items: DSTabItem[];
  value: string;
  onChange: (key: string) => void;
  /**
   * pill: segmented control with a sliding thumb (equal widths).
   * underline: text tabs with a sliding indicator.
   * chip: scrollable filter chips.
   */
  variant?: 'pill' | 'underline' | 'chip';
};

type Box = { x: number; w: number };

function Count({ n, active, onFill }: { n: number; active: boolean; onFill: boolean }) {
  const { scheme } = useTheme();
  const dark = scheme === 'dark';
  const bg = active ? (onFill ? 'rgba(255,255,255,0.25)' : primary[600]) : dark ? '#2A2A2A' : '#E2E8F0';
  const fg = active ? '#FFFFFF' : dark ? '#CBD5E1' : '#475569';
  return (
    <View style={[styles.count, { backgroundColor: bg }]}>
      <Text style={{ fontFamily: f.bold, fontSize: 10, color: fg }}>{n}</Text>
    </View>
  );
}

export function DSTabs({ items, value, onChange, variant = 'pill' }: DSTabsProps) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const ready = useSharedValue(0);

  const active = boxes[value];
  useEffect(() => {
    if (!active) return;
    if (ready.value === 0) {
      // First measurement: jump, don't animate in from 0.
      x.value = active.x;
      w.value = active.w;
      ready.value = 1;
    } else {
      x.value = withSpring(active.x, { damping: 20, stiffness: 260, mass: 0.8 });
      w.value = withSpring(active.w, { damping: 20, stiffness: 260, mass: 0.8 });
    }
  }, [active, x, w, ready]);

  const indicator = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: w.value,
    opacity: ready.value,
  }));

  const onLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    setBoxes((b) => (b[key]?.x === lx && b[key]?.w === width ? b : { ...b, [key]: { x: lx, w: width } }));
  };

  const trackBg = dark ? '#141414' : '#F1F5F9';

  const renderTab = (it: DSTabItem) => {
    const isActive = it.key === value;
    const Icon = it.icon;
    const chip = variant === 'chip';
    const fg =
      chip && isActive ? '#FFFFFF' : isActive ? (variant === 'pill' ? colors.textPrimary : primary[600]) : colors.textMuted;
    return (
      <Pressable
        key={it.key}
        onPress={() => onChange(it.key)}
        onLayout={onLayout(it.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        style={[
          styles.tab,
          variant === 'pill' && styles.tabPill,
          variant === 'underline' && styles.tabUnderline,
          chip && [
            styles.tabChip,
            { backgroundColor: isActive ? primary[600] : 'transparent', borderColor: isActive ? primary[600] : colors.borderDefault },
          ],
        ]}
      >
        {Icon ? <Icon size={16} color={fg} strokeWidth={2.1} /> : null}
        <Text style={{ fontFamily: isActive ? f.semibold : f.medium, fontSize: 14, color: fg }} numberOfLines={1}>
          {it.label}
        </Text>
        {it.count !== undefined ? <Count n={it.count} active={isActive} onFill={chip} /> : null}
      </Pressable>
    );
  };

  if (variant === 'chip') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {items.map(renderTab)}
      </ScrollView>
    );
  }

  if (variant === 'underline') {
    return (
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.borderDefault }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {items.map(renderTab)}
            <Animated.View style={[styles.underline, indicator]} />
          </View>
        </ScrollView>
      </View>
    );
  }

  // pill
  return (
    <View style={[styles.pillTrack, { backgroundColor: trackBg }]}>
      <Animated.View
        style={[
          styles.pillThumb,
          { backgroundColor: dark ? '#2A2A2A' : '#FFFFFF' },
          indicator,
        ]}
      />
      {items.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabPill: { flex: 1, height: 40, zIndex: 1 },
  tabUnderline: { paddingHorizontal: 14, height: 44 },
  tabChip: { height: 36, paddingHorizontal: 14, borderRadius: 9999, borderWidth: 1 },
  pillTrack: { flexDirection: 'row', padding: 4, borderRadius: 9999 },
  pillThumb: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  underline: { position: 'absolute', bottom: 0, left: 0, height: 3, borderRadius: 9999, backgroundColor: primary[600] },
  count: { minWidth: 18, height: 18, borderRadius: 9999, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
});
