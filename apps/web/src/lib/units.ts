/** Quantity units (mirrors the backend E2 unit catalog). Used by the quantity+unit control on
 *  commodity/bulk surfaces (procurement, supply, offers). Value = canonical unit code. */
export const UNITS: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'unit', label: 'unit(s)' },
  { code: 'kg', label: 'kg' },
  { code: 'tonne', label: 'tonne' },
  { code: 'MT', label: 'MT (metric tonne)' },
  { code: 'litre', label: 'litre' },
  { code: 'm3', label: 'm³' },
  { code: 'sqm', label: 'm²' },
  { code: 'pallet', label: 'pallet' },
  { code: 'container', label: 'container' },
  { code: 'carton', label: 'carton' },
];

export const UNIT_OPTIONS = UNITS.map((u) => ({ value: u.code, label: u.label }));
