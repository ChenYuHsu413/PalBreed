import palsJson from './pals.json';
import passivesJson from './passive_skills.json';
import buildsJson from './recommended_builds.json';
import palIconsJson from './pal_icons.json';
import type { Pal } from '../types/pal';
import type { PassiveSkill } from '../types/passive';
import type { RecommendedBuild } from '../types/build';

export const PALS = palsJson as Pal[];
export const PASSIVES = passivesJson as PassiveSkill[];
export const BUILDS = buildsJson as RecommendedBuild[];

const PAL_ICONS = palIconsJson as Record<string, string>;

/** 帕魯圖示 URL（PalDB CDN），沒收錄則回 undefined。 */
export function getPalIcon(id: string): string | undefined {
  return PAL_ICONS[id];
}

const palById = new Map(PALS.map((p) => [p.id, p]));
const passiveById = new Map(PASSIVES.map((p) => [p.id, p]));
const buildById = new Map(BUILDS.map((b) => [b.id, b]));

export function getPal(id: string): Pal | undefined {
  return palById.get(id);
}

export function getPassive(id: string): PassiveSkill | undefined {
  return passiveById.get(id);
}

export function getBuild(id: string): RecommendedBuild | undefined {
  return buildById.get(id);
}

export function getPassiveLabel(id: string): string {
  const p = passiveById.get(id);
  if (!p) return id;
  return p.name_zh ? `${p.name_zh}（${p.name_en}）` : p.name_en;
}

export function getPalLabel(id: string): string {
  const p = palById.get(id);
  if (!p) return id;
  return p.name_zh ? `${p.name_zh}（${p.name_en}）` : p.name_en;
}
