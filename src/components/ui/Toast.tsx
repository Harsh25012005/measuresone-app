import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors as lightColors, darkColors } from '../../theme/tokens';
import { useTheme } from '../../../context/ThemeContext';
import { useReducedMotion } from '../../theme/useReducedMotion';
import { Icon } from './Icon';
import { Text } from './Text';

export type ToastType = 'success' | 'error' | 'info';

type ShowToastOptions = {
  type?: ToastType;
  duration?: number;
  icon?: string;
  undoAction?: () => void;
  undoLabel?: string;
};

type ShowToast = (message: string, options?: ShowToastOptions | ToastType, duration?: number) => void;

type ToastState = {
  message: string;
  type: ToastType;
  icon?: string;
  undoAction?: () => void;
  undoLabel?: string;
  key: number;
};

const ToastContext = createContext<ShowToast>(() => {});

const DEFAULT_DURATION = 4000;
const UNDO_DURATION = 5000;

/**
 * Toast: radius 4, inverted surface (dark ink on light theme, light on dark),
 * announced to screen readers. Toasts with an Undo action stay for 5s.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterRef = useRef(0);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(12));
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');
  const { scheme } = useTheme();
  const reduced = useReducedMotion();
  // Inverted: on a light theme the toast is dark, so use the dark palette's accents.
  const accents = scheme === 'dark' ? lightColors : darkColors;

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const showToast = useCallback<ShowToast>(
    (message, optOrType = 'info', durationFallback) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      counterRef.current += 1;

      let type: ToastType = 'info';
      let duration = durationFallback;
      let icon: string | undefined;
      let undoAction: (() => void) | undefined;
      let undoLabel: string | undefined;

      if (typeof optOrType === 'string') {
        type = optOrType;
      } else if (typeof optOrType === 'object') {
        type = optOrType.type || 'info';
        duration = optOrType.duration ?? durationFallback;
        icon = optOrType.icon;
        undoAction = optOrType.undoAction;
        undoLabel = optOrType.undoLabel;
      }
      duration = duration ?? (undoAction ? UNDO_DURATION : DEFAULT_DURATION);

      if (!icon) icon = type === 'success' ? 'circleCheck' : type === 'error' ? 'alert' : 'info';

      setToast({ message, type, icon, undoAction, undoLabel, key: counterRef.current });

      const moveMs = reduced ? 0 : 150;
      opacity.setValue(0);
      translateY.setValue(reduced ? 0 : 12);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: reduced ? 100 : moveMs, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: moveMs, useNativeDriver: true }),
      ]).start();

      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setToast(null));
      }, duration);
    },
    [opacity, translateY, reduced],
  );

  const accent = toast?.type === 'error' ? accents.danger : toast?.type === 'success' ? accents.success : accents.primary;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            bottom: insets.bottom + 72,
            left: 16,
            right: 16,
            alignItems: 'center',
            opacity,
            transform: [{ translateY }],
            zIndex: 99999,
          }}
        >
          <View
            accessible
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            accessibilityLabel={toast.message}
            className="min-h-touch max-w-full flex-row items-center rounded bg-ink pl-3"
          >
            {toast.icon ? (
              <View className="mr-2">
                <Icon name={toast.icon} size={20} color={accent} />
              </View>
            ) : null}
            <Text variant="label" tone="inverse" className="my-2 flex-shrink">
              {toast.message}
            </Text>

            {toast.undoAction ? (
              <Pressable
                onPress={() => {
                  toast.undoAction?.();
                  setToast(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={toast.undoLabel || t('actions.undo')}
                className="ml-1 min-h-touch justify-center px-3"
              >
                <Text variant="label" weight="bold" style={{ color: accent }}>
                  {toast.undoLabel || t('actions.undo')}
                </Text>
              </Pressable>
            ) : (
              <View className="w-3" />
            )}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
