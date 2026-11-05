import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';
import { DSBottomSheet } from './BottomSheet';
import { DSButton } from './Button';
import type { TablerIcon } from './icons';

const f = typography.family;

/**
 * Bottom-sheet replacement for native Alert confirmations: a tinted round icon, a headline,
 * an optional highlighted amount, one line of context, then a primary and a secondary action.
 */
export function DSConfirmSheet({
  visible,
  onClose,
  icon: Icon,
  title,
  message,
  amount,
  confirmLabel,
  cancelLabel,
  onConfirm,
  loading = false,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  icon: TablerIcon;
  title: string;
  message?: string;
  /** Big figure shown under the title, e.g. "₹1,500". */
  amount?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  /** Extra content between the message and the buttons (inputs, pickers). */
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <DSBottomSheet visible={visible} onClose={onClose}>
      <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 8, gap: 10 }}>
        <View style={{ width: 64, height: 64, borderRadius: 9999, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={30} color={primary[600]} strokeWidth={2} />
        </View>
        <Text style={{ fontFamily: f.bold, fontSize: 20, lineHeight: 27, color: colors.textPrimary, textAlign: 'center' }}>{title}</Text>
        {amount ? <Text style={{ fontFamily: f.bold, fontSize: 30, lineHeight: 38, color: primary[600] }}>{amount}</Text> : null}
        {message ? (
          <Text style={{ fontFamily: f.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center' }}>{message}</Text>
        ) : null}
      </View>
      {children ? <View style={{ gap: 16, paddingTop: 8 }}>{children}</View> : null}
      <View style={{ gap: 10, paddingTop: 20, paddingBottom: 8 }}>
        <DSButton title={confirmLabel} size="lg" fullWidth onPress={onConfirm} loading={loading} />
        <DSButton title={cancelLabel} size="lg" variant="line" fullWidth onPress={onClose} disabled={loading} />
      </View>
    </DSBottomSheet>
  );
}
