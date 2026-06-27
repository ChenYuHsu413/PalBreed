import { create } from 'zustand';
import { storage } from '../services/storage';
import { getBuild } from '../data';

interface PersistedTarget {
  targetPalId: string | null;
  /** 選填：指定其中一個親代，用來查「該親代 → 子代」最短配種樹 */
  parentPalId: string | null;
  buildId: string | null;
  targetPassives: string[];
}

interface TargetState extends PersistedTarget {
  setTargetPal: (id: string | null) => void;
  setParentPal: (id: string | null) => void;
  setBuild: (id: string | null) => void;
  setTargetPassives: (ids: string[]) => void;
  toggleTargetPassive: (id: string) => void;
  reset: () => void;
}

const KEY = 'target';

const DEFAULT: PersistedTarget = {
  targetPalId: null,
  parentPalId: null,
  buildId: null,
  targetPassives: [],
};

function load(): PersistedTarget {
  return { ...DEFAULT, ...storage.get<Partial<PersistedTarget>>(KEY, {}) };
}

function persist(s: PersistedTarget) {
  storage.set(KEY, s);
}

export const useTargetStore = create<TargetState>((set, get) => ({
  ...load(),

  setTargetPal: (id) => {
    set({ targetPalId: id });
    persist(snapshot(get()));
  },

  setParentPal: (id) => {
    set({ parentPalId: id });
    persist(snapshot(get()));
  },

  setBuild: (id) => {
    const build = id ? getBuild(id) : undefined;
    set({
      buildId: id,
      targetPassives: build ? [...build.passives] : get().targetPassives,
    });
    persist(snapshot(get()));
  },

  setTargetPassives: (ids) => {
    set({ targetPassives: ids });
    persist(snapshot(get()));
  },

  toggleTargetPassive: (id) => {
    const cur = get().targetPassives;
    const next = cur.includes(id)
      ? cur.filter((x) => x !== id)
      : cur.length >= 4
        ? cur
        : [...cur, id];
    set({ targetPassives: next });
    persist(snapshot(get()));
  },

  reset: () => {
    set({ ...DEFAULT });
    persist(DEFAULT);
  },
}));

function snapshot(s: TargetState): PersistedTarget {
  return {
    targetPalId: s.targetPalId,
    parentPalId: s.parentPalId,
    buildId: s.buildId,
    targetPassives: s.targetPassives,
  };
}
