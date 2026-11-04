import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';
import { IconCamera, IconPencil } from './icons';

export type DSImagePickerProps = {
  label?: string;
  uri?: string | null;
  onChange: (uri: string) => void;
  aspect?: [number, number];
  /** Where the image comes from. Defaults to the photo library. */
  source?: 'library' | 'camera';
  /** Called when the required OS permission was refused. */
  onPermissionDenied?: () => void;
  /** Diameter in px. */
  size?: number;
};

/** Round photo picker: dashed ring with a camera when empty, the photo plus an edit badge once chosen. */
export function DSImagePicker({
  label,
  uri,
  onChange,
  aspect = [1, 1],
  source = 'library',
  onPermissionDenied,
  size = 104,
}: DSImagePickerProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pickImage = async () => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onPermissionDenied?.();
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.7 };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const picked = result.assets?.[0]?.uri;
    if (!result.canceled && picked) onChange(picked);
  };

  return (
    <View>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <Pressable
        onPress={pickImage}
        onPressIn={() => (scale.value = withSpring(0.96, { damping: 14, stiffness: 400 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 10, stiffness: 300 }))}
        accessibilityRole="button"
        accessibilityLabel={label ?? t('fields.addPhoto')}
        style={{ alignSelf: 'flex-start' }}
      >
        <Animated.View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              backgroundColor: uri ? colors.bgSubtle : colors.primaryTint,
              borderColor: uri ? colors.borderDefault : primary[600],
              borderStyle: uri ? 'solid' : 'dashed',
            },
            style,
          ]}
        >
          {uri ? (
            <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
          ) : (
            <View style={{ alignItems: 'center', gap: 4 }}>
              <IconCamera size={size * 0.26} color={primary[600]} strokeWidth={1.9} />
              <Text style={{ fontFamily: typography.family.medium, fontSize: 12, color: primary[600] }}>
                {t('fields.addPhoto')}
              </Text>
            </View>
          )}
        </Animated.View>
        {uri ? (
          <View style={[styles.badge, { borderColor: colors.bgPage }]}>
            <IconPencil size={14} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: typography.family.semibold, fontSize: 13, marginBottom: 8 },
  circle: { borderRadius: 9999, borderWidth: 1.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 9999,
    borderWidth: 2,
    backgroundColor: primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
