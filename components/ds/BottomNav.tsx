import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { neutral, primary, typography } from '../../constants/tokens';
import { IconClipboardList, IconHome, IconLayoutGrid, IconPlus, IconUsers, type TablerIcon } from './icons';

const f = typography.family;

export type DSNavItem = { key: string; label: string; icon: TablerIcon };

export const DEFAULT_NAV_ITEMS: DSNavItem[] = [
  { key: 'home', label: 'Home', icon: IconHome },
  { key: 'orders', label: 'Orders', icon: IconClipboardList },
  { key: 'clients', label: 'Clients', icon: IconUsers },
  { key: 'more', label: 'More', icon: IconLayoutGrid },
];

function NavTab({
  item,
  active,
  inactiveColor,
  onPress,
}: {
  item: DSNavItem;
  active: boolean;
  inactiveColor: string;
  onPress: () => void;
}) {
  const pop = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    pop.value = withSpring(active ? 1 : 0, { damping: 12, stiffness: 320, mass: 0.7 });
  }, [active, pop]);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -1.5 * pop.value }, { scale: 1 + 0.12 * pop.value }],
  }));
  const Icon = item.icon;
  const color = active ? '#FFFFFF' : inactiveColor;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      style={styles.tab}
    >
      <Animated.View style={iconStyle}>
        <Icon size={18} color={color} strokeWidth={1.9} />
      </Animated.View>
      <Text style={{ fontFamily: f.medium, fontSize: 12, color }} numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );
}

/** Frosted-glass backing: blur + soft tint + a faint top-light sheen. */
function Glass({ tint, wash, intensity = 45 }: { tint: 'light' | 'dark'; wash: string; intensity?: number }) {
  return (
    <>
      <BlurView intensity={intensity} tint={tint} style={[StyleSheet.absoluteFill, { borderRadius: 9999 }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: wash, borderRadius: 9999 }]} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#sheen)" />
      </Svg>
    </>
  );
}

export type DSBottomNavProps = {
  items?: DSNavItem[];
  value: string;
  onChange: (key: string) => void;
  /** Round action button on the right (e.g. quick add). Omit to hide it. */
  onFabPress?: () => void;
  fabIcon?: TablerIcon;
};

/**
 * Floating pill tab bar plus a separate round action button (Figma "Bottom nav
 * bar"). The active tab's blue pill slides between items.
 */
export function DSBottomNav({
  items = DEFAULT_NAV_ITEMS,
  value,
  onChange,
  onFabPress,
  fabIcon: FabIcon = IconPlus,
}: DSBottomNavProps) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const [innerW, setInnerW] = useState(0);
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const ready = useSharedValue(0);
  const fab = useSharedValue(0);

  const slot = items.length > 0 ? innerW / items.length : 0;
  const index = Math.max(0, items.findIndex((it) => it.key === value));
  useEffect(() => {
    if (slot <= 0) return;
    if (ready.value === 0) {
      x.value = index * slot;
      w.value = slot;
      ready.value = 1;
    } else {
      x.value = withSpring(index * slot, { damping: 20, stiffness: 260, mass: 0.8 });
      w.value = withSpring(slot, { damping: 20, stiffness: 260, mass: 0.8 });
    }
  }, [index, slot, x, w, ready]);

  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: w.value,
    opacity: ready.value,
  }));
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.06 * fab.value }, { rotate: `${fab.value * 90}deg` }],
  }));

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.pill,
          { borderColor: dark ? neutral[600] : neutral[300], borderWidth: 1.5 },
          !dark && styles.shadow,
        ]}
      >
        {/* Android only blurs with an experimental method, so there the bar gets an almost solid wash to stay readable over scrolling content */}
        <Glass
          tint={dark ? 'dark' : 'light'}
          wash={
            Platform.OS === 'android'
              ? dark ? 'rgba(18,18,18,0.94)' : 'rgba(255,255,255,0.94)'
              : dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.45)'
          }
        />
        <View style={{ flex: 1, flexDirection: 'row' }} onLayout={(e: LayoutChangeEvent) => setInnerW(e.nativeEvent.layout.width)}>
          <Animated.View style={[styles.thumb, thumb]} />
          {items.map((it) => (
            <NavTab
              key={it.key}
              item={it}
              active={it.key === value}
              inactiveColor={colors.textPrimary}
              onPress={() => onChange(it.key)}
            />
          ))}
        </View>
      </View>

      {onFabPress ? (
        <Pressable
          onPress={onFabPress}
          onPressIn={() => (fab.value = withSpring(1, { damping: 14, stiffness: 300 }))}
          onPressOut={() => (fab.value = withSpring(0, { damping: 14, stiffness: 300 }))}
          accessibilityRole="button"
          accessibilityLabel="Quick add"
        >
          <Animated.View
            style={[
              styles.fab,
              { borderColor: primary[700] },
              fabStyle,
            ]}
          >
            <Glass tint={dark ? 'dark' : 'light'} wash="rgba(37,99,235,0.95)" intensity={50} />
            <View style={{ zIndex: 1 }}>
              <FabIcon size={30} color="#FFFFFF" strokeWidth={2} />
            </View>
          </Animated.View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    padding: 2,
    overflow: 'hidden',
  },
  thumb: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 9999, backgroundColor: primary[600] },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 8 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
