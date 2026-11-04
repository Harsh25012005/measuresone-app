import { Linking, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { focusRing, useFocus } from '../../theme/useFocus';
import { haptics } from '../../../lib/haptics';
import { useToast } from './Toast';
import { Icon } from './Icon';

export type CallButtonProps = {
  phone: string | null | undefined;
  size?: 'sm' | 'md';
};

/** Phone icon button that opens the dialer. 48dp (`sm`: 40dp + hit-slop). */
export function CallButton({ phone, size = 'md' }: CallButtonProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();
  const showToast = useToast();
  const number = (phone ?? '').replace(/[^\d+]/g, '');
  if (!number) return null;

  return (
    <Pressable
      onPress={async () => {
        haptics.tap();
        try {
          await Linking.openURL(`tel:${number}`);
        } catch {
          showToast(t('call.failed', { defaultValue: 'Could not open phone dialer' }), 'error');
        }
      }}
      hitSlop={size === 'sm' ? 4 : 0}
      accessibilityRole="button"
      accessibilityLabel={t('call.label', { phone: number, defaultValue: `Call ${number}` })}
      {...handlers}
      style={focused ? focusRing(colors.primary) : undefined}
      className={`${size === 'sm' ? 'h-10 w-10' : 'h-12 w-12'} items-center justify-center rounded border border-primary-50 bg-primary-50 active:bg-surface-2`}
    >
      <Icon name="phone" size={size === 'sm' ? 18 : 20} color={colors.primary} />
    </Pressable>
  );
}

export type WhatsAppButtonProps = {
  phone: string | null | undefined;
  message?: string;
  size?: 'sm' | 'md';
};

export function WhatsAppButton({ phone, message = '', size = 'md' }: WhatsAppButtonProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();
  const showToast = useToast();
  const cleanPhone = (phone ?? '').replace(/[^\d]/g, '');
  if (!cleanPhone) return null;

  const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;

  return (
    <Pressable
      onPress={async () => {
        haptics.tap();
        try {
          await Linking.openURL(url);
        } catch {
          showToast(t('whatsapp.failed', { defaultValue: 'Could not open WhatsApp' }), 'error');
        }
      }}
      hitSlop={size === 'sm' ? 4 : 0}
      accessibilityRole="button"
      accessibilityLabel="WhatsApp"
      {...handlers}
      style={focused ? focusRing(colors.primary) : undefined}
      className={`${size === 'sm' ? 'h-10 w-10' : 'h-12 w-12'} items-center justify-center rounded border border-line bg-surface active:bg-surface-2`}
    >
      <Icon name="chat" size={size === 'sm' ? 18 : 20} color={colors.primary} />
    </Pressable>
  );
}
