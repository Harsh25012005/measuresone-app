import * as fs from 'fs';
import * as path from 'path';

const UI_DIR = path.join(__dirname, '..', '..', 'src', 'components', 'ui');
// Icon.tsx holds SVG path data, not colours.
const files = fs.readdirSync(UI_DIR).filter((f) => f.endsWith('.tsx') && f !== 'Icon.tsx');

describe.each(files)('%s', (file) => {
  const src = fs.readFileSync(path.join(UI_DIR, file), 'utf8');
  const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

  it('has no hard-coded hex colours (use tokens)', () => {
    expect(code.match(/#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/g) ?? []).toEqual([]);
  });

  it('has no shadow, elevation or gradient', () => {
    expect(code).not.toMatch(/shadow(Color|Offset|Opacity|Radius)|elevation\s*:|boxShadow|LinearGradient|bg-gradient/);
  });

  it('uses only 2/3/4px radius classes (rounded-dot is for status dots)', () => {
    const classes = code.match(/rounded(?:-[trbl]{1,2})?(?:-(?:none|xs|sm|md|lg|xl|2xl|3xl|full|dot|\[[^\]]+\]))?(?![\w-])/g) ?? [];
    const bad = classes.filter((c) => /-(none|xs|xl|2xl|3xl|full|\[)/.test(c));
    expect(bad).toEqual([]);
  });
});
