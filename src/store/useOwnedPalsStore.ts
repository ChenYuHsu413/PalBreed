import { create } from 'zustand';
import type { OwnedPal, OwnedPalInput } from '../types/owned';
import { ownedPalRepository } from '../services/ownedPalRepository';

interface OwnedPalsState {
  pals: OwnedPal[];
  refresh: () => void;
  add: (input: OwnedPalInput) => OwnedPal;
  update: (id: string, patch: Partial<OwnedPalInput>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useOwnedPalsStore = create<OwnedPalsState>((set) => ({
  pals: ownedPalRepository.list(),

  refresh: () => set({ pals: ownedPalRepository.list() }),

  add: (input) => {
    const created = ownedPalRepository.add(input);
    set({ pals: ownedPalRepository.list() });
    return created;
  },

  update: (id, patch) => {
    ownedPalRepository.update(id, patch);
    set({ pals: ownedPalRepository.list() });
  },

  remove: (id) => {
    ownedPalRepository.remove(id);
    set({ pals: ownedPalRepository.list() });
  },

  clear: () => {
    ownedPalRepository.clear();
    set({ pals: [] });
  },
}));
