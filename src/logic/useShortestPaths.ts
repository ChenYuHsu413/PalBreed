import { useEffect, useState } from 'react';
import {
  getShortestBreedingPaths,
  type BreedingPath,
} from '../services/paldbBreed';

interface State {
  paths: BreedingPath[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * 查 PalDB 最短配種樹（pal_breed_pc），回傳 ≤ maxGen 代的所有路徑（依代數排序）。
 * fromPaldbId / toPaldbId 任一為空時不查詢。
 */
export function useShortestPaths(
  fromPaldbId: string | undefined,
  toPaldbId: string | undefined,
  maxGen = 3
): State {
  const [state, setState] = useState<State>({
    paths: [],
    isLoading: false,
    isError: false,
  });

  useEffect(() => {
    if (!fromPaldbId || !toPaldbId || fromPaldbId === toPaldbId) {
      setState({ paths: [], isLoading: false, isError: false });
      return;
    }
    let cancelled = false;
    setState({ paths: [], isLoading: true, isError: false });

    getShortestBreedingPaths(fromPaldbId, toPaldbId)
      .then((all) => {
        if (cancelled) return;
        const paths = all.filter((p) => p.steps.length <= maxGen);
        setState({ paths, isLoading: false, isError: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ paths: [], isLoading: false, isError: true });
      });

    return () => {
      cancelled = true;
    };
  }, [fromPaldbId, toPaldbId, maxGen]);

  return state;
}
