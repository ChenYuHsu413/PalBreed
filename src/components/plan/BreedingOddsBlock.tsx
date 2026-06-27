import { useState } from 'react';
import type { AnalyzedCombo } from '../../logic/analyzeBreedingPaths';
import type { OwnedPal } from '../../types/owned';
import { getPassive } from '../../data';
import {
  expectedEggs,
  formatEggs,
  formatPct,
  probContainsAllTargets,
  probContainsAtLeast,
} from '../../logic/breedingProbability';
import { PassiveTag } from '../common/PassiveTag';

interface Props {
  combo: AnalyzedCombo;
  targetPassives: string[];
}

/**
 * 從一個 slot 的所有擁有個體中，挑「最佳父代」：
 *  - 帶最多目標詞條
 *  - 同分時帶最少非目標詞條（污染少）
 */
function pickBest(
  candidates: OwnedPal[],
  targetSet: Set<string>,
  exclude?: string
): OwnedPal | undefined {
  const scored = candidates
    .filter((c) => c.owned_id !== exclude)
    .map((c) => {
      const matched = c.passives.filter((p) => targetSet.has(p)).length;
      const junk = c.passives.length - matched;
      return { c, matched, junk };
    })
    .sort((a, b) => b.matched - a.matched || a.junk - b.junk);
  return scored[0]?.c;
}

export function BreedingOddsBlock({ combo, targetPassives }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const targetSet = new Set(targetPassives);

  // 挑兩個父代個體
  let parentA: OwnedPal | undefined;
  let parentB: OwnedPal | undefined;

  if (combo.isSameSpecies) {
    parentA = pickBest(combo.slotA.ownedMatching, targetSet);
    parentB = pickBest(combo.slotA.ownedMatching, targetSet, parentA?.owned_id);
  } else {
    parentA = pickBest(combo.slotA.ownedMatching, targetSet);
    parentB = pickBest(combo.slotB.ownedMatching, targetSet);
  }

  if (!parentA || !parentB) return null;

  // 詞條池
  const poolSet = new Set<string>();
  for (const p of parentA.passives) poolSet.add(p);
  for (const p of parentB.passives) poolSet.add(p);
  const pool = Array.from(poolSet);
  const targetsInPool = pool.filter((p) => targetSet.has(p));
  const poolSize = pool.length;
  const t = targetsInPool.length;

  const pAll = probContainsAllTargets(poolSize, t);
  const pAtLeast2 = probContainsAtLeast(poolSize, t, Math.min(2, t));
  const pAtLeast3 = probContainsAtLeast(poolSize, t, Math.min(3, t));
  const eggsForAll = expectedEggs(pAll);

  return (
    <div className="mt-2 rounded-md bg-slate-900/40 px-3 py-2 ring-1 ring-slate-800">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px]">
        <span className="font-medium text-slate-300">配種機率</span>
        <span className="text-slate-400">
          詞條池：{poolSize} 個（目標 {t} / 雜訊 {poolSize - t}）
        </span>
        <span className="ml-auto text-slate-400">
          孵 1 顆蛋拿到{' '}
          <span className="font-medium text-emerald-300">
            全 {t} 個目標 ＝ {formatPct(pAll)}
          </span>
          ， 預期 <span className="text-amber-200">{formatEggs(eggsForAll)}</span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="mt-1 text-[11px] text-sky-300 underline-offset-2 hover:underline"
      >
        {showDetail ? '收起明細' : '展開明細（詞條池 / 部分繼承機率）'}
      </button>

      {showDetail && (
        <div className="mt-1.5 space-y-2 text-[11px]">
          <div>
            <div className="text-slate-400">詞條池：</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {pool.map((p) => {
                const isTarget = targetSet.has(p);
                return (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1"
                    title={isTarget ? '目標詞條' : '非目標（雜訊）'}
                  >
                    <span
                      className={`font-mono text-[10px] ${
                        isTarget ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isTarget ? '★' : '•'}
                    </span>
                    <PassiveTag passive={getPassive(p)} fallbackId={p} />
                  </span>
                );
              })}
            </div>
          </div>

          <div className="rounded bg-slate-800/60 px-2 py-1.5 ring-1 ring-slate-700">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label={`含全部 ${t} 個`} p={pAll} highlight />
              {t >= 2 && <Stat label={`含 ≥ 2 個`} p={pAtLeast2} />}
              {t >= 3 && <Stat label={`含 ≥ 3 個`} p={pAtLeast3} />}
            </div>
          </div>

          <p className="text-slate-500">
            ＊ 模型假設：子代繼承 1/2/3/4 個詞條的機率為
            40% / 30% / 20% / 10%；給定繼承 K 個，從父代詞條池中等機率抽取。
            高稀有度（S 級）實際繼承率可能略低於此估計。
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  p,
  highlight = false,
}: {
  label: string;
  p: number;
  highlight?: boolean;
}) {
  const eggs = expectedEggs(p);
  return (
    <div>
      <div className="text-[10px] text-slate-500">{label}</div>
      <div
        className={`font-mono ${
          highlight ? 'text-emerald-300' : 'text-slate-200'
        }`}
      >
        {formatPct(p)}
      </div>
      <div className="text-[10px] text-amber-200">{formatEggs(eggs)}</div>
    </div>
  );
}
