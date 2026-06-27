import type { OwnedPal } from '../types/owned';
import { getPassive } from '../data';

export type MaterialLevel = 'excellent' | 'good' | 'risky' | 'avoid';

export interface MaterialScore {
  score: number;
  level: MaterialLevel;
  matchedPassives: string[];
  extraPassives: string[];
  negativePassives: string[];
  warnings: string[];
}

export interface ScoreOptions {
  perMatched?: number;
  perExtra?: number;
  perNegative?: number;
  finishedPenalty?: number;
}

const DEFAULT: Required<ScoreOptions> = {
  perMatched: 30,
  perExtra: 15,
  perNegative: 30,
  finishedPenalty: 100,
};

export function calculateMaterialScore(
  ownedPal: OwnedPal,
  targetPassives: string[],
  options: ScoreOptions = {}
): MaterialScore {
  const cfg = { ...DEFAULT, ...options };
  const target = new Set(targetPassives);

  const matched: string[] = [];
  const extra: string[] = [];
  const negative: string[] = [];

  for (const pid of ownedPal.passives) {
    const passive = getPassive(pid);
    if (passive?.is_negative) {
      negative.push(pid);
    } else if (target.has(pid)) {
      matched.push(pid);
    } else {
      extra.push(pid);
    }
  }

  let score =
    matched.length * cfg.perMatched -
    extra.length * cfg.perExtra -
    negative.length * cfg.perNegative;

  if (ownedPal.is_finished) score -= cfg.finishedPenalty;

  score = Math.max(0, Math.min(100, score));

  const warnings: string[] = [];
  if (ownedPal.is_finished)
    warnings.push('此為成品，不建議拿來當素材消耗');
  if (negative.length > 0)
    warnings.push(`帶有 ${negative.length} 個負面詞條，污染風險高`);
  if (extra.length > 0 && matched.length === 0)
    warnings.push('沒有目標詞條，且帶非目標詞條');

  const level: MaterialLevel =
    score >= 90
      ? 'excellent'
      : score >= 70
        ? 'good'
        : score >= 50
          ? 'risky'
          : 'avoid';

  return {
    score,
    level,
    matchedPassives: matched,
    extraPassives: extra,
    negativePassives: negative,
    warnings,
  };
}

export const LEVEL_LABEL: Record<MaterialLevel, string> = {
  excellent: '極佳素材',
  good: '推薦素材',
  risky: '可用但有污染風險',
  avoid: '不建議',
};

export const LEVEL_TONE: Record<MaterialLevel, 'good' | 'accent' | 'warn' | 'bad'> = {
  excellent: 'good',
  good: 'accent',
  risky: 'warn',
  avoid: 'bad',
};
