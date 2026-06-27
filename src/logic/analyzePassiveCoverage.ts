import type { OwnedPal } from '../types/owned';

export interface PassiveCoverage {
  coveredPassives: string[];
  missingPassives: string[];
  sourcesByPassive: Record<string, OwnedPal[]>;
  coverageRate: number;
}

export function analyzePassiveCoverage(
  ownedPals: OwnedPal[],
  targetPassives: string[]
): PassiveCoverage {
  const sourcesByPassive: Record<string, OwnedPal[]> = {};
  const covered = new Set<string>();

  for (const passiveId of targetPassives) {
    sourcesByPassive[passiveId] = [];
  }

  for (const owned of ownedPals) {
    for (const pid of owned.passives) {
      if (!targetPassives.includes(pid)) continue;
      sourcesByPassive[pid].push(owned);
      covered.add(pid);
    }
  }

  const coveredPassives = targetPassives.filter((p) => covered.has(p));
  const missingPassives = targetPassives.filter((p) => !covered.has(p));
  const coverageRate =
    targetPassives.length === 0
      ? 0
      : coveredPassives.length / targetPassives.length;

  return {
    coveredPassives,
    missingPassives,
    sourcesByPassive,
    coverageRate,
  };
}
