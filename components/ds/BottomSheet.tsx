import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { radii, typography } from '../../constants/tokens';
import { DSButton } from './Button';
import { IconX } from './icons';

const CAP_H = 32; // height of the drawn top edge (must cover the corner radius)
const NOTCH_D = 14; // how far the centre dips for the drag handle
const f = typography.family;

/** Top edge of the sheet: 32px corners with a shallow notch the handle sits in (Figma "Subtract"). */
function capPath(w: number) {
  const r = radii.sheet;
  const c = w / 2;
  return [
    `M0 ${CAP_H}`,
    `L0 ${r}`,
    `A${r} ${r} 0 0 1 ${r} 0`,
    `L${c - 62} 0`,
    `C${c - 46} 0 ${c - 44} ${NOTCH_D} ${c - 30} ${NOTCH_D}`,
    `L${c + 30} ${NOTCH_D}`,
    `C${c + 44} ${NOTCH_D} ${c + 46} 0 ${c + 62} 0`,
    `L${w - r} 0`,
    `A${r} ${r} 0 0 1 ${w} ${r}`,
    `L${w} ${CAP_H}`,
    'Z',
  ].join(' ');
}

export type DSBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Primary action pinned under the content. */
  actionLabel?: string;
  onAction?: () => void;
};

export function DSBottomSheet({ visible, onClose, title, children, actionLabel, onAction }: DSBottomSheetProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [width, setWidth] = useState(360);
  const sheetH = useRef(winH);
  const ty = useSharedValue(winH);
  const scrim = useSharedValue(0);
  const closing = useRef(false);

  useEffect(() => {
    if (visible) {
      closing.current = false;
      setMounted(true);
      ty.value = sheetH.current || winH;
      ty.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.9 });
      scrim.value = withTiming(1, { duration: 220 });
    } else if (mounted) {
      ty.value = withTiming(sheetH.current || winH, { duration: 220 });
      scrim.value = withTiming(0, { duration: 220 });
      const t = setTimeout(() => setMounted(false), 230);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          ty.value = Math.max(0, g.dy);
          scrim.value = Math.max(0, 1 - g.dy / 400);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 110 || g.vy > 0.9) {
            onClose();
          } else {
            ty.value = withSpring(0, { damping: 22, stiffness: 220 });
            scrim.value = withTiming(1, { duration: 150 });
          }
        },
      }),
    [onClose, ty, scrim],
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }, scrimStyle]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close sheet" />
        </Animated.View>

        <Animated.View
          onLayout={(e) => {
            sheetH.current = e.nativeEvent.layout.height;
            setWidth(e.nativeEvent.layout.width);
          }}
          style={[styles.sheet, { maxHeight: winH * 0.88 }, sheetStyle]}
        >
          {/* Shaped top edge + drag handle — drag here to dismiss. */}
          <View {...pan.panHandlers} style={{ height: CAP_H }}>
            <Svg width={width} height={CAP_H} style={StyleSheet.absoluteFill}>
              <Path d={capPath(width)} fill={colors.bgSurface} />
            </Svg>
            <View style={styles.handle} />
          </View>

          <View style={{ backgroundColor: colors.bgSurface, marginTop: -1, paddingTop: 1, paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                {title}
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel="Close"
                style={[styles.close, { backgroundColor: scheme === 'dark' ? '#242424' : '#F1F5F9' }]}
              >
                <IconX size={16} color={colors.textPrimary} strokeWidth={2.25} />
              </Pressable>
            </View>
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingTop: 0, paddingBottom: actionLabel ? 16 : 0 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
            {actionLabel ? <DSButton title={actionLabel} size="lg" fullWidth onPress={onAction ?? onClose} /> : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', alignSelf: 'center', maxWidth: 560 },
  handle: {
    position: 'absolute',
    top: 3,
    alignSelf: 'center',
    width: 52,
    height: 4,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -8, marginBottom: 8, gap: 12 },
  title: { fontFamily: f.semibold, fontSize: 20, lineHeight: 26, flex: 1 },
  close: { width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
