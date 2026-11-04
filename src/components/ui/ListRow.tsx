import { Pressable, View } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { focusRing, useFocus } from '../../theme/useFocus';
import { Icon } from './Icon';
import { Text } from './Text';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Small line under the subtitle (due date, order number...). */
  meta?: ReactNode;
  leading?: ReactNode;
  /** Right side content (amount, badge). */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Shows a chevron when pressable and no `trailing` is given. */
  showChevron?: boolean;
  divider?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

/** Standard list row: min 64dp high, 16dp padding, 1px divider, pressed = surface-2. */
export function ListRow({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  onPress,
  showChevron = true,
  divider = true,
  accessibilityLabel,
  testID,
}: ListRowProps) {
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();

  const body = (
    <>
      {leading ? <View className="mr-3">{leading}</View> : null}
      <View className="flex-1 py-3">
        <Text variant="bodyLg" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="label" tone="muted" weight="regular" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <View className="mt-1">{meta}</View> : null}
      </View>
      {trailing ? <View className="ml-3 items-end">{trailing}</View> : null}
      {onPress && showChevron && !trailing ? (
        <View className="ml-2">
          <Icon name="chev" size={18} color={colors.textFaint} />
        </View>
      ) : null}
    </>
  );

  const rowClass = `min-h-[64px] flex-row items-center bg-surface px-4 ${divider ? 'border-b border-line-2' : ''}`;

  if (!onPress) {
    return (
      <View className={rowClass} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      {...handlers}
      style={focused ? focusRing(colors.primary) : undefined}
      className={`${rowClass} active:bg-surface-2`}
    >
      {body}
    </Pressable>
  );
}
