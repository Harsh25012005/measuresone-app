import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';
import { IconClipboardList, IconHome, IconLayoutGrid, IconPlus, IconUsers, type TablerIcon } from './icons';

const f = typography.family;

export type DSNavItem = { key: string; label: string; icon: TablerIcon };

export const DEFAULT_NAV_ITEMS: DSNavItem[] = [
  { key: 'home', label: 'Home', icon: IconHome },
  { key: 'orders', label: 'Orders', icon: IconClipboardList },
  { key: 'clients', label: 'Clients', icon: IconUsers },
  { key: 'more', label: 'More', icon: IconLayoutGrid },
];

type Box = { x: number; w: number };

function NavTab({
  item,
  active,
  inactiveColor,
  onPress,
  onLayout,
}: {
  item: DSNavItem;
  active: boolean;
  inactiveColor: string;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
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
      onLayout={onLayout}
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
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const ready = useSharedValue(0);
  const fab = useSharedValue(0);

  const active = boxes[value];
  useEffect(() => {
    if (!active) return;
    if (ready.value === 0) {
      x.value = active.x;
      w.value = active.w;
      ready.value = 1;
    } else {
      x.value = withSpring(active.x, { damping: 20, stiffness: 260, mass: 0.8 });
      w.value = withSpring(active.w, { damping: 20, stiffness: 260, mass: 0.8 });
    }
  }, [active, x, w, ready]);

  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: w.value,
    opacity: ready.value,
  }));
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.06 * fab.value }, { rotate: `${fab.value * 90}deg` }],
  }));

  const onLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    setBoxes((b) => (b[key]?.x === lx && b[key]?.w === width ? b : { ...b, [key]: { x: lx, w: width } }));
  };

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.pill,
          { borderColor: dark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.85)' },
          !dark && styles.shadow,
        ]}
      >
        <Glass tint={dark ? 'dark' : 'light'} wash={dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.45)'} />
        <Animated.View style={[styles.thumb, thumb]} />
        {items.map((it) => (
          <NavTab
            key={it.key}
            item={it}
            active={it.key === value}
            inactiveColor={colors.textPrimary}
            onPress={() => onChange(it.key)}
            onLayout={onLayout(it.key)}
          />
        ))}
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
  thumb: { position: 'absolute', top: 2, bottom: 2, left: 0, borderRadius: 9999, backgroundColor: primary[600] },
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
