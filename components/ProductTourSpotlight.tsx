import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { DSButton } from './ds/Button';
import { QUICK_ADD_LAYOUT } from './ds/QuickAdd';
import { useTheme } from '../context/ThemeContext';
import { TOUR_STEPS, type TourStep } from '../context/ProductTourContext';
import { primary, typography } from '../constants/tokens';

const f = typography.family;
const { ITEM_H, GAP, FAB, FAB_GAP } = QUICK_ADD_LAYOUT;
const H_MARGIN = 16;

export type ProductTourSpotlightProps = {
  step: TourStep;
  actionCount: number;
  /** Distance from the screen bottom to the bottom of the round add button. */
  bottomOffset: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onTryItNow: () => void;
};

/**
 * Renders above the (forced-open) QuickAddMenu during the tour: a card in the app's own
 * surface style pointing at the currently spotlit row, positioned by the same row geometry
 * the menu itself uses, so no measuring/refs are needed.
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
  const { colors, scheme } = useTheme();
  const { height: screenH } = useWindowDimensions();
  const dark = scheme === 'dark';

  const index = TOUR_STEPS.indexOf(step);
  const isLast = index === TOUR_STEPS.length - 1;
  // The menu stacks upward from the add button, so the first step (index 0) is the row nearest it.
  const stackH = actionCount * ITEM_H + (actionCount - 1) * GAP;
  const sheetTop = screenH - bottomOffset - FAB - FAB_GAP - stackH;
  const rowFromTop = actionCount - 1 - index;
  const rowCenterY = sheetTop + rowFromTop * (ITEM_H + GAP) + ITEM_H / 2;

  // The card sits just above the row it's pointing at and never crowds the rows above.
  const tooltipBottom = Math.max(screenH - rowCenterY + 34, screenH - sheetTop + 8);

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: screenH }}>
      <Animated.View
        key={step}
        entering={FadeInDown.duration(240)}
        pointerEvents="box-none"
        style={{ position: 'absolute', left: H_MARGIN, right: H_MARGIN, bottom: tooltipBottom }}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.bgSurface, borderColor: dark ? '#262626' : colors.borderDefault },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.pills}>
              {TOUR_STEPS.map((s, i) => (
                <View
                  key={s}
                  style={[styles.pill, { width: i === index ? 24 : 8, backgroundColor: i === index ? primary[600] : colors.borderDefault }]}
                />
              ))}
              <Text style={{ fontFamily: f.medium, fontSize: 12, color: colors.textMuted, marginLeft: 6 }}>
                {index + 1}/{TOUR_STEPS.length}
              </Text>
            </View>
            <DSButton title={t('appGuide.skip')} variant="link" size="sm" onPress={onSkip} />
          </View>

          <Text style={{ fontFamily: f.bold, fontSize: 18, lineHeight: 25, color: colors.textPrimary }}>
            {t(`appGuide.steps.${step}.title`)}
          </Text>
          <Text style={{ fontFamily: f.regular, fontSize: 14, lineHeight: 21, color: colors.textMuted, marginTop: 4 }}>
            {t(`appGuide.steps.${step}.description`)}
          </Text>

          <View style={styles.actions}>
            {index > 0 ? (
              <View style={{ flex: 1 }}>
                <DSButton title={t('appGuide.back')} variant="line" size="rg" fullWidth onPress={onBack} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <DSButton title={t('appGuide.tryItNow')} variant="line" size="rg" fullWidth onPress={onTryItNow} />
            </View>
            <View style={{ flex: 1 }}>
              <DSButton title={isLast ? t('appGuide.getStarted') : t('appGuide.next')} size="rg" fullWidth onPress={onNext} />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 28, padding: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  pills: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { height: 8, borderRadius: 9999 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
});
