import type { OwnedPal } from '../types/owned';
import type { Pal } from '../types/pal';
import type { ParentCombo } from '../services/paldbBreed';

export interface GenderBreakdown {
  male: number;
  female: number;
  unknown: number;
}

/**
 * 配種需一公一母。針對某組合，判斷你手上的素材能否湊出合法的 ♂+♀ 配對：
 *   ready          —— 可確定湊出一公一母，馬上能配
 *   uncertain      —— 有機會，但得靠「性別未知」的個體（需進遊戲確認性別）
 *   gender-blocked —— 物種素材夠，但性別湊不出異性（例如兩隻都公）
 *   one-side       —— 跨種組合只擁有其中一種，或同種只有 1 隻
 *   none           —— 兩邊都沒有
 */
export type PairingStatus =
  | 'ready'
  | 'uncertain'
  | 'gender-blocked'
  | 'one-side'
  | 'none';

export interface ComboParentSlot {
  enUrl: string;
  species: Pal | undefined; // 我們資料庫沒收錄該種時為 undefined
  ownedMatching: OwnedPal[]; // 你手上有幾隻該種
  genders: GenderBreakdown; // 該種素材的公母分佈
  ownedWithTargetPassives: Array<{
    ownedPal: OwnedPal;
    matchedPassives: string[]; // 該個體帶哪些目標詞條
  }>;
}

export interface AnalyzedCombo {
  raw: ParentCombo;
  isSameSpecies: boolean;
  slotA: ComboParentSlot;
  slotB: ComboParentSlot;
  hasBothParents: boolean;
  hasEitherParent: boolean;
  pairing: PairingStatus; // 性別配對可行性
  passiveCoverageFromThisCombo: string[]; // 此組合的雙親身上能提供多少目標詞條
  /** 排序分數：越高越推薦 */
  score: number;
}

function countGenders(pals: OwnedPal[]): GenderBreakdown {
  const g: GenderBreakdown = { male: 0, female: 0, unknown: 0 };
  for (const p of pals) g[p.gender]++;
  return g;
}

/** 跨物種：A、B 各出一隻，需異性（未知性別視為可填補但結果不確定）。 */
function pairingCross(a: GenderBreakdown, b: GenderBreakdown): PairingStatus {
  const aHas = a.male + a.female + a.unknown > 0;
  const bHas = b.male + b.female + b.unknown > 0;
  if (!aHas && !bHas) return 'none';
  if (!aHas || !bHas) return 'one-side';
  if ((a.male > 0 && b.female > 0) || (a.female > 0 && b.male > 0)) {
    return 'ready';
  }
  const withUnknown =
    (a.unknown > 0 && b.male + b.female + b.unknown > 0) ||
    (b.unknown > 0 && a.male + a.female > 0);
  if (withUnknown) return 'uncertain';
  return 'gender-blocked';
}

/** 同物種：需從同一群挑出 2 隻且異性。 */
function pairingSame(g: GenderBreakdown): PairingStatus {
  const total = g.male + g.female + g.unknown;
  if (total === 0) return 'none';
  if (total === 1) return 'one-side';
  if (g.male > 0 && g.female > 0) return 'ready';
  if (g.unknown >= 2 || (g.unknown >= 1 && (g.male > 0 || g.female > 0))) {
    return 'uncertain';
  }
  return 'gender-blocked';
}

export interface BreedingAnalysis {
  combos: AnalyzedCombo[];
  recommendedCombo: AnalyzedCombo | null;
  hasTargetSpeciesOwned: boolean;
  targetSpeciesOwned: OwnedPal[];
  notes: string[];
}

