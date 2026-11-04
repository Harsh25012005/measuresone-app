import { useTranslation } from 'react-i18next';
import { SegmentedControl } from '../src/components/ui';
import { setAppLanguage, SUPPORTED_LANGUAGES, type AppLanguage } from '../lib/i18n';

// Each language is shown in its own script so it can be found without reading English.
const OPTIONS: { label: string; value: AppLanguage }[] = [
  { label: 'English', value: 'en' },
  { label: 'ગુજરાતી', value: 'gu' },
  { label: 'हिन्दी', value: 'hi' },
];

/** Three-way language switch (English / Gujarati / Hindi) that applies immediately. */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = (SUPPORTED_LANGUAGES as readonly string[]).includes(i18n.language) ? (i18n.language as AppLanguage) : 'en';

  return <SegmentedControl options={OPTIONS} value={current} onChange={(l) => void setAppLanguage(l)} className={className} />;
}
