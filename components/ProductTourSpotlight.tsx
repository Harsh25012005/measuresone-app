import { Pressable, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../src/components/ui/Text';
import { usePalette } from '../src/theme/usePalette';
import { MENU_LAYOUT } from './QuickAddMenu';
import { TOUR_STEPS, type TourStep } from '../context/ProductTourContext';

const { H_MARGIN, HEADER_H, ROW_H, FOOT_H } = MENU_LAYOUT;

export type ProductTourSpotlightProps = {
  step: TourStep;
  actionCount: number;
  /** Distance from the screen bottom to the quick-add sheet's bottom edge. */
  bottomOffset: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onTryItNow: () => void;
};

/**
 * Renders above the (forced-open) QuickAddMenu during the tour: a tooltip
 * card pointing at the currently spotlit row, positioned by the same row
 * geometry the menu itself uses, so no measuring/refs are needed.
 */
export function ProductTourSpotlight({
  step,
  actionCount,
  bottomOffset,
  onBack,
  onNext,
  onSkip,
  onTryItNow,
}: ProductTourSpotlightProps) {
  const { t } = useTranslation('settings');
  const { height: screenH } = useWindowDimensions();
  const palette = usePalette();

  const index = TOUR_STEPS.indexOf(step);
  const isLast = index === TOUR_STEPS.length - 1;
  const cardH = HEADER_H + actionCount * ROW_H + FOOT_H;
  const sheetTop = screenH - bottomOffset - cardH;
  const rowTop = sheetTop + HEADER_H + index * ROW_H;
  const rowCenterY = rowTop + ROW_H / 2;

  // Tooltip sits just above the row it's pointing at, right-aligned to the
  // sheet's inner edge, and never crowds above the status bar.
  const tooltipBottom = Math.max(screenH - rowCenterY + 34, screenH - sheetTop + 8);

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: screenH }}>
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: H_MARGIN, right: H_MARGIN, bottom: tooltipBottom }}
      >
        {/* Inverted card (ink on light theme, light on dark) so it stands out from the scrim. */}
        <View accessibilityLiveRegion="polite" className="rounded border border-line bg-ink p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row gap-1.5" accessible accessibilityLabel={`${index + 1} / ${TOUR_STEPS.length}`}>
              {TOUR_STEPS.map((s, i) => (
                <View
                  key={s}
                  className="h-1 rounded-sm"
                  style={{ width: 20, backgroundColor: i <= index ? palette.primary : palette.border }}
                />
              ))}
            </View>
            <Pressable
              onPress={onSkip}
              accessibilityRole="button"
              accessibilityLabel={t('appGuide.skip')}
              className="min-h-touch justify-center px-2"
            >
              <Text variant="label" tone="inverse" weight="regular">
                {t('appGuide.skip')}
              </Text>
            </Pressable>
          </View>

          <Text variant="bodyLg" tone="inverse" className="mb-1">
            {t(`appGuide.steps.${step}.title`)}
          </Text>
          <Text variant="body" tone="inverse" className="mb-4">
            {t(`appGuide.steps.${step}.description`)}
          </Text>

          <View className="flex-row items-center gap-2">
            {index > 0 ? (
              <Pressable
                onPress={onBack}
                accessibilityRole="button"
                className="min-h-touch items-center justify-center rounded border border-faint px-4 active:opacity-70"
              >
                <Text variant="label" tone="inverse">
                  {t('appGuide.back')}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onTryItNow}
              accessibilityRole="button"
              className="min-h-touch flex-1 items-center justify-center rounded border border-faint px-4 active:opacity-70"
            >
              <Text variant="label" tone="inverse" className="text-center">
                {t('appGuide.tryItNow')}
              </Text>
            </Pressable>
            <Pressable
              onPress={onNext}
              accessibilityRole="button"
              className="min-h-touch flex-1 items-center justify-center rounded bg-primary px-4 active:bg-primary-dark"
            >
              <Text variant="label" tone="onPrimary" className="text-center">
                {isLast ? t('appGuide.getStarted') : t('appGuide.next')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
