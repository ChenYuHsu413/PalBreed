import { useState } from 'react';
import { useOwnedPalsStore } from '../../store/useOwnedPalsStore';
import { useParentCombos } from '../../logic/useParentCombos';
import type { Pal } from '../../types/pal';

interface Props {
  species: Pal;
}

/**
 * 「怎麼孵出這隻」遞迴助手 — 預設收起，點開後查 PalDB。
 */
export function MissingParentHelper({ species }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] text-sky-300 underline-offset-2 hover:underline"
      >
        {open ? '收起' : `🔍 怎麼孵出 ${species.name_zh}？`}
      </button>
      {open && <ParentSuggestions species={species} />}
    </div>
  );
}

function ParentSuggestions({ species }: { species: Pal }) {
  const { combos, isLoading, isError } = useParentCombos(species.paldb_id);
  const owned = useOwnedPalsStore((s) => s.pals);

  if (isLoading) {
    return (
      <p className="mt-1 text-[11px] text-slate-500">查詢中…</p>
    );
  }
  if (isError) {
    return (
      <p className="mt-1 text-[11px] text-rose-300">PalDB 查詢失敗</p>
    );
  }
  if (combos.length === 0) {
    return (
      <p className="mt-1 text-[11px] text-amber-300">
        無法配種（PalDB 沒收錄此 種類的父母組合，可能為野生獨佔）
      </p>
    );
  }

  // 對照素材：哪些組合的雙親我都有？
  const ownedSpeciesIds = new Set(owned.map((o) => o.pal_id));

  const ranked = combos
    .map((c) => {
      const hasA = c.parentA ? ownedSpeciesIds.has(c.parentA.id) : false;
      const hasB = c.parentB ? ownedSpeciesIds.has(c.parentB.id) : false;
      const score =
        (hasA && hasB ? 100 : 0) +
        (hasA || hasB ? 30 : 0) +
        (c.isSameSpecies ? 5 : 0);
      return { combo: c, hasA, hasB, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <ul className="mt-1.5 space-y-1 rounded-md bg-slate-900/40 p-2 text-[11px] ring-1 ring-slate-800">
      {ranked.map(({ combo, hasA, hasB }, i) => {
        const aName = combo.parentA?.name_zh ?? combo.parentAEnUrl;
        const bName = combo.parentB?.name_zh ?? combo.parentBEnUrl;
        const both = hasA && hasB;
        const some = hasA || hasB;
        const tone = both
          ? 'text-emerald-300'
          : some
            ? 'text-amber-200'
            : 'text-slate-400';
        return (
          <li key={i} className="flex flex-wrap items-center gap-1">
            <span className="font-mono text-slate-500">{i + 1}.</span>
            <span className={hasA ? 'text-emerald-300' : 'text-slate-400'}>
              {hasA && '✓ '}{aName}
            </span>
            <span className="text-slate-500">×</span>
            <span className={hasB ? 'text-emerald-300' : 'text-slate-400'}>
              {hasB && '✓ '}{bName}
            </span>
            <span className={`ml-1 ${tone}`}>
              {both ? '雙親都有，可直接配' : some ? '只缺一邊' : '雙親都沒有'}
            </span>
          </li>
        );
      })}
      {combos.length > 5 && (
        <li className="text-slate-500">… 共 {combos.length} 組組合（顯示前 5）</li>
      )}
    </ul>
  );
}
