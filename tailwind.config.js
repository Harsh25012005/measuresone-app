// Theme-aware color backed by an RGB-triplet CSS variable from global.css.
const tv = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './App.tsx',
    './screens/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './navigation/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  // Disabled: Tailwind's built-in fontWeight utilities use the exact same
  // class names (font-medium, font-semibold, font-bold) as our custom
  // fontFamily entries below. With both active, every "font-bold" element
  // got fontFamily AND fontWeight applied together — Android then couldn't
  // find a "bold variant" of the custom (single static weight) font family
  // and silently fell back to the system font. Disabling this corePlugin
  // means font-bold etc. only ever select the custom font file.
  corePlugins: {
    fontWeight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: tv('primary'),
          dark: tv('primary-dark'),
          50: tv('primary-tint'),
          100: '#D3D8F7',
          200: '#A9B1EE',
          300: '#7F8AE0',
          400: '#5563CE',
          500: '#4350C3',
          600: '#3340B8',
          700: '#28339A',
          800: '#1F287A',
          900: '#171E5A',
          950: '#0D1033',
        },
        // Semantic tokens are CSS variables (defined in global.css for :root and
        // .dark:root) so classes like text-ink / bg-surface follow dark mode
        // without every call site needing its own dark: variant.
        surface: {
          DEFAULT: tv('surface'),
          2: tv('surface-2'),
        },
        ink: {
          DEFAULT: tv('ink'),
          muted: tv('muted'),
          faint: tv('faint'),
        },
        line: {
          DEFAULT: tv('line'),
          2: tv('line-2'),
        },
        success: {
          DEFAULT: tv('success'),
          50: tv('success-tint'),
        },
        warning: {
          DEFAULT: tv('accent'),
          50: tv('accent-tint'),
        },
        danger: {
          DEFAULT: tv('danger'),
          50: tv('danger-tint'),
        },
        accent: {
          DEFAULT: tv('accent'),
          50: tv('accent-tint'),
        },
        info: tv('primary'),
        bg: tv('bg'),
        muted: tv('muted'),
        faint: tv('faint'),
        'on-primary': tv('on-primary'),
      },
      // Only 2/3/4px are allowed (DESIGN.md). Legacy sizes clamp to 4px;
      // `rounded-dot` is reserved for status dots.
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '3px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        '3xl': '4px',
        full: '4px',
        dot: '9999px',
      },
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        medium: ['PlusJakartaSans_500Medium'],
        semibold: ['PlusJakartaSans_600SemiBold'],
        bold: ['PlusJakartaSans_700Bold'],
      },
      minHeight: { touch: '48px' },
      minWidth: { touch: '48px' },
    },
  },
  plugins: [],
}
