export const GARMENT_TYPES = ['shirt', 'pant', 'both'] as const;
export type GarmentType = (typeof GARMENT_TYPES)[number];

/** Language-independent value written to order_items.garment_type. */
export const GARMENT_STORAGE_LABELS: Record<GarmentType, string> = {
  shirt: 'Shirt',
  pant: 'Pant',
  both: 'Shirt + Pant',
};

// Older orders stored the translated label, so match every app language.
const SHIRT_WORDS = ['shirt', 'शर्ट', 'શર્ટ'];
const PANT_WORDS = ['pant', 'पैंट', 'પેન્ટ'];

/** Maps a stored garment label (any language, old or new) back to its type. */
export function parseGarmentType(label: string | null | undefined): GarmentType | '' {
  const normalized = (label ?? '').trim().toLowerCase();
  const hasShirt = SHIRT_WORDS.some((w) => normalized.includes(w));
  const hasPant = PANT_WORDS.some((w) => normalized.includes(w));
  if (hasShirt && hasPant) return 'both';
  if (hasShirt) return 'shirt';
  if (hasPant) return 'pant';
  return '';
}

/**
 * Per-garment piece counts for an order's items. Orders with both garments
 * are saved as one Shirt item and one Pant item; older orders saved a single
 * combined "Shirt + Pant" item, whose split is unknown (`combined`).
 */
export function summarizePieces(items: { garment_type: string; cloth_count: number }[]) {
  let shirt = 0;
  let pant = 0;
  let combined = 0;
  let other = 0;
  for (const item of items) {
    const type = parseGarmentType(item.garment_type);
    const count = Number(item.cloth_count) || 0;
    if (type === 'shirt') shirt += count;
    else if (type === 'pant') pant += count;
    else if (type === 'both') combined += count;
    else other += count;
  }
  return { shirt, pant, combined, other, total: shirt + pant + combined + other };
}
