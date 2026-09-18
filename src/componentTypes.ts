export const NEUTRAL_TYPE_COLOR = '#475569';

export const DEFAULT_COMPONENT_TYPES: Array<{ name: string; color: string }> = [
  { name: 'Disjoncteur', color: '#2563EB' },
  { name: 'Vigi', color: '#16A34A' },
  { name: 'Auxiliaire OF', color: '#EA580C' },
  { name: 'Auxiliaire SD', color: '#DC2626' },
  { name: 'Contacteur', color: '#7C3AED' },
  { name: 'Sectionneur', color: '#0891B2' },
  { name: 'Parafoudre', color: '#CA8A04' },
  { name: 'Voyant', color: '#DB2777' },
  { name: 'Bornier', color: '#65A30D' },
  { name: 'Autre', color: '#78716C' },
];

export function normalizeHexColor(color: string): string | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(color.trim());
  return match ? `#${match[1].toUpperCase()}` : null;
}

export function isNeutralColor(color: string): boolean {
  return normalizeHexColor(color) === NEUTRAL_TYPE_COLOR.toUpperCase();
}

