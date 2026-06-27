export type PassiveCategory =
  | 'combat'
  | 'work'
  | 'mount'
  | 'utility'
  | 'negative'
  | 'element';

export type PassiveTier = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export type PassiveEffects = Partial<{
  attack: number;
  defense: number;
  hp: number;
  move_speed: number;
  work_speed: number;
  food_consumption: number;
  sanity_consumption: number;
}>;

export interface PassiveSkill {
  id: string;
  name_en: string;
  name_zh: string;
  category: PassiveCategory;
  tier: PassiveTier;
  is_negative: boolean;
  is_recommended: boolean;
  effects?: PassiveEffects;
  description_zh?: string;
}
