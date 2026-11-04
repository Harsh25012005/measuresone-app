import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';
import { usePalette } from '../../theme/usePalette';
import { useReducedMotion } from '../../theme/useReducedMotion';
import { haptics } from '../../../lib/haptics';
import { Icon } from './Icon';
import { Text } from './Text';

export type SwipeAction = {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
};

export type SwipeRowProps = {
  children: ReactNode;
  /** Swipe right past 40% to commit this (e.g. "Ready" / "Deliver"). The caller shows the Undo toast. */
  commitAction?: SwipeAction & { tone?: 'success' | 'primary' };
  /** Swipe left to reveal these buttons (e.g. Call, WhatsApp). */
  revealActions?: SwipeAction[];
  testID?: string;
};

const ACTION_WIDTH = 80;
const COMMIT_RATIO = 0.4;

/**
 * Row with swipe shortcuts. Swiping is a shortcut only: every action is also
 * exposed as an accessibility action (TalkBack/VoiceOver) so nothing depends on
 * the gesture. Honours reduce-motion by snapping without animation.
 */
export function SwipeRow({ children, commitAction, revealActions = [], testID }: SwipeRowProps) {
  const palette = usePalette();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const open = useRef(false);
  const revealWidth = revealActions.length * ACTION_WIDTH;

  const animateTo = (to: number, done?: () => void) => {
    if (reduced) {
      x.setValue(to);
      done?.();
      return;
    }
    Animated.timing(x, { toValue: to, duration: 200, useNativeDriver: true }).start(done);
  };

  const widthRef = useRef(0);
  widthRef.current = width;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_e, g) => {
          const base = open.current ? -revealWidth : 0;
          const next = base + g.dx;
          const max = commitAction ? widthRef.current : 0;
          const min = revealWidth > 0 ? -revealWidth : 0;
          x.setValue(Math.max(min, Math.min(max, next)));
        },
        onPanResponderRelease: (_e, g) => {
          const base = open.current ? -revealWidth : 0;
          const end = base + g.dx;
          if (commitAction && end > widthRef.current * COMMIT_RATIO) {
            haptics.success();
            animateTo(0, () => commitAction.onPress());
            open.current = false;
          } else if (revealWidth > 0 && end < -revealWidth / 2) {
            open.current = true;
            animateTo(-revealWidth);
          } else {
            open.current = false;
            animateTo(0);
          }
        },
        onPanResponderTerminate: () => {
          animateTo(open.current ? -revealWidth : 0);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commitAction, revealWidth, reduced],
  );

  const all: SwipeAction[] = [...(commitAction ? [commitAction] : []), ...revealActions];
  const commitBg = commitAction?.tone === 'primary' ? palette.primary : palette.success;
  const commitFg = commitAction?.tone === 'primary' ? palette.onPrimary : palette.white;

  return (
    <View
      testID={testID}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className="overflow-hidden"
      accessibilityActions={all.map((a) => ({ name: a.key, label: a.label }))}
      onAccessibilityAction={(e) => all.find((a) => a.key === e.nativeEvent.actionName)?.onPress()}
    >
      {commitAction ? (
        <View className="absolute inset-y-0 left-0 flex-row items-center px-5" style={{ backgroundColor: commitBg, width: '100%' }}>
          <Icon name={commitAction.icon} size={22} color={commitFg} />
          <Text variant="label" className="ml-2" style={{ color: commitFg }}>
            {commitAction.label}
          </Text>
        </View>
      ) : null}

      {revealWidth > 0 ? (
        <View className="absolute inset-y-0 right-0 flex-row" style={{ width: revealWidth }}>
          {revealActions.map((a) => (
            <Pressable
              key={a.key}
              onPress={() => {
                haptics.tap();
                animateTo(0);
                open.current = false;
                a.onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              className="items-center justify-center bg-primary-50 active:bg-surface-2"
              style={{ width: ACTION_WIDTH }}
            >
              <Icon name={a.icon} size={22} color={palette.primary} />
              <Text variant="caption" tone="primary" className="mt-1">
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }] }} className="bg-surface">
        {children}
      </Animated.View>
    </View>
  );
}
