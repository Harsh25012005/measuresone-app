import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Modal as RNModal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { usePalette } from '../../theme/usePalette';
import { useReducedMotion } from '../../theme/useReducedMotion';
import { IconButton } from './IconButton';
import { Text } from './Text';

export type ModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Sticky action bar rendered below the (scrolling) content, e.g. a Save button. */
  footer?: ReactNode;
  /** Set false when the content is its own virtualised list (e.g. a FlatList). */
  scroll?: boolean;
};

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  return height;
}

/** Bottom sheet: radius 4 top corners, 1px top border, grab handle, scrim. No shadow. */
export function BottomSheet({ visible, onClose, title, children, footer, scroll = true }: ModalProps) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const reduced = useReducedMotion();
  const { t } = useTranslation('common');

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={reduced ? 'none' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        accessible={false}
        className="flex-1 justify-end"
        style={{ backgroundColor: palette.scrim }}
        onPress={onClose}
      >
        <Pressable
          accessible={false}
          accessibilityViewIsModal
          className="max-h-[90%] rounded-t border-t border-line bg-surface px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16), marginBottom: keyboardHeight }}
          onPress={() => {}}
        >
          <View className="mb-2 items-center">
            <View className="h-1 w-9 rounded-sm bg-line" />
          </View>

          {title ? (
            <View className="mb-2 flex-row items-center justify-between border-b border-line-2 pb-2">
              <Text variant="title" className="flex-1" accessibilityRole="header">
                {title}
              </Text>
              <IconButton icon="x" onPress={onClose} accessibilityLabel={t('actions.close')} variant="ghost" className="-mr-2" />
            </View>
          ) : null}

          {scroll ? (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            children
          )}

          {footer ? <View className="pt-3">{footer}</View> : null}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

/** Centred dialog, radius 4. Use only for destructive confirmations. */
export function Modal({ visible, onClose, title, children, footer }: ModalProps) {
  const palette = usePalette();
  const reduced = useReducedMotion();
  const { t } = useTranslation('common');

  return (
    <RNModal visible={visible} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        accessible={false}
        className="flex-1 items-center justify-center px-4"
        style={{ backgroundColor: palette.scrim }}
        onPress={onClose}
      >
        <Pressable
          accessible={false}
          accessibilityViewIsModal
          className="w-full max-w-[360px] rounded border border-line bg-surface p-5"
          onPress={() => {}}
        >
          {title ? (
            <View className="mb-3 flex-row items-center justify-between">
              <Text variant="title" className="flex-1" accessibilityRole="header">
                {title}
              </Text>
              <IconButton icon="x" onPress={onClose} accessibilityLabel={t('actions.close')} variant="ghost" className="-mr-2" />
            </View>
          ) : null}
          {children}
          {footer ? <View className="pt-4">{footer}</View> : null}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

export const CenterModal = Modal;
