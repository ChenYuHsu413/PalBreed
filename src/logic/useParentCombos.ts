import { useEffect, useState } from 'react';
import { getParentCombos, type ParentCombo } from '../services/paldbBreed';

interface State {
  combos: ParentCombo[];
  isLoading: boolean;
  isError: boolean;
}

export function useParentCombos(targetPaldbId: string | undefined): State {
  const [state, setState] = useState<State>({
    combos: [],
    isLoading: false,
    isError: false,
  });

  useEffect(() => {
    if (!targetPaldbId) {
      setState({ combos: [], isLoading: false, isError: false });
      return;
    }
    let cancelled = false;
    setState({ combos: [], isLoading: true, isError: false });

    getParentCombos(targetPaldbId)
      .then((combos) => {
        if (cancelled) return;
        setState({ combos, isLoading: false, isError: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ combos: [], isLoading: false, isError: true });
      });

    return () => {
      cancelled = true;
    };
  }, [targetPaldbId]);

  return state;
}
