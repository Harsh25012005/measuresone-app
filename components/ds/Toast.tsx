import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { primary, status, typography } from '../../constants/tokens';
import { IconAlertTriangle, IconCircleCheck, IconCircleX, IconInfoCircle, type TablerIcon } from './icons';

const f = typography.family;

export type DSToastTone = 'success' | 'error' | 'warning' | 'info';

export type DSToastOptions = {
  title: string;
  message?: string;
  tone?: DSToastTone;
  /** ms before it dismisses itself. 0 keeps it until dismissed. Default 3500. */
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastItem = Required<Pick<DSToastOptions, 'title' | 'tone' | 'duration'>> &
  Pick<DSToastOptions, 'message' | 'actionLabel' | 'onAction'> & { id: number };

const TONES: Record<DSToastTone, { color: string; tintLight: string; tintDark: string; Icon: TablerIcon }> = {
  success: { color: status.success[600], tintLight: status.success[100], tintDark: '#0F2E1C', Icon: IconCircleCheck },
  error: { color: status.danger[600], tintLight: status.danger[100], tintDark: '#3A1414', Icon: IconCircleX },
  warning: { color: status.warning[600], tintLight: status.warning[100], tintDark: '#33240A', Icon: IconAlertTriangle },
  info: { color: primary[600], tintLight: primary[100], tintDark: primary[950], Icon: IconInfoCircle },
};

type Api = {
  show: (o: DSToastOptions) => number;
  dismiss: (id: number) => void;
  success: (title: string, message?: string) => number;
  error: (title: string, message?: string) => number;
  warning: (title: string, message?: string) => number;
  info: (title: string, message?: string) => number;
};

const Ctx = createContext<Api | null>(null);

export function useDSToast(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDSToast must be used inside <DSToastProvider>');
  return v;
}

const MAX_VISIBLE = 3;

export function DSToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);

  const show = useCallback((o: DSToastOptions) => {
    const id = ++counter.current;
    const item: ToastItem = { ...o, tone: o.tone ?? 'info', duration: o.duration ?? 3500, id };
    setItems((l) => [item, ...l].slice(0, MAX_VISIBLE));
    return id;
  }, []);

  const api = useMemo<Api>(
    () => ({
      show,
      dismiss,
      success: (title, message) => show({ title, message, tone: 'success' }),
      error: (title, message) => show({ title, message, tone: 'error', duration: 5000 }),
      warning: (title, message) => show({ title, message, tone: 'warning' }),
      info: (title, message) => show({ title, message, tone: 'info' }),
    }),
    [show, dismiss],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
        {items.map((t) => (
          <Toast key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </View>
    </Ctx.Provider>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const t = TONES[item.tone];
  const Icon = t.Icon;

  useEffect(() => {
    if (!item.duration) return;
    const id = setTimeout(onDismiss, item.duration);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(16).stiffness(220)}
      exiting={FadeOutUp.duration(160)}
      layout={LinearTransition.springify().damping(18)}
      style={[
        styles.toast,
        {
          backgroundColor: dark ? '#1C1C1C' : '#FFFFFF',
          borderColor: dark ? '#2E2E2E' : colors.borderDefault,
        },
      ]}
    >
      <Pressable onPress={onDismiss} style={styles.row} accessibilityRole="alert">
        <Icon size={20} color={t.color} strokeWidth={2.2} />
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.actionLabel ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              item.onAction?.();
              onDismiss();
            }}
          >
            <Text style={{ fontFamily: f.semibold, fontSize: 14, color: primary[dark ? 400 : 600] }}>{item.actionLabel}</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, zIndex: 9999, gap: 8, alignItems: 'center' },
  toast: {
    alignSelf: 'center',
    maxWidth: 480,
    borderRadius: 9999,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 48 },
  title: { fontFamily: f.medium, fontSize: 14, lineHeight: 20, flexShrink: 1 },
});
