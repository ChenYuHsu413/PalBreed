import { useEffect, useState } from 'react';
import type { MergePlan, ParentRef } from './suggestMergePlan';
import { getPal } from '../data';
import { breedPair, getPalByPaldbId } from '../services/paldbBreed';
import type { Pal } from '../types/pal';

export interface StepResolution {
  parentASpecies: Pal | null;
  parentBSpecies: Pal | null;
  childPaldbId: string | null;
  childSpecies: Pal | null;
  isSameSpecies: boolean;
  isLoading: boolean;
  isError: boolean;
}

export interface BreedResolution {
  byStep: Record<number, StepResolution>;
  finalSpecies: Pal | null;
}

function parentToPaldbId(
  parent: ParentRef,
  intermediates: Map<number, string | null>
): string | null {
  if (parent.kind === 'owned') {
    return getPal(parent.ownedPal.pal_id)?.paldb_id ?? null;
  }
  return intermediates.get(parent.stepIndex) ?? null;
}

function parentToPal(
  parent: ParentRef,
  intermediates: Map<number, string | null>
): Pal | null {
  if (parent.kind === 'owned') {
    return getPal(parent.ownedPal.pal_id) ?? null;
  }
  const childId = intermediates.get(parent.stepIndex);
  return childId ? (getPalByPaldbId(childId) ?? null) : null;
}

const PLACEHOLDER: StepResolution = {
  parentASpecies: null,
  parentBSpecies: null,
  childPaldbId: null,
  childSpecies: null,
  isSameSpecies: false,
  isLoading: true,
  isError: false,
};

/**
 * 從 PalDB API 逐步查詢每一輪配種的子代物種。
 * 後一輪的父代物種依賴前一輪的子代物種，所以需要按順序解析。
 */
export function useBreedResolution(plan: MergePlan): BreedResolution {
  const [byStep, setByStep] = useState<Record<number, StepResolution>>({});

  useEffect(() => {
    let cancelled = false;
    setByStep({});

    async function resolve() {
      const intermediates = new Map<number, string | null>();
      const next: Record<number, StepResolution> = {};

      for (const step of plan.steps) {
        if (cancelled) return;

        const aId = parentToPaldbId(step.parentA, intermediates);
        const bId = parentToPaldbId(step.parentB, intermediates);
        const aPal = parentToPal(step.parentA, intermediates);
        const bPal = parentToPal(step.parentB, intermediates);

        next[step.index] = { ...PLACEHOLDER };
        setByStep({ ...next });

        let childPaldbId: string | null = null;
        let isError = false;

        if (aId && bId) {
          try {
            childPaldbId = await breedPair(aId, bId);
          } catch {
            isError = true;
          }
        } else {
          isError = true;
        }

        if (cancelled) return;

        intermediates.set(step.index, childPaldbId);

        const childSpecies = childPaldbId
          ? (getPalByPaldbId(childPaldbId) ?? null)
          : null;

        const isSameSpecies =
          !!aPal && !!bPal && aPal.id === bPal.id;

        next[step.index] = {
          parentASpecies: aPal,
          parentBSpecies: bPal,
          childPaldbId,
          childSpecies,
          isSameSpecies,
          isLoading: false,
          isError,
        };
        setByStep({ ...next });
      }
    }

    if (plan.steps.length > 0) resolve();

    return () => {
      cancelled = true;
    };
  }, [plan]);

  const finalStep = plan.steps[plan.steps.length - 1];
  const finalSpecies = finalStep
    ? (byStep[finalStep.index]?.childSpecies ?? null)
    : null;

  return { byStep, finalSpecies };
}

export function describeStepTone(
  res: StepResolution | undefined
): 'good' | 'warn' | 'bad' | 'neutral' {
  if (!res || res.isLoading) return 'neutral';
  if (res.isError || !res.childPaldbId) return 'bad';
  return res.isSameSpecies ? 'good' : 'warn';
}
