import * as fs from 'fs';
import * as path from 'path';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Real English strings, so tests fail when a component asks for a missing key.
const mockEn: Record<string, unknown> = {};
for (const file of fs.readdirSync(path.join(__dirname, 'locales', 'en'))) {
  if (file.endsWith('.json')) {
    mockEn[file.replace('.json', '')] = JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', 'en', file), 'utf8'));
  }
}

function mockLookup(key: string, defaultNs: string): unknown {
  const [ns, rest] = key.includes(':') ? key.split(':') : [defaultNs, key];
  return rest.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], mockEn[ns]);
}


jest.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const found = mockLookup(key, ns ?? 'common');
      const text = typeof found === 'string' ? found : (opts?.defaultValue as string | undefined);
      if (text === undefined) throw new Error(`Missing i18n key: ${key}`);
      return text.replace(/\{\{(\w+)\}\}/g, (_m, k) => String(opts?.[k] ?? ''));
    },
    i18n: { language: (global as { __testLanguage?: string }).__testLanguage ?? 'en' },
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: { requestPermissionsAsync: jest.fn(), start: jest.fn(), stop: jest.fn() },
  useSpeechRecognitionEvent: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