function buildSlot(
  enUrl: string,
  species: Pal | undefined,
  owned: OwnedPal[],
  targetPassives: string[]
): ComboParentSlot {
  const target = new Set(targetPassives);
  const ownedMatching = species
    ? owned.filter((o) => o.pal_id === species.id)
    : [];
  const ownedWithTargetPassives = ownedMatching
    .map((o) => ({
      ownedPal: o,
      matchedPassives: o.passives.filter((p) => target.has(p)),
    }))
    .filter((x) => x.matchedPassives.length > 0)
    .sort((a, b) => b.matchedPassives.length - a.matchedPassives.length);

  return {
    enUrl,
    species,
    ownedMatching,
    genders: countGenders(ownedMatching),
    ownedWithTargetPassives,
  };
}

/**
 * 分析每個 PalDB 父母組合對你目前素材庫的可用性。
 */
export function analyzeBreedingPaths(
  combos: ParentCombo[],
  ownedPals: OwnedPal[],
  targetPalId: string | null,
  targetPassives: string[]
): BreedingAnalysis {
  const targetSpeciesOwned = targetPalId
    ? ownedPals.filter((o) => o.pal_id === targetPalId)
    : [];
  const hasTargetSpeciesOwned = targetSpeciesOwned.length > 0;

  const analyzed: AnalyzedCombo[] = combos.map((c) => {
    const slotA = buildSlot(c.parentAEnUrl, c.parentA, ownedPals, targetPassives);
    const slotB = buildSlot(c.parentBEnUrl, c.parentB, ownedPals, targetPassives);

    const hasParentA = slotA.ownedMatching.length > 0;
    const hasParentB = slotB.ownedMatching.length > 0;

    // 同種組合 (e.g. 異構格里芬 × 異構格里芬) 需要 2 隻才能配
    const hasBothParents = c.isSameSpecies
      ? slotA.ownedMatching.length >= 2
      : hasParentA && hasParentB;
    const hasEitherParent = hasParentA || hasParentB;

    const passiveSet = new Set<string>();
    for (const x of slotA.ownedWithTargetPassives) {
      x.matchedPassives.forEach((p) => passiveSet.add(p));
    }
    for (const x of slotB.ownedWithTargetPassives) {
      x.matchedPassives.forEach((p) => passiveSet.add(p));
    }
    const passiveCoverageFromThisCombo = Array.from(passiveSet);

    const pairing = c.isSameSpecies
      ? pairingSame(slotA.genders)
      : pairingCross(slotA.genders, slotB.genders);

    // 排序分數：兩方都有素材 +50；其中之一有 +20；
    // 一公一母可立即配 +25；需確認性別 +10；性別湊不齊 -5；
    // 同種配種 +10；詞條覆蓋每多一個 +5
    let score = 0;
    if (hasBothParents) score += 50;
    else if (hasEitherParent) score += 20;
    if (pairing === 'ready') score += 25;
    else if (pairing === 'uncertain') score += 10;
    else if (pairing === 'gender-blocked') score -= 5;
    if (c.isSameSpecies) score += 10;
    score += passiveCoverageFromThisCombo.length * 5;

    return {
      raw: c,
      isSameSpecies: c.isSameSpecies,
      slotA,
      slotB,
      hasBothParents,
      hasEitherParent,
      pairing,
      passiveCoverageFromThisCombo,
      score,
    };
  });

  analyzed.sort((a, b) => b.score - a.score);

  const recommendedCombo = analyzed.length > 0 ? analyzed[0] : null;

  const notes: string[] = [];
  if (combos.length === 0) {
    notes.push('PalDB 沒有回傳此目標的父母組合（可能尚未收錄或網路異常）');
  }
  if (!recommendedCombo?.hasEitherParent && combos.length > 0) {
    notes.push(
      '你手上沒有任何能配出目標的父母物種，需要先抓或孵出至少一邊的父母'
    );
  }
  if (hasTargetSpeciesOwned) {
    notes.push(
      `你已經有 ${targetSpeciesOwned.length} 隻目標物種，可考慮直接用同種配種純化詞條`
    );
  }

  return {
    combos: analyzed,
    recommendedCombo,
    hasTargetSpeciesOwned,
    targetSpeciesOwned,
    notes,
  };
}
