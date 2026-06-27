export type Gender = 'male' | 'female' | 'unknown';

export interface OwnedPal {
  owned_id: string;
  pal_id: string;
  nickname?: string;
  gender: Gender;
  passives: string[];
  tags: string[];
  is_material: boolean;
  is_finished: boolean;
  note?: string;
  created_at: number;
  updated_at: number;
}

export type OwnedPalInput = Omit<
  OwnedPal,
  'owned_id' | 'created_at' | 'updated_at'
>;
