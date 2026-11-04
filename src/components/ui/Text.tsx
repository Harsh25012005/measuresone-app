import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamilyFor, lineHeight, typeScale, type FontWeightKey } from '../../theme/tokens';

export type TextVariant = 'caption' | 'label' | 'body' | 'bodyLg' | 'title' | 'headline' | 'display';
export type TextTone =
  | 'default'
  | 'muted'
  | 'faint'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'onPrimary'
  | 'inverse';

const VARIANTS: Record<TextVariant, { size: number; weight: FontWeightKey }> = {
  caption: { size: typeScale.xs, weight: 'semibold' },
  label: { size: typeScale.sm, weight: 'semibold' },
  body: { size: typeScale.base, weight: 'regular' },
  bodyLg: { size: typeScale.md, weight: 'semibold' },
  title: { size: typeScale.lg, weight: 'bold' },
  headline: { size: typeScale.xl, weight: 'bold' },
  display: { size: typeScale.display, weight: 'bold' },
};

const TONES: Record<TextTone, string> = {
  default: 'text-ink',
  muted: 'text-muted',
  faint: 'text-faint',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-accent',
  danger: 'text-danger',
  onPrimary: 'text-on-primary',
  inverse: 'text-bg',
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: FontWeightKey;
  /** Tabular figures: use for money, dates, measurements and order numbers. */
  tabular?: boolean;
  className?: string;
};

/**
 * The one text primitive. Picks the font file for the active language
 * (Plus Jakarta Sans / Noto Sans Gujarati / Noto Sans Devanagari), applies the
 * type scale and gives Indic scripts the taller line height they need.
 * Sizes are sp, so they follow the OS font scale.
 */
export function Text({
  variant = 'body',
  tone = 'default',
  weight,
  tabular = false,
  className = '',
  style,
  ...rest
}: TextProps) {
  const { i18n } = useTranslation();
  const lang = i18n?.language ?? 'en';
  const spec = VARIANTS[variant];
  const indic = lang === 'gu' || lang === 'hi';
  const multiplier = indic ? lineHeight.indic : lineHeight.latin;

  return (
    <RNText
      {...rest}
      className={`${TONES[tone]} ${className}`}
      style={[
        {
          fontFamily: fontFamilyFor(lang, weight ?? spec.weight),
          fontSize: spec.size,
          lineHeight: Math.round(spec.size * multiplier),
        },
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
