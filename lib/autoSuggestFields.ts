/**
 * Intelligent field auto-suggestion logic for Universal Measurement Templates.
 */

export const SUGGESTED_SHIRT_FIELDS = [
  'Chest',
  'Shoulder',
  'Sleeve',
  'Length',
  'Collar',
  'Cuff',
  'Biceps',
  'Stomach',
];

export const SUGGESTED_PANT_FIELDS = [
  'Waist',
  'Hip',
  'Seat',
  'Length',
  'Thigh',
  'Knee',
  'Bottom',
  'Crotch',
];

export const SUGGESTED_SHIRT_PANT_FIELDS = [
  ...SUGGESTED_SHIRT_FIELDS,
  ...SUGGESTED_PANT_FIELDS,
];

const CUSTOM_SUGGESTIONS: Record<string, string[]> = {
  blazer: [
    'Chest',
    'Waist',
    'Shoulder',
    'Sleeve',
    'Length',
    'Collar',
    'Front Length',
    'Back Length',
    'Arm Hole',
    'Pocket',
  ],
  coat: [
    'Chest',
    'Waist',
    'Shoulder',
    'Sleeve',
    'Length',
    'Collar',
    'Arm Hole',
  ],
  kurta: [
    'Chest',
    'Waist',
    'Shoulder',
    'Sleeve',
    'Length',
    'Collar',
    'Hip',
    'Bottom',
  ],
  safari: [
    'Chest',
    'Waist',
    'Shoulder',
    'Sleeve',
    'Length',
    'Collar',
    'Belt',
  ],
  jacket: [
    'Chest',
    'Waist',
    'Shoulder',
    'Sleeve',
    'Length',
    'Collar',
    'Arm Hole',
  ],
  lehenga: [
    'Waist',
    'Hip',
    'Length',
    'Flare',
    'Blouse Chest',
    'Blouse Length',
    'Sleeve',
  ],
  sherwani: [
    'Chest',
    'Waist',
    'Shoulder',
    'Sleeve',
    'Length',
    'Collar',
    'Hip',
    'Arm Hole',
  ],
  suit: [
    'Chest',
    'Waist',
    'Shoulder',
    'Sleeve',
    'Jacket Length',
    'Pant Waist',
    'Pant Length',
  ],
  vest: [
    'Chest',
    'Waist',
    'Shoulder',
    'Length',
    'Arm Hole',
  ],
  pyjama: [
    'Waist',
    'Length',
    'Hip',
    'Bottom',
  ],
  salwar: [
    'Waist',
    'Length',
    'Hip',
    'Bottom',
  ],
};

/**
 * Generates measurement fields based on template name.
 */
export function getAutoSuggestedFields(templateName: string): string[] {
  const normalized = templateName.trim().toLowerCase();

  if (normalized === 'shirt') {
    return [...SUGGESTED_SHIRT_FIELDS];
  }
  if (normalized === 'pant' || normalized === 'pants' || normalized === 'trousers') {
    return [...SUGGESTED_PANT_FIELDS];
  }
  if (normalized === 'shirt + pant' || normalized === 'shirt+pant' || normalized === 'shirt & pant' || normalized === 'suit pair') {
    return [...SUGGESTED_SHIRT_PANT_FIELDS];
  }

  // Check specific custom keywords
  for (const [key, fields] of Object.entries(CUSTOM_SUGGESTIONS)) {
    if (normalized.includes(key)) {
      return [...fields];
    }
  }

  // Default fallback for unrecognized custom template names
  return [
    'Chest',
    'Waist',
    'Shoulder',
    'Length',
    'Sleeve',
    'Hip',
  ];
}
