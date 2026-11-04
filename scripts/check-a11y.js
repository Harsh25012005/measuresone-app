#!/usr/bin/env node
/**
 * Accessibility check (DESIGN.md §9). Fails when, in app code:
 *  - a <Pressable> has no accessibilityRole (or accessible={false}),
 *  - a <TextInput> has no accessibilityLabel (the InputField/SearchBar primitives set it),
 *  - an <Image> has no accessibilityLabel / accessibilityIgnoresInvertColors.
 * Usage: node scripts/check-a11y.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', '__tests__', 'scripts', 'assets', 'supabase', 'docs']);
const problems = [];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP.has(e.name)) walk(path.join(dir, e.name), out);
    } else if (e.name.endsWith('.tsx')) out.push(path.join(dir, e.name));
  }
  return out;
}

/** Returns the full opening tag text starting at `start`, honouring {} nesting so `=>` does not end it. */
function readTag(src, start) {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0 && src[i - 1] !== '=') return src.slice(start, i + 1);
  }
  return src.slice(start);
}

for (const file of walk(ROOT)) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /<(Pressable|TextInput|Image)(?=[\s/])/g;
  let m;
  while ((m = re.exec(src))) {
    const tag = readTag(src, m.index);
    const line = src.slice(0, m.index).split('\n').length;
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (m[1] === 'Pressable' && !/accessibilityRole|accessible=\{false\}/.test(tag)) problems.push(`${rel}:${line}  Pressable without accessibilityRole`);
    if (m[1] === 'TextInput' && !/accessibilityLabel/.test(tag)) problems.push(`${rel}:${line}  TextInput without accessibilityLabel`);
    if (m[1] === 'Image' && !/accessibilityLabel|accessibilityIgnoresInvertColors|alt=/.test(tag)) problems.push(`${rel}:${line}  Image without accessibility label`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\na11y: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('a11y: OK');
