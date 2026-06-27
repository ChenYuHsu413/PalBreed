export type PalElement =
  | 'Neutral'
  | 'Fire'
  | 'Water'
  | 'Grass'
  | 'Electric'
  | 'Ice'
  | 'Ground'
  | 'Dark'
  | 'Dragon';

export type PalRole =
  | 'combat'
  | 'mount'
  | 'mount_speed'
  | 'base_worker'
  | 'mining'
  | 'handiwork'
  | 'lumbering'
  | 'transporting'
  | 'support';

export type PalPriority = 'S' | 'A' | 'B' | 'C';

export interface Pal {
  id: string;
  name_en: string;
  name_zh: string;
  paldb_id: string;
  paldex?: string;
  elements: PalElement[];
  roles: PalRole[];
  recommended_roles: PalRole[];
  priority: PalPriority;
  note?: string;
}
