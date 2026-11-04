#!/usr/bin/env node
/**
 * Design-rule check (DESIGN.md §Radius, §Elevation). Fails when:
 *  - a borderRadius / rounded-[Npx] value is outside 2-4px (status dots may
 *    use `radius.dot` / `rounded-dot`),
 *  - any shadow, elevation or gradient is used,
 *  - global.css colour variables drift from src/theme/tokens.ts.
 * Usage: node scripts/check-design-rules.js [--summary]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'assets', 'supabase', 'docs', 'scripts', '.expo', 'android', 'ios', '__tests__']);
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);
const SELF_ALLOW = new Set([
  'tailwind.config.js',
  'lib/billPdf.ts', // printed/shared bill HTML, not app UI
]);
// Known violations scheduled for removal; reported as warnings, not failures.
// Delete an entry as soon as its phase fixes the file.
const PENDING = new Set([
]);
const warnings = [];

const problems = [];
const add = (file, line, msg) => {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  (PENDING.has(rel) ? warnings : problems).push(`${rel}:${line}  ${msg}`);
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out);
    } else if (EXTS.has(path.extname(e.name))) out.push(path.join(dir, e.name));
  }
  return out;
}

const RULES = [
  { re: /\bshadow(Color|Offset|Opacity|Radius)\b|\bboxShadow\b|\btextShadow(Color|Offset|Radius)\b/, msg: 'shadow is not allowed' },
  { re: /\belevation\s*:/, msg: 'elevation is not allowed' },
  // Chart libraries: these props draw fully rounded bars; set barBorder*Radius to 2-4 instead.
  { re: /\b(roundedTop|roundedBottom|cappedBars)\b(?!=\{false\})/, msg: 'rounded chart bars are not allowed (use barBorder*Radius 2-4)' },
  { re: /(?<![\w-])(?:[a-z]+:)*(?:shadow|drop-shadow)(?:-[\w\[\]#./]+)?(?![\w-])(?=[\s'"`}])/, msg: 'shadow class is not allowed', classOnly: true },
  { re: /\bLinearGradient\b|linear-gradient|bg-gradient-|expo-linear-gradient/, msg: 'gradients are not allowed' },
];

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (SELF_ALLOW.has(rel) || rel === 'global.d.ts') continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((text, i) => {
    const code = text.replace(/\/\/.*$/, '');
    if (/^\s*(\*|\/\*)/.test(text)) return;
    for (const r of RULES) {
      if (r.classOnly && !/className|class=|`|'|"/.test(code)) continue;
      if (r.re.test(code)) add(file, i + 1, r.msg);
    }
    for (const m of code.matchAll(/borderRadius\s*:\s*([^,}\s]+)/g)) {
      const v = m[1];
      if (/^radius\.(xs|sm|md|lg|full|dot)$/.test(v)) continue; // tokens are 2-4 (dot is the one circle)
      const n = Number(v);
      if (!(n >= 2 && n <= 4)) add(file, i + 1, `borderRadius ${v} must be 2, 3 or 4 (or a radius token)`);
    }
    for (const m of code.matchAll(/border(?:-[trbl]{1,2})?-radius\s*:\s*([\d.]+)/g)) {
      if (!(Number(m[1]) >= 2 && Number(m[1]) <= 4)) add(file, i + 1, `border-radius ${m[1]} must be 2-4px`);
    }
    for (const m of code.matchAll(/\brounded(?:-[trbl]{1,2})?-\[([\d.]+)px\]/g)) {
      if (!(Number(m[1]) >= 2 && Number(m[1]) <= 4)) add(file, i + 1, `rounded-[${m[1]}px] must be 2-4px`);
    }
  });
}

// global.css <-> tokens.ts sync
try {
  const css = fs.readFileSync(path.join(ROOT, 'global.css'), 'utf8');
  const tok = fs.readFileSync(path.join(ROOT, 'src/theme/tokens.ts'), 'utf8');
  const MAP = {
    primary: 'primary', 'primary-dark': 'primaryDark', 'primary-tint': 'primaryLight', 'on-primary': 'onPrimary',
    bg: 'background', surface: 'surface', 'surface-2': 'surfaceSubtle', ink: 'text', muted: 'textMuted', faint: 'textFaint',
    line: 'border', 'line-2': 'borderSubtle', danger: 'danger', 'danger-tint': 'dangerLight', success: 'success',
    'success-tint': 'successLight', accent: 'accent', 'accent-tint': 'accentLight',
  };
  const block = (src, startRe) => {
    const m = src.match(startRe);
    return m ? m[1] : '';
  };
  const lightCss = block(css, /:root\s*\{([^}]*)\}/);
  const darkCss = block(css, /\.dark:root\s*\{([^}]*)\}/);
  const lightTok = block(tok, /export const colors: Palette = \{([\s\S]*?)\n  status:/);
  const darkTok = block(tok, /export const darkColors: Palette = \{([\s\S]*?)\n  status:/);
  const hex = (b, key) => (b.match(new RegExp('(?:^|[^A-Za-z0-9])' + key + ": *'(#[0-9A-Fa-f]{6})'")) || [])[1];
  const trip = (b, key) => (b.match(new RegExp('--color-' + key + ': *([0-9]+) ([0-9]+) ([0-9]+)')) || []).slice(1).map(Number);
  for (const [scheme, c, t] of [['light', lightCss, lightTok], ['dark', darkCss, darkTok]]) {
    for (const [cssKey, tokKey] of Object.entries(MAP)) {
      const h = hex(t, tokKey);
      const tr = trip(c, cssKey);
      if (!h || tr.length !== 3) { add(path.join(ROOT, 'global.css'), 1, `${scheme}: missing ${cssKey}/${tokKey}`); continue; }
      const want = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      if (want.join() !== tr.join()) add(path.join(ROOT, 'global.css'), 1, `${scheme}: --color-${cssKey} (${tr.join(' ')}) != tokens.${tokKey} ${h}`);
    }
  }
} catch (e) {
  add(path.join(ROOT, 'global.css'), 1, `token sync check failed: ${e.message}`);
}

if (process.argv.includes('--summary')) {
  const byFile = {};
  problems.forEach((p) => { const f = p.split(':')[0]; byFile[f] = (byFile[f] || 0) + 1; });
  console.log(JSON.stringify(byFile, null, 1));
}
if (warnings.length) console.warn(`design-rules: ${warnings.length} pending warning(s) in files scheduled for rework`);
if (problems.length) {
  if (!process.argv.includes('--summary')) console.error(problems.join('\n'));
  console.error(`\ndesign-rules: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('design-rules: OK');
