import type { OwnedPal } from '../types/owned';
import type { RankedMaterial } from './recommendMaterials';

export type ParentRef =
  | { kind: 'owned'; ownedPal: OwnedPal; carrying: string[] }
  | { kind: 'intermediate'; stepIndex: number; carrying: string[] };

export interface MergeStep {
  index: number;
  label: string;
  parentA: ParentRef;
  parentB: ParentRef;
  resultPassives: string[];
}

export interface MergePlan {
  steps: MergeStep[];
  finalPassives: string[];
  missingPassives: string[];
  warnings: string[];
  selectedBest: Record<string, OwnedPal>;
}

/**
 * 詞條合併規劃（不驗證真實配種結果，只規劃詞條合併路線）。
 *
 * 策略：
 *   1. 為每個目標詞條挑出最佳素材作為來源
 *      —— 優先選**目標物種**的素材（同種配種較不會跑掉物種）
 *   2. 兩兩配對 → 中間素材 → 最終目標
 *
 * 注意：實際配種子代物種需透過 PalDB 配種表決定，UI 端會 async 查詢。
 */
export function suggestMergePlan(
  rankedMaterials: RankedMaterial[],
  targetPassives: string[],
  targetPalId?: string | null
): MergePlan {
  const warnings: string[] = [];
  const selectedBest: Record<string, OwnedPal> = {};

  for (const passiveId of targetPassives) {
    const candidates = rankedMaterials.filter((r) =>
      r.score.matchedPassives.includes(passiveId)
    );
    if (candidates.length === 0) continue;

    // 優先選目標物種；否則按 score 排序選最佳
    const sameSpecies = candidates.find(
      (c) => targetPalId && c.ownedPal.pal_id === targetPalId
    );
    const chosen = sameSpecies ?? candidates[0];
    selectedBest[passiveId] = chosen.ownedPal;
  }

  const missingPassives = targetPassives.filter((p) => !selectedBest[p]);
  if (missingPassives.length > 0) {
    warnings.push(
      `缺少 ${missingPassives.length} 個目標詞條的素材：${missingPassives.join(', ')}`
    );
  }

  // 統計同種素材數
  if (targetPalId) {
    const sameSpeciesCount = Object.values(selectedBest).filter(
      (p) => p.pal_id === targetPalId
    ).length;
    const usableCount = Object.keys(selectedBest).length;
    if (sameSpeciesCount < usableCount) {
      warnings.push(
        `${usableCount - sameSpeciesCount} 個素材不是目標物種，需要跨物種配種（子代物種會變，需後續轉移詞條回目標）`
      );
    }
  }

  const usableTargets = targetPassives.filter((p) => selectedBest[p]);
  const steps: MergeStep[] = [];

  if (usableTargets.length < 2) {
    return {
      steps,
      finalPassives: usableTargets,
      missingPassives,
      warnings:
        usableTargets.length === 0
          ? ['素材庫中沒有任何目標詞條，請先補充素材']
          : ['只有 1 個目標詞條的素材，無法組成合併路線']
              .concat(warnings),
      selectedBest,
    };
  }

  type Carrier =
    | { kind: 'owned'; ownedPal: OwnedPal; carrying: string[] }
    | { kind: 'intermediate'; stepIndex: number; carrying: string[] };

  let layer: Carrier[] = usableTargets.map((p) => ({
    kind: 'owned',
    ownedPal: selectedBest[p],
    carrying: [p],
  }));

  while (layer.length > 1) {
    const nextLayer: Carrier[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = layer[i + 1];
      if (!b) {
        nextLayer.push(a);
        continue;
      }
      const merged = Array.from(new Set([...a.carrying, ...b.carrying]));
      const index = steps.length + 1;
      steps.push({
        index,
        label: `第 ${index} 輪`,
        parentA: a,
        parentB: b,
        resultPassives: merged,
      });
      nextLayer.push({
        kind: 'intermediate',
        stepIndex: index,
        carrying: merged,
      });
    }
    layer = nextLayer;
  }

  const finalPassives = layer[0]?.carrying ?? usableTargets;

  return {
    steps,
    finalPassives,
    missingPassives,
    warnings,
    selectedBest,
  };
}
