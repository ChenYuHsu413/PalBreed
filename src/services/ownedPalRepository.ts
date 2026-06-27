import { nanoid } from 'nanoid';
import type { OwnedPal, OwnedPalInput } from '../types/owned';
import { storage } from './storage';

const KEY = 'owned_pals';

function readAll(): OwnedPal[] {
  return storage.get<OwnedPal[]>(KEY, []);
}

function writeAll(pals: OwnedPal[]): void {
  storage.set(KEY, pals);
}

export const ownedPalRepository = {
  list(): OwnedPal[] {
    return readAll();
  },

  getById(id: string): OwnedPal | undefined {
    return readAll().find((p) => p.owned_id === id);
  },

  add(input: OwnedPalInput): OwnedPal {
    const now = Date.now();
    const pal: OwnedPal = {
      ...input,
      owned_id: nanoid(10),
      created_at: now,
      updated_at: now,
    };
    const all = readAll();
    all.push(pal);
    writeAll(all);
    return pal;
  },

  update(id: string, patch: Partial<OwnedPalInput>): OwnedPal | undefined {
    const all = readAll();
    const idx = all.findIndex((p) => p.owned_id === id);
    if (idx === -1) return undefined;
    const updated: OwnedPal = {
      ...all[idx],
      ...patch,
      owned_id: all[idx].owned_id,
      created_at: all[idx].created_at,
      updated_at: Date.now(),
    };
    all[idx] = updated;
    writeAll(all);
    return updated;
  },

  remove(id: string): boolean {
    const all = readAll();
    const next = all.filter((p) => p.owned_id !== id);
    if (next.length === all.length) return false;
    writeAll(next);
    return true;
  },

  clear(): void {
    storage.remove(KEY);
  },
};
