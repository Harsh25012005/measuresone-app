import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'measuresone:onboardingSeen';

/** Has this device already been through the intro slides? */
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    // If storage is unreadable, don't trap the user in the intro on every launch.
    return true;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // Non-fatal — the intro would just show once more.
  }
}
