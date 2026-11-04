import * as Crypto from 'expo-crypto';
import { SUGGESTED_PANT_FIELDS, SUGGESTED_SHIRT_FIELDS } from './autoSuggestFields';
import { parseGarmentType } from './garments';
import { universalFieldsRepo, universalTemplatesRepo, customerMeasurementsRepo } from './data/repository';
import i18n from './i18n';
import { garmentNameLabel } from './measurementNames';
import type { Tables } from './database.types';

/**
 * A customer's measurement profile is one template's values. For a
 * "Shirt + Pant" template the values are kept per garment —
 * `{ Shirt: { Length: 30, ... }, Pant: { Length: 40, ... } }` — so fields both
 * garments share (e.g. Length) get their own value. Every other template
 * stays a flat `{ field: value }` map.
 */
export type MeasurementSection = {
  /** Key in the stored JSON (`Shirt`, `Pant`, `Other`); null for a flat profile. */
  key: string | null;
  fields: string[];
};

export type SectionValues<T> = Record<string, Record<string, T>>;

/** Section key used for flat (single-garment) profiles. */
const FLAT = '';

const SECTION_LABEL_KEYS: Record<string, string> = {
  Shirt: 'orders:form.garmentTypes.shirt',
  Pant: 'orders:form.garmentTypes.pant',
};

export function sectionTitle(key: string | null): string | null {
  if (!key) return null;
  return SECTION_LABEL_KEYS[key] ? i18n.t(SECTION_LABEL_KEYS[key]) : garmentNameLabel(key);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asRecord(measurements: unknown): Record<string, unknown> {
  return isPlainObject(measurements) ? measurements : {};
}

async function fieldNames(templateId: string): Promise<string[]> {
  const fields = await universalFieldsRepo.listForTemplate(templateId);
  return fields.map((f) => f.field_name);
}

/**
 * Sections to show for a template. Shirt + Pant uses the shop's own "Shirt"
 * and "Pant" templates for each card's fields, so they're maintained in one
 * place; if one of those doesn't exist, the combined template's own fields
 * are split using the standard shirt/pant field lists instead.
 */
export async function loadMeasurementSections(
  shopId: string,
  templateId: string | null
): Promise<MeasurementSection[]> {
  if (!templateId) return [];
  const templates = await universalTemplatesRepo.list(shopId);
  const template = templates.find((t) => t.id === templateId);
  if (!template || parseGarmentType(template.template_name) !== 'both') {
    return [{ key: null, fields: await fieldNames(templateId) }];
  }

  const shirtTemplate = templates.find((t) => parseGarmentType(t.template_name) === 'shirt');
  const pantTemplate = templates.find((t) => parseGarmentType(t.template_name) === 'pant');
  const comboFields = await fieldNames(templateId);
  const inShirt = (f: string) => SUGGESTED_SHIRT_FIELDS.includes(f);
  const inPant = (f: string) => SUGGESTED_PANT_FIELDS.includes(f);

  const shirtFields = shirtTemplate
    ? await fieldNames(shirtTemplate.id)
    : comboFields.filter((f) => inShirt(f) || !inPant(f));
  const pantFields = pantTemplate ? await fieldNames(pantTemplate.id) : comboFields.filter(inPant);

  return [
    { key: 'Shirt', fields: shirtFields },
    { key: 'Pant', fields: pantFields },
  ];
}

/**
 * Reads stored values into per-section maps. Older Shirt + Pant profiles were
 * flat (one shared Length); each section then takes the values for its own
 * fields, so a shared value is copied into both. Stored values that fit no
 * section are kept under `Other` rather than dropped.
 */
export function readSectionValues(
  measurements: unknown,
  sections: MeasurementSection[]
): { sections: MeasurementSection[]; values: SectionValues<string> } {
  const raw = asRecord(measurements);
  const values: SectionValues<string> = {};
  const str = (v: unknown) => (v !== null && v !== undefined ? String(v) : '');

  if (sections.length === 0 || sections[0].key === null) {
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) if (!isPlainObject(v)) flat[k] = str(v);
    values[FLAT] = flat;
    return { sections, values };
  }

  const isNested = sections.some((s) => s.key && isPlainObject(raw[s.key]));
  const used = new Set<string>();
  for (const section of sections) {
    const source = isNested ? asRecord(raw[section.key!]) : raw;
    const sectionValues: Record<string, string> = {};
    for (const [k, v] of Object.entries(source)) {
      if (isPlainObject(v)) continue;
      // Flat legacy data: only take this section's own fields.
      if (!isNested && !section.fields.includes(k)) continue;
      sectionValues[k] = str(v);
      used.add(k);
    }
    values[section.key!] = sectionValues;
  }

  const leftovers: Record<string, string> = {};
  const otherSource = isNested ? asRecord(raw.Other) : raw;
  for (const [k, v] of Object.entries(otherSource)) {
    if (isPlainObject(v) || (!isNested && used.has(k))) continue;
    if (!isNested && sections.some((s) => s.key === k)) continue;
    leftovers[k] = str(v);
  }
  if (Object.keys(leftovers).length > 0) {
    values.Other = leftovers;
    sections = [...sections, { key: 'Other', fields: Object.keys(leftovers) }];
  }
  return { sections, values };
}

