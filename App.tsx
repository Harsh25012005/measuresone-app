import './global.css';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { LoadingSpinner, ToastProvider } from './components/ui';
import { AuthProvider } from './context/AuthContext';
import { ProductTourProvider } from './context/ProductTourContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { StatusBarProvider, useStatusBarHero } from './context/StatusBarContext';
import { RootNavigator } from './navigation/RootNavigator';
import { initI18n } from './lib/i18n';
import { initTheme, type ThemeMode } from './lib/theme';

/**
 * Paints the status bar strip to match the app's page background. Sits above
 * the navigator and ignores touches so it never blocks anything underneath.
 */
function StatusBarBackdrop() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const hero = useStatusBarHero();
  // Hero screens (blue gradient header) draw behind the status bar themselves.
  if (hero) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: insets.top,
        backgroundColor: colors.bgPage,
        zIndex: 999,
      }}
    />
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  const hero = useStatusBarHero();
  return <StatusBar style={hero || scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [i18nReady, setI18nReady] = useState(false);
  const [initialThemeMode, setInitialThemeMode] = useState<ThemeMode | null>(null);

  useEffect(() => {
    void initI18n().finally(() => setI18nReady(true));
    void initTheme().then(setInitialThemeMode);
  }, []);

  // Render anyway if the fonts fail — falling back to the system font beats
  // showing a blank screen forever.
  if ((!fontsLoaded && !fontError) || !i18nReady || initialThemeMode === null) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ThemeProvider initialMode={initialThemeMode}>
      <StatusBarProvider>
      <SafeAreaProvider>
        <ToastProvider>
          <AuthProvider>
            <ProductTourProvider>
              <RootNavigator />
            </ProductTourProvider>
          </AuthProvider>
        </ToastProvider>
        <StatusBarBackdrop />
        <ThemedStatusBar />
      </SafeAreaProvider>
      </StatusBarProvider>
    </ThemeProvider>
  );
}
