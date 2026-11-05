import { useTranslation } from 'react-i18next';
import { DSConfirmSheet } from './ds/ConfirmSheet';
import { IconCompass } from './ds/icons';
import { useProductTour } from '../context/ProductTourContext';

/** The one popup that offers the app tour: take it, or skip. */
export function ProductTourWelcome() {
  const { t } = useTranslation('settings');
  const { step, next, finish } = useProductTour();

  return (
    <DSConfirmSheet
      visible={step === 'welcome'}
      onClose={finish}
      icon={IconCompass}
      title={t('appGuide.welcome.title')}
      message={t('appGuide.welcome.subtitle')}
      confirmLabel={t('appGuide.welcome.cta')}
      cancelLabel={t('appGuide.skip')}
      onConfirm={next}
    />
  );
}