/** Builds the JSON to store from per-section values (numbers only). */
export function buildMeasurementsJson(
  sections: MeasurementSection[],
  values: SectionValues<string>
): Record<string, number> | Record<string, Record<string, number>> {
  const toNumbers = (src: Record<string, string> = {}) => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(src)) {
      const parsed = parseFloat(v);
      if (!isNaN(parsed)) out[k] = parsed;
    }
    return out;
  };
  if (sections.length === 0 || sections[0].key === null) return toNumbers(values[FLAT]);
  const nested: Record<string, Record<string, number>> = {};
  for (const s of sections) {
    const nums = toNumbers(values[s.key!]);
    if (Object.keys(nums).length > 0) nested[s.key!] = nums;
  }
  return nested;
}

export type MeasurementView = { title: string | null; entries: [string, string][] };

/** Read-only grouping of a saved profile for the customer / order screens. */
export async function loadMeasurementView(
  shopId: string,
  profile: Tables<'customer_measurements'> | null
): Promise<MeasurementView[]> {
  if (!profile) return [];
  const sections = await loadMeasurementSections(shopId, profile.template_id);
  const raw = asRecord(profile.measurements);
  // Template gone or unknown: still show whatever was saved.
  const effective: MeasurementSection[] = sections.length
    ? sections
    : Object.values(raw).some(isPlainObject)
      ? Object.keys(raw).filter((k) => isPlainObject(raw[k])).map((k) => ({ key: k, fields: [] }))
      : [{ key: null, fields: [] }];
  const { sections: withOther, values } = readSectionValues(raw, effective);
  return withOther
    .map((s) => ({
      title: sectionTitle(s.key),
      entries: Object.entries(values[s.key ?? FLAT] ?? {}).filter(([, v]) => v !== ''),
    }))
    .filter((v) => v.entries.length > 0);
}

export { FLAT as FLAT_SECTION_KEY };

export type MeasurementHistoryItem = {
  id: string;
  date: string;
  cloth_type: string;
  template_id?: string;
  template_name?: string;
  values: Record<string, number> | Record<string, Record<string, number>>;
};

export type ClothTypeRecord = {
  clothType: string;
  templateId?: string;
  templateName: string;
  values: Record<string, any>;
  updatedAt?: string;
};

/** Extracts all recorded cloth types for a customer */
export function extractClothTypes(
  profile: Tables<'customer_measurements'> | null,
  templates: Tables<'universal_measurement_templates'>[] = []
): ClothTypeRecord[] {
  if (!profile) return [];
  const raw = asRecord(profile.measurements);

  if (isPlainObject(raw.by_cloth_type)) {
    const list: ClothTypeRecord[] = [];
    for (const [clothType, data] of Object.entries(raw.by_cloth_type)) {
      if (isPlainObject(data)) {
        list.push({
          clothType,
          templateId: typeof data.template_id === 'string' ? data.template_id : undefined,
          templateName: typeof data.template_name === 'string' ? data.template_name : clothType,
          values: isPlainObject(data.values) ? (data.values as Record<string, any>) : {},
          updatedAt: typeof data.updated_at === 'string' ? data.updated_at : profile.updated_at,
        });
      }
    }
    if (list.length > 0) return list;
  }

  // Fallback: check for nested garment objects (e.g. Shirt, Pant)
  const nestedKeys = Object.keys(raw).filter(
    (k) => k !== 'history' && k !== 'by_cloth_type' && isPlainObject(raw[k])
  );
  if (nestedKeys.length > 0) {
    return nestedKeys.map((clothType) => {
      const tmpl = templates.find((t) => t.template_name.toLowerCase() === clothType.toLowerCase());
      return {
        clothType,
        templateId: tmpl?.id,
        templateName: clothType,
        values: raw[clothType] as Record<string, any>,
        updatedAt: profile.updated_at,
      };
    });
  }

  // Flat single template fallback
  const tmpl = templates.find((t) => t.id === profile.template_id);
  const name = tmpl?.template_name || 'Standard';
  const flatVals: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k !== 'history' && k !== 'by_cloth_type' && !isPlainObject(v) && typeof v === 'number') {
      flatVals[k] = v;
    }
  }
  if (Object.keys(flatVals).length > 0) {
    return [
      {
        clothType: name,
        templateId: profile.template_id ?? undefined,
        templateName: name,
        values: flatVals,
        updatedAt: profile.updated_at,
      },
    ];
  }

  return [];
}

