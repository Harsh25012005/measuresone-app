import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * react-native-web ships `Alert.alert` as a no-op, so on web every confirm
 * dialog silently did nothing — e.g. picking UPI on a new order asks for
 * confirmation first, and the order was never created. Map it onto the
 * browser's own dialogs: the "cancel"-styled (or first) button is Cancel, the
 * last other button is OK.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons ?? [];

    if (list.length <= 1) {
      window.alert(text);
      list[0]?.onPress?.();
      return;
    }

    const cancel = list.find((b) => b.style === 'cancel') ?? list[0];
    const confirm = [...list].reverse().find((b) => b !== cancel) ?? list[list.length - 1];
    if (window.confirm(text)) confirm.onPress?.();
    else cancel.onPress?.();
  };
}
