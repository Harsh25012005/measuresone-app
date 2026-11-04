#!/usr/bin/env node
/**
 * Fails when gu/hi are missing a key that en has (or a file is missing).
 * Keys that exist only in gu/hi are reported as warnings (stale translations).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'locales');
const LANGS = ['en', 'gu', 'hi'];

const flat = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

// i18next plural suffixes differ per language; compare on the base key.
const base = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');

const problems = [];
const warnings = [];
for (const file of fs.readdirSync(path.join(ROOT, 'en')).filter((f) => f.endsWith('.json'))) {
  const sets = {};
  for (const lang of LANGS) {
    const p = path.join(ROOT, lang, file);
    if (!fs.existsSync(p)) {
      problems.push(`${lang}/${file}: file missing`);
      sets[lang] = new Set();
      continue;
    }
    sets[lang] = new Set(flat(JSON.parse(fs.readFileSync(p, 'utf8'))).map(base));
  }
  for (const lang of LANGS.filter((l) => l !== 'en')) {
    for (const k of sets.en) if (!sets[lang].has(k)) problems.push(`${lang}/${file}: missing "${k}"`);
    for (const k of sets[lang]) if (!sets.en.has(k)) warnings.push(`${lang}/${file}: stale key "${k}"`);
  }
}

if (warnings.length) console.warn(`locales: ${warnings.length} stale key(s) only in gu/hi (run with --verbose to list)`);
if (process.argv.includes('--verbose')) console.warn(warnings.join(String.fromCharCode(10)));
if (problems.length) {
  console.error(problems.join(String.fromCharCode(10)));
  console.error(`\nlocales: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('locales: OK');