/** Extracts recorded measurement history, newest first */
export function extractMeasurementHistory(
  profile: Tables<'customer_measurements'> | null,
  templates: Tables<'universal_measurement_templates'>[] = []
): MeasurementHistoryItem[] {
  if (!profile) return [];
  const raw = asRecord(profile.measurements);

  if (Array.isArray(raw.history) && raw.history.length > 0) {
    return [...raw.history].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  // Fallback: synthesize history item from current cloth types
  const clothTypes = extractClothTypes(profile, templates);
  return clothTypes.map((c, i) => ({
    id: `legacy-${i}`,
    date: c.updatedAt || profile.updated_at || profile.created_at,
    cloth_type: c.clothType,
    template_id: c.templateId,
    template_name: c.templateName,
    values: c.values,
  }));
}

/** Read-only grouping of a saved profile, optionally filtered for one cloth type. */
export async function loadMeasurementViewForCloth(
  shopId: string,
  profile: Tables<'customer_measurements'> | null,
  clothType?: string | null
): Promise<MeasurementView[]> {
  if (!profile) return [];
  const templates = await universalTemplatesRepo.list(shopId);
  const clothRecords = extractClothTypes(profile, templates);

  if (clothType && clothType !== 'all') {
    const record = clothRecords.find(
      (c) => c.clothType.toLowerCase() === clothType.toLowerCase()
    );
    if (record) {
      const templateId =
        record.templateId ||
        templates.find((t) => t.template_name.toLowerCase() === record.clothType.toLowerCase())?.id ||
        profile.template_id;
      const sections = await loadMeasurementSections(shopId, templateId);
      const effective: MeasurementSection[] = sections.length
        ? sections
        : [{ key: null, fields: Object.keys(record.values) }];
      const { values } = readSectionValues(record.values, effective);
      return effective
        .map((s) => ({
          title: sectionTitle(s.key) || garmentNameLabel(record.clothType),
          entries: Object.entries(values[s.key ?? FLAT] ?? {}).filter(([, v]) => v !== ''),
        }))
        .filter((v) => v.entries.length > 0);
    }
  }

  // If "all" or no clothType specified, return views for all cloth records if available
  if (clothRecords.length > 0) {
    const allViews: MeasurementView[] = [];
    for (const rec of clothRecords) {
      const tmplId =
        rec.templateId ||
        templates.find((t) => t.template_name.toLowerCase() === rec.clothType.toLowerCase())?.id;
      const sections = await loadMeasurementSections(shopId, tmplId ?? null);
      const effective: MeasurementSection[] = sections.length
        ? sections
        : [{ key: null, fields: Object.keys(rec.values) }];
      const { values } = readSectionValues(rec.values, effective);
      for (const s of effective) {
        const entries = Object.entries(values[s.key ?? FLAT] ?? {}).filter(([, v]) => v !== '');
        if (entries.length > 0) {
          allViews.push({
            title: sectionTitle(s.key) || garmentNameLabel(rec.clothType),
            entries,
          });
        }
      }
    }
    if (allViews.length > 0) return allViews;
  }

  // Standard fallback
  return loadMeasurementView(shopId, profile);
}

/**
 * Saves a measurement for a specific cloth type/template, preserving other
 * cloth types and appending a history record.
 */
export async function saveCustomerClothMeasurement(
  shopId: string,
  customerId: string,
  templateId: string,
  templateName: string,
  newValues: Record<string, number> | Record<string, Record<string, number>>
): Promise<Tables<'customer_measurements'>> {
  const existing = await customerMeasurementsRepo.getByCustomer(customerId);
  const raw = asRecord(existing?.measurements);
  const now = new Date().toISOString();

  // Existing cloth types map
  const existingByCloth: Record<string, any> = isPlainObject(raw.by_cloth_type)
    ? { ...(raw.by_cloth_type as Record<string, any>) }
    : {};

  // If no by_cloth_type yet, seed from existing raw data
  if (Object.keys(existingByCloth).length === 0 && existing) {
    const templates = await universalTemplatesRepo.list(shopId);
    const extracted = extractClothTypes(existing, templates);
    for (const item of extracted) {
      existingByCloth[item.clothType] = {
        template_id: item.templateId,
        template_name: item.templateName,
        values: item.values,
        updated_at: item.updatedAt || now,
      };
    }
  }

  // Update or set this cloth type
  existingByCloth[templateName] = {
    template_id: templateId,
    template_name: templateName,
    values: newValues,
    updated_at: now,
  };

  // History list
  const existingHistory: MeasurementHistoryItem[] = Array.isArray(raw.history)
    ? [...raw.history]
    : [];

  const newHistoryItem: MeasurementHistoryItem = {
    id: Crypto.randomUUID(),
    date: now,
    cloth_type: templateName,
    template_id: templateId,
    template_name: templateName,
    values: newValues,
  };

  const updatedHistory = [newHistoryItem, ...existingHistory];

  // Composite envelope
  const envelope: Record<string, any> = {
    ...raw,
    by_cloth_type: existingByCloth,
    history: updatedHistory,
    [templateName]: newValues, // Backward compatibility for nested garment access
  };

  // If flat values (e.g. single garment), also copy into top level for older code
  if (!Object.values(newValues).some(isPlainObject)) {
    for (const [k, v] of Object.entries(newValues)) {
      envelope[k] = v;
    }
  }

  return await customerMeasurementsRepo.save(shopId, {
    customer_id: customerId,
    template_id: templateId,
    measurements: envelope,
  });
}
