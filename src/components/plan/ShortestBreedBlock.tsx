import type { Pal } from '../../types/pal';
import { useShortestPaths } from '../../logic/useShortestPaths';
import { BreedingPathList } from './BreedingPathList';

interface Props {
  parent: Pal;
  target: Pal;
}

/**
 * 「指定一個親代」模式：列出該親代 → 目標子代 3 代內的所有最短配種路徑。
 * 對應 PalDB Breed 頁的「最短配種（Breed Tree, Shortest Path）」。
 */
export function ShortestBreedBlock({ parent, target }: Props) {
  const { paths, isLoading, isError } = useShortestPaths(
    parent.paldb_id,
    target.paldb_id,
    3
  );

  return (
    <div className="rounded-lg bg-sky-500/10 px-3 py-3 ring-1 ring-sky-500/30">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-sky-200">
        <span>🧭 最短配種</span>
        <span className="text-slate-300">
          {parent.name_zh} → {target.name_zh}（3 代內）
        </span>
      </div>

      {parent.id === target.id && (
        <p className="text-[11px] text-emerald-300">
          指定親代就是目標物種，直接同種配種即可，無需中間路徑。
        </p>
      )}

      {parent.id !== target.id && isLoading && (
        <p className="text-[11px] text-slate-400">正在查詢 PalDB 最短配種樹…</p>
      )}

      {parent.id !== target.id && isError && (
        <p className="text-[11px] text-rose-300">查詢失敗，請稍後重試。</p>
      )}

      {parent.id !== target.id && !isLoading && !isError && paths.length === 0 && (
        <p className="text-[11px] text-amber-300">
          {parent.name_zh} 在 3 代內無法配出 {target.name_zh}（PalDB 無 ≤3 代路徑）。
        </p>
      )}

      {parent.id !== target.id && !isLoading && paths.length > 0 && (
        <BreedingPathList paths={paths} />
      )}
    </div>
  );
}
