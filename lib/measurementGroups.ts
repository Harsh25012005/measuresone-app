/**
 * Turns a stored measurement profile into displayable groups.
 *
 * The profile is normally flat (field → number). Older flows nested groups of
 * values and stored bookkeeping keys beside them, so this walks a few levels,
 * skips the bookkeeping keys, and returns each group's primitive values under
 * a heading ('' for the top level). It never returns objects as values.
 */
const META_KEYS = new Set(['updated_at', 'created_at', 'template_id', 'template_name', 'history', 'by_cloth_type']);

export type MeasurementGroup = { label: string; entries: [string, string | number][] };

export function groupMeasurements(raw: unknown): MeasurementGroup[] {
  const groups: MeasurementGroup[] = [];

  const collect = (obj: Record<string, unknown>, label: string, depth: number) => {
    const entries: [string, string | number][] = [];
    for (const [key, val] of Object.entries(obj)) {
      if (META_KEYS.has(key)) continue;
      if (typeof val === 'string' || typeof val === 'number') entries.push([key, val]);
      else if (val && typeof val === 'object' && !Array.isArray(val) && depth < 3) {
        collect(val as Record<string, unknown>, key, depth + 1);
      }
    }
    if (entries.length > 0) groups.push({ label, entries });
  };

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) collect(raw as Record<string, unknown>, '', 0);
  // top-level (flat) values first, then nested groups in discovery order
  return groups.sort((a, b) => (a.label === '' ? -1 : b.label === '' ? 1 : 0));
}
