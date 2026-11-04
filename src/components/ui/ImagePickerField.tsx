import { Image, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { radius } from '../../theme/tokens';
import { focusRing, useFocus } from '../../theme/useFocus';
import { Icon } from './Icon';
import { Text } from './Text';

export type ImagePickerFieldProps = {
  label?: string;
  uri?: string | null;
  onChange: (uri: string) => void;
  aspect?: [number, number];
  source?: 'library' | 'camera';
  onPermissionDenied?: () => void;
  size?: number;
  className?: string;
  testID?: string;
};

/** Square photo slot, radius 4, dashed border when empty. */
export function ImagePickerField({
  label,
  uri,
  onChange,
  aspect = [1, 1],
  source = 'library',
  onPermissionDenied,
  size = 112,
  className = '',
  testID,
}: ImagePickerFieldProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();

  const pickImage = async () => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onPermissionDenied?.();
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect,
      quality: 0.7,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    const pickedUri = result.assets?.[0]?.uri;
    if (!result.canceled && pickedUri) onChange(pickedUri);
  };

  const addLabel = t('fields.addPhoto', { defaultValue: 'Add photo' });

  return (
    <View className={`mb-4 w-full ${className}`}>
      {label ? (
        <Text variant="label" className="mb-1.5">
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={pickImage}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, ${uri ? t('actions.edit') : addLabel}` : addLabel}
        testID={testID}
        {...handlers}
        className={`items-center justify-center overflow-hidden rounded border ${uri ? 'border-line' : 'border-dashed border-faint bg-surface'}`}
        style={[{ width: size, height: size }, focused ? focusRing(colors.primary) : null]}
      >
        {uri ? (
          <Image accessibilityIgnoresInvertColors source={{ uri }} style={{ width: size, height: size, borderRadius: radius.lg }} resizeMode="cover" />
        ) : (
          <View className="items-center justify-center p-2">
            <Icon name={source === 'camera' ? 'camera' : 'photo'} size={24} color={colors.primary} />
            <Text variant="caption" tone="muted" weight="regular" className="mt-1 text-center">
              {addLabel}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
