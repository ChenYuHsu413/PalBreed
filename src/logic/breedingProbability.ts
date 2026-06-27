/**
 * Palworld 詞條繼承機率計算（社群共識模型）。
 *
 * 規則：
 *   1. 父母詞條合併成「池」（去重，最多 8 個）
 *   2. 子代繼承的詞條數量 K 的分佈：
 *        K=1 → 40%
 *        K=2 → 30%
 *        K=3 → 20%
 *        K=4 → 10%
 *      （若池大小 < 4，過大的 K 不發生，該機率質量會被「截斷」— 我們不重新分佈，
 *       這代表「子代繼承 K 個」的事件不發生時，等同孵到空白，需要重孵）
 *   3. 給定子代繼承 K 個，從池中等機率選取 K 個（C(N, K) 種可能）
 *
 * P(子代繼承指定的目標子集 T) =
 *   Σ_{K=t..min(4,N)}  P(K) × C(N-t, K-t) / C(N, K)
 */

const INHERITANCE_DISTRIBUTION = [0.4, 0.3, 0.2, 0.1] as const; // K=1..4

function comb(n: number, k: number): number {
  if (k < 0 || k > n || n < 0) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n - k) k = n - k;
  let r = 1;
  for (let i = 0; i < k; i++) {
    r = (r * (n - i)) / (i + 1);
  }
  return r;
}

/**
 * P(子代詞條包含指定 t 個目標的全部) — 假設池大小為 N，目標都在池中。
 */
export function probContainsAllTargets(poolSize: number, targetCount: number): number {
  if (targetCount === 0) return 1;
  if (targetCount > poolSize) return 0;
  let p = 0;
  for (let K = targetCount; K <= Math.min(4, poolSize); K++) {
    const pK = INHERITANCE_DISTRIBUTION[K - 1] ?? 0;
    p += pK * (comb(poolSize - targetCount, K - targetCount) / comb(poolSize, K));
  }
  return p;
}

/**
 * P(子代詞條剛好等於指定的 t 個目標，沒有其他詞條) — 子代「完美純化」。
 * 只有 K=t 的情況才算。
 */
export function probExactTargets(poolSize: number, targetCount: number): number {
  if (targetCount === 0) {
    // K=0 不在分佈中（最少繼承 1），「完全空白」不會發生
    return 0;
  }
  if (targetCount > poolSize || targetCount > 4) return 0;
  const pK = INHERITANCE_DISTRIBUTION[targetCount - 1] ?? 0;
  return pK * (1 / comb(poolSize, targetCount));
}

/**
 * P(子代詞條包含至少 m 個指定 t 個目標中的詞條)
 *   — 多次孵蛋累積時有用：「子代有任 2 個目標詞條就先留下」
 */
export function probContainsAtLeast(
  poolSize: number,
  targetCount: number,
  atLeast: number
): number {
  if (atLeast > targetCount) return 0;
  if (atLeast === 0) return 1;
  let p = 0;
  for (let K = 1; K <= Math.min(4, poolSize); K++) {
    const pK = INHERITANCE_DISTRIBUTION[K - 1] ?? 0;
    // P(子代有 ≥ m 個目標 | 繼承 K 個) =
    //   Σ_{j=max(m, K - (N - t))..min(K, t)} C(t, j) * C(N - t, K - j) / C(N, K)
    const N = poolSize;
    const t = targetCount;
    let conditional = 0;
    const jMin = Math.max(atLeast, K - (N - t));
    const jMax = Math.min(K, t);
    for (let j = jMin; j <= jMax; j++) {
      conditional += (comb(t, j) * comb(N - t, K - j)) / comb(N, K);
    }
    p += pK * conditional;
  }
  return p;
}

/**
 * 預期所需蛋數 = 1 / p
 */
export function expectedEggs(p: number): number {
  if (p <= 0) return Infinity;
  return 1 / p;
}

export function formatPct(p: number, decimals = 1): string {
  if (p <= 0) return '0%';
  if (p >= 0.999999) return '100%';
  return `${(p * 100).toFixed(decimals)}%`;
}

export function formatEggs(eggs: number): string {
  if (!Number.isFinite(eggs)) return '∞';
  if (eggs >= 100) return `≥ 100 顆`;
  if (eggs >= 10) return `~ ${Math.round(eggs)} 顆`;
  return `~ ${eggs.toFixed(1)} 顆`;
}
