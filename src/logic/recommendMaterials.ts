import type { OwnedPal } from '../types/owned';
import {
  calculateMaterialScore,
  type MaterialScore,
} from './calculateMaterialScore';

export interface RankedMaterial {
  ownedPal: OwnedPal;
  score: MaterialScore;
}

export interface RecommendOptions {
  includeFinished?: boolean;
  minScore?: number;
}

export function recommendMaterials(
  ownedPals: OwnedPal[],
  targetPassives: string[],
  options: RecommendOptions = {}
): RankedMaterial[] {
  const { includeFinished = false, minScore = 1 } = options;

  const ranked: RankedMaterial[] = [];

  for (const owned of ownedPals) {
    if (!includeFinished && owned.is_finished) continue;
    if (!owned.is_material && !owned.is_finished) {
      // 未被標記為素材也未被標記為成品 → 仍視為可用
    }

    const score = calculateMaterialScore(owned, targetPassives);
    if (score.matchedPassives.length === 0) continue;
    if (score.score < minScore) continue;

    ranked.push({ ownedPal: owned, score });
  }

  ranked.sort((a, b) => {
    if (b.score.score !== a.score.score) return b.score.score - a.score.score;
    return b.score.matchedPassives.length - a.score.matchedPassives.length;
  });

  return ranked;
}
