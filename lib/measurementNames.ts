import i18n from './i18n';

/**
 * Template (cloth type) and field names are stored in English in the DB, so
 * they're shared across languages. These map the built-in names to the
 * current language for display only; anything the tailor typed themselves
 * isn't in the dictionary and is shown exactly as entered.
 */
const slug = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

function lookup(group: 'measureFields' | 'garmentNames', name: string | null | undefined): string {
  if (!name) return '';
  const key = `common:${group}.${slug(name)}`;
  return i18n.exists(key) ? i18n.t(key) : name;
}

/** Display label for a measurement field name such as "Chest" or "Arm Hole". */
export function measurementFieldLabel(name: string | null | undefined): string {
  return lookup('measureFields', name);
}

/** Display label for a cloth type / template name such as "Shirt + Pant". */
export function garmentNameLabel(name: string | null | undefined): string {
  return lookup('garmentNames', name);
}
