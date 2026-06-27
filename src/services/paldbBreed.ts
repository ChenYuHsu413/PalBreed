import { PALS, getPal } from '../data';
import comboData from '../data/breeding_combos.json';
import type { Pal } from '../types/pal';

/**
 * 本地配種引擎（離線、不再即時打 PalDB）。
 *
 * 資料來源：`src/data/breeding_combos.json`（由 tools/build_breeding_data.mjs 從
 * 社群資料 full_combo.json 對映成我們的 pal id），格式：
 *   { childId: [[parentAId, parentBId], ...], ... }
 *
 * 本檔保留與舊版（打 PalDB）相同的匯出名稱與回傳結構，所以上層 hooks/元件不需改動。
 * 名稱沿用 paldbBreed 只為相容；實際已不連網。
 */

const CHILD_TO_PARENTS = comboData as unknown as Record<string, [string, string][]>;

function toEnUrl(nameEn: string): string {
  return nameEn.replace(/\s+/g, '_');
}

const palByEnUrl = new Map<string, Pal>(PALS.map((p) => [toEnUrl(p.name_en), p]));
const palByPaldbId = new Map<string, Pal>(PALS.map((p) => [p.paldb_id, p]));

export function getPalByPaldbId(paldbId: string): Pal | undefined {
  return palByPaldbId.get(paldbId);
}
export function getPalByEnUrl(enUrl: string): Pal | undefined {
  return palByEnUrl.get(enUrl);
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// 反查表：(父A,父B) → 子代；同時收集每個物種可當親代的夥伴
const PAIR_TO_CHILD = new Map<string, string>();
const PARENT_IDS = new Set<string>();
for (const childId in CHILD_TO_PARENTS) {
  for (const [a, b] of CHILD_TO_PARENTS[childId]) {
    PAIR_TO_CHILD.set(pairKey(a, b), childId);
    PARENT_IDS.add(a);
    PARENT_IDS.add(b);
  }
}
const ALL_PARENTS = [...PARENT_IDS];

/** 我們 id 版本：父A × 父B → 子代 id */
function breedChildId(aId: string, bId: string): string | null {
  return PAIR_TO_CHILD.get(pairKey(aId, bId)) ?? null;
}

/** 透過 paldb_id 算 (父A × 父B) = 子代 paldb_id（相容舊介面，回 Promise）。 */
export async function breedPair(
  parentA: string,
  parentB: string
): Promise<string | null> {
  const a = getPalByPaldbId(parentA);
  const b = getPalByPaldbId(parentB);
  if (!a || !b) return null;
  const childId = breedChildId(a.id, b.id);
  return childId ? (getPal(childId)?.paldb_id ?? null) : null;
}

export interface ParentCombo {
  parentAEnUrl: string;
  parentBEnUrl: string;
  parentA?: Pal;
  parentB?: Pal;
  isSameSpecies: boolean;
}

function comboFor(aId: string, bId: string): ParentCombo {
  const a = getPal(aId);
  const b = getPal(bId);
  return {
    parentAEnUrl: a ? toEnUrl(a.name_en) : aId,
    parentBEnUrl: b ? toEnUrl(b.name_en) : bId,
    parentA: a,
    parentB: b,
    isSameSpecies: aId === bId,
  };
}

/** 列出所有能配出目標子代的父母組合（相容舊介面）。 */
export async function getParentCombos(
  childPaldbId: string
): Promise<ParentCombo[]> {
  const child = getPalByPaldbId(childPaldbId);
  if (!child) return [];
  const pairs = CHILD_TO_PARENTS[child.id] ?? [];
  const seen = new Set<string>();
  const out: ParentCombo[] = [];
  for (const [a, b] of pairs) {
    const k = pairKey(a, b);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(comboFor(a, b));
  }
  return out;
}

export interface BreedingStep {
  parentAEnUrl: string;
  parentBEnUrl: string;
  childEnUrl: string;
  parentA?: Pal;
  parentB?: Pal;
  child?: Pal;
}

export interface BreedingPath {
  steps: BreedingStep[];
}

// 反向最短距離：每個物種要幾步能變成目標（用來剪枝）
function minStepsTo(toId: string): Map<string, number> {
  const revAdj = new Map<string, Set<string>>();
  for (const childId in CHILD_TO_PARENTS) {
    for (const [a, b] of CHILD_TO_PARENTS[childId]) {
      for (const parent of [a, b]) {
        if (!revAdj.has(childId)) revAdj.set(childId, new Set());
        revAdj.get(childId)!.add(parent);
      }
    }
  }
  const dist = new Map<string, number>([[toId, 0]]);
  let frontier = [toId];
  while (frontier.length) {
    const next: string[] = [];
    for (const n of frontier) {
      for (const x of revAdj.get(n) ?? []) {
        if (!dist.has(x)) {
          dist.set(x, dist.get(n)! + 1);
          next.push(x);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

function stepFor(currId: string, partnerId: string, childId: string): BreedingStep {
  const a = getPal(currId);
  const b = getPal(partnerId);
  const c = getPal(childId);
  return {
    parentAEnUrl: a ? toEnUrl(a.name_en) : currId,
    parentBEnUrl: b ? toEnUrl(b.name_en) : partnerId,
    childEnUrl: c ? toEnUrl(c.name_en) : childId,
    parentA: a,
    parentB: b,
    child: c,
  };
}

const MAX_DEPTH = 3;
const PATH_CAP = 400;

/**
 * 列出 from → to 在 MAX_DEPTH 代內的所有配種路徑（相容舊介面）。
 * 用反向最短距離剪枝，避免組合爆炸；結果上限 PATH_CAP。
 */
export async function getShortestBreedingPaths(
  fromPaldbId: string,
  toPaldbId: string
): Promise<BreedingPath[]> {
  const from = getPalByPaldbId(fromPaldbId);
  const to = getPalByPaldbId(toPaldbId);
  if (!from || !to || from.id === to.id) return [];

  const minDist = minStepsTo(to.id);
  if (!minDist.has(from.id)) return []; // 根本到不了

  const paths: BreedingPath[] = [];
  const steps: BreedingStep[] = [];
  const visited = new Set<string>([from.id]);

  const dfs = (curr: string, depth: number) => {
    if (paths.length >= PATH_CAP) return;
    if (depth > 0 && curr === to.id) {
      paths.push({ steps: steps.slice() });
      return;
    }
    if (depth >= MAX_DEPTH) return;
    const remaining = MAX_DEPTH - depth;
    const md = minDist.get(curr);
    if (md === undefined || md > remaining) return; // 剪枝：剩餘步數不夠

    for (const partner of ALL_PARENTS) {
      const child = breedChildId(curr, partner);
      if (!child || child === curr || visited.has(child)) continue;
      visited.add(child);
      steps.push(stepFor(curr, partner, child));
      dfs(child, depth + 1);
      steps.pop();
      visited.delete(child);
      if (paths.length >= PATH_CAP) return;
    }
  };

  dfs(from.id, 0);
  paths.sort((a, b) => a.steps.length - b.steps.length);
  return paths;
}
