import type { PalRole } from './pal';

export interface RecommendedBuild {
  id: string;
  label_en: string;
  label_zh: string;
  role: PalRole;
  passives: string[];
  alternatives: string[];
  description_zh?: string;
}
