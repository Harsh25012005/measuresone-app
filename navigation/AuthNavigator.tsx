import { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ConfirmEmailScreen from '../screens/auth/ConfirmEmailScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { LoadingSpinner } from '../components/ui';
import { hasSeenOnboarding } from '../lib/onboarding';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  // First launch on this device starts with the intro slides; after that, straight to Login.
  const [initial, setInitial] = useState<'Onboarding' | 'Login' | null>(null);

  useEffect(() => {
    void hasSeenOnboarding().then((seen) => setInitial(seen ? 'Login' : 'Onboarding'));
  }, []);

  if (!initial) return <LoadingSpinner fullScreen />;

  return (
    <Stack.Navigator initialRouteName={initial} screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ConfirmEmail" component={ConfirmEmailScreen} />
    </Stack.Navigator>
  );
}
