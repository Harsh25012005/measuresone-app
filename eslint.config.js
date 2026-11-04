const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    // React Compiler lint rules flag patterns that are common in the legacy
    // screens/primitives (Animated.Value refs, setState in effects). They stay
    // visible as warnings and are cleaned up as each file is rebuilt (Phases B-D).
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  { ignores: ['node_modules/**', 'dist/**', '.expo/**', 'android/**', 'ios/**', 'supabase/**', 'scripts/**', 'jest.setup.ts'] },
];
