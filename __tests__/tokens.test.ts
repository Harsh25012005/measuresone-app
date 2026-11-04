import { colors, darkColors, radius, fontFamilyFor, touchTarget } from '../src/theme/tokens';

function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe.each([['light', colors], ['dark', darkColors]] as const)('%s palette', (_n, p) => {
  it.each([
    ['text on background', p.text, p.background],
    ['text on surface', p.text, p.surface],
    ['muted on background', p.textMuted, p.background],
    ['muted on surface-2', p.textMuted, p.surfaceSubtle],
    ['faint on surface', p.textFaint, p.surface],
    ['onPrimary on primary', p.onPrimary, p.primary],
    ['primary on background', p.primary, p.background],
    ['primary on tint', p.primary, p.primaryLight],
    ['success on tint', p.success, p.successLight],
    ['warning on tint', p.warning, p.warningLight],
    ['danger on tint', p.danger, p.dangerLight],
    ['paid badge', p.payment.paid.text, p.payment.paid.bg],
    ['partial badge', p.payment.partial.text, p.payment.partial.bg],
    ['unpaid badge', p.payment.unpaid.text, p.payment.unpaid.bg],
    ['ready badge', p.status.ready.text, p.status.ready.bg],
    ['stitching badge', p.status.stitching.text, p.status.stitching.bg],
    ['delivered badge', p.status.delivered.text, p.status.delivered.bg],
  ])('%s meets WCAG AA (4.5:1)', (_label, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

it('radius tokens stay within 2-4px except the status dot', () => {
  for (const [k, v] of Object.entries(radius)) {
    if (k === 'dot') continue;
    expect(v).toBeGreaterThanOrEqual(2);
    expect(v).toBeLessThanOrEqual(4);
  }
});

it('picks script-appropriate fonts', () => {
  expect(fontFamilyFor('en', 'bold')).toBe('PlusJakartaSans_700Bold');
  expect(fontFamilyFor('gu', 'regular')).toBe('NotoSansGujarati_400Regular');
  expect(fontFamilyFor('hi', 'medium')).toBe('NotoSansDevanagari_500Medium');
});

it('touch target is 48dp', () => expect(touchTarget).toBe(48));
