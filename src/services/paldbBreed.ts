import { PALS } from '../data';
import type { Pal } from '../types/pal';

/**
 * 對 PalDB API 的薄包裝：
 *  - 輸入：兩個父代的 paldb_id（如 "JetDragon" + "BlackGriffon"）
 *  - 輸出：子代的 paldb_id（從 HTML 回傳中解析後反查得到）
 *
 * PalDB 的回應中，href 使用「EN URL 名」（如 Jetragon、Frostallion_Noct）而非 paldb_id。
 * 所以我們需要建立 EN URL 名 → Pal 的反查表。
 */

const cache = new Map<string, Promise<string | null>>();

function cacheKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

function toEnUrl(nameEn: string): string {
  return nameEn.replace(/\s+/g, '_');
}

const palByEnUrl = new Map<string, Pal>(
  PALS.map((p) => [toEnUrl(p.name_en), p])
);

const palByPaldbId = new Map<string, Pal>(
  PALS.map((p) => [p.paldb_id, p])
);

/**
 * 從 HTML 回應中找出子代 EN URL 名。
 * 回應格式：「<a href="父">父</a>+<a href="父">父</a>=<a href="子">子</a>」
 * 最後一個 href 即子代。
 */
function parseChildEnUrl(html: string): string | null {
  const matches = Array.from(html.matchAll(/href="([A-Za-z0-9_]+)"/g));
  if (matches.length === 0) return null;
  return matches[matches.length - 1][1];
}

/**
 * 透過 PalDB API 算出 (parentA paldb_id) × (parentB paldb_id) = 子代 paldb_id
 */
export async function breedPair(
  parentA: string,
  parentB: string
): Promise<string | null> {
  const key = cacheKey(parentA, parentB);
  if (cache.has(key)) return cache.get(key)!;

  const promise = (async () => {
    try {
      const url = `/api/paldb/pal_breed_2?parent2a=${encodeURIComponent(parentA)}&parent2b=${encodeURIComponent(parentB)}`;
      const res = await fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) return null;
      const html = await res.text();
      const childEnUrl = parseChildEnUrl(html);
      if (!childEnUrl) return null;

      // 嘗試 EN URL 反查；找不到時退而求其次：直接視為 paldb_id 候選
      const pal = palByEnUrl.get(childEnUrl);
      if (pal) return pal.paldb_id;
      return childEnUrl; // 我們資料庫沒收錄這隻，仍把 PalDB 的 URL 回去
    } catch (err) {
      console.warn('[paldbBreed] fetch failed', err);
      return null;
    }
  })();

  cache.set(key, promise);
  return promise;
}

export function getPalByPaldbId(paldbId: string): Pal | undefined {
  return palByPaldbId.get(paldbId);
}

export function getPalByEnUrl(enUrl: string): Pal | undefined {
  return palByEnUrl.get(enUrl);
}

export interface ParentCombo {
  parentAEnUrl: string;
  parentBEnUrl: string;
  parentA?: Pal;
  parentB?: Pal;
  isSameSpecies: boolean;
}

const parentCombosCache = new Map<string, Promise<ParentCombo[]>>();

/**
 * 查 PalDB Parent Calculator（/api/pal_breed_3）
 *  - 輸入：目標子代 paldb_id（例：BlackGriffon）
 *  - 輸出：所有能配出該子代的父母組合
 *
 * PalDB 回應的 HTML 中，每一個父母組合在一個 <div class="col"> 內，
 * 包含 3 個 href（父A、父B、子代），href 值為 EN URL 名。
 */
export async function getParentCombos(
  childPaldbId: string
): Promise<ParentCombo[]> {
  if (parentCombosCache.has(childPaldbId)) {
    return parentCombosCache.get(childPaldbId)!;
  }

  const promise = (async () => {
    try {
      const url = `/api/paldb/pal_breed_3?child3=${encodeURIComponent(childPaldbId)}`;
      const res = await fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) return [];
      const html = await res.text();
      return parseParentCombos(html);
    } catch (err) {
      console.warn('[paldbBreed] getParentCombos failed', err);
      return [];
    }
  })();

  parentCombosCache.set(childPaldbId, promise);
  return promise;
}

function parseParentCombos(html: string): ParentCombo[] {
  const combos: ParentCombo[] = [];
  // PalDB 用 class="col" 切割每組
  const cols = html.split('class="col">');
  for (let i = 1; i < cols.length; i++) {
    const block = cols[i];
    const hrefs = Array.from(block.matchAll(/href="([A-Za-z0-9_]+)"/g)).map(
      (m) => m[1]
    );
    if (hrefs.length < 3) continue;
    const parentAEnUrl = hrefs[0];
    const parentBEnUrl = hrefs[1];
    combos.push({
      parentAEnUrl,
      parentBEnUrl,
      parentA: palByEnUrl.get(parentAEnUrl),
      parentB: palByEnUrl.get(parentBEnUrl),
      isSameSpecies: parentAEnUrl === parentBEnUrl,
    });
  }
  return combos;
}

export interface BreedingStep {
  parentAEnUrl: string;
  parentBEnUrl: string;
  childEnUrl: string;
  parentA?: Pal;
  parentB?: Pal;
  child?: Pal;
}

export interface BreedingPath {
  steps: BreedingStep[];
}

const shortestPathCache = new Map<string, Promise<BreedingPath[]>>();

/**
 * 查 PalDB 最短配種路徑（/api/pal_breed_pc）
 *   - 輸入：起點 parent paldb_id、終點 child paldb_id
 *   - 輸出：多條路徑（每條由若干 step 組成）
 *
 * 回傳值已按 step 長度由短到長排序，呼叫端通常只需取最短幾條。
 */
export async function getShortestBreedingPaths(
  fromPaldbId: string,
  toPaldbId: string
): Promise<BreedingPath[]> {
  const key = `${fromPaldbId}>${toPaldbId}`;
  if (shortestPathCache.has(key)) return shortestPathCache.get(key)!;

  const promise = (async () => {
    try {
      const url = `/api/paldb/pal_breed_pc?parent=${encodeURIComponent(fromPaldbId)}&child=${encodeURIComponent(toPaldbId)}`;
      const res = await fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) return [];
      const html = await res.text();
      return parseBreedingPaths(html);
    } catch (err) {
      console.warn('[paldbBreed] getShortestBreedingPaths failed', err);
      return [];
    }
  })();

  shortestPathCache.set(key, promise);
  return promise;
}

function parseBreedingPaths(html: string): BreedingPath[] {
  const blocks = html.split('class="border-top col py-1 my-1 row');
  const paths: BreedingPath[] = [];
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const stepChunks = block.split('<div class="col">').slice(1);
    const steps: BreedingStep[] = [];
    for (const ch of stepChunks) {
      const hrefs = Array.from(ch.matchAll(/href="([A-Za-z0-9_]+)"/g)).map(
        (m) => m[1]
      );
      if (hrefs.length < 3) continue;
      steps.push({
        parentAEnUrl: hrefs[0],
        parentBEnUrl: hrefs[1],
        childEnUrl: hrefs[2],
        parentA: palByEnUrl.get(hrefs[0]),
        parentB: palByEnUrl.get(hrefs[1]),
        child: palByEnUrl.get(hrefs[2]),
      });
    }
    if (steps.length > 0) {
      paths.push({ steps });
    }
  }
  paths.sort((a, b) => a.steps.length - b.steps.length);
  return paths;
}
