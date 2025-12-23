export const DEFAULT_MAP_POOL = [
  'Abyss',
  'Bind',
  'Corrode',
  'Haven',
  'Pearl',
  'Split',
  'Sunset'
] as const;

export type MapName = (typeof DEFAULT_MAP_POOL)[number];

