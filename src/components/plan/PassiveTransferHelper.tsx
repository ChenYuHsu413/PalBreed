import { useEffect, useState } from 'react';
import type { Pal } from '../../types/pal';
import type { PassiveSkill } from '../../types/passive';
import {
  getShortestBreedingPaths,
  type BreedingPath,
} from '../../services/paldbBreed';
import { BreedingPathList } from './BreedingPathList';

interface Props {
  /** 目標詞條 */
  passive: PassiveSkill | undefined;
  passiveId: string;
  /** 詞條目前在哪隻個體上 */
  fromPal: Pal;
  fromNickname?: string;
  /** 想轉到的物種（推薦組合的某一邊父代）*/
  toPals: Pal[];
}

interface PathResult {
  to: Pal;
  paths: BreedingPath[];
  isLoading: boolean;
  isError: boolean;
}

export function PassiveTransferHelper({
  passive,
  passiveId,
  fromPal,
  fromNickname,
  toPals,
}: Props) {
  const [open, setOpen] = useState(false);
  const passiveLabel = passive?.name_zh ?? passiveId;
  const fromLabel = fromNickname
    ? `${fromPal.name_zh}「${fromNickname}」`
    : fromPal.name_zh;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] text-sky-300 underline-offset-2 hover:underline"
      >
        {open
          ? '收起'
          : `🔍 怎麼把「${passiveLabel}」從 ${fromLabel} 轉到組合的父代？`}
      </button>
      {open && <Routes from={fromPal} toPals={toPals} />}
    </div>
  );
}

function Routes({ from, toPals }: { from: Pal; toPals: Pal[] }) {
  const [results, setResults] = useState<PathResult[]>(() =>
    toPals.map((to) => ({ to, paths: [], isLoading: true, isError: false }))
  );

  useEffect(() => {
    let cancelled = false;
    setResults(
      toPals.map((to) => ({ to, paths: [], isLoading: true, isError: false }))
    );

    Promise.all(
      toPals.map(async (to) => {
        try {
          if (to.id === from.id) {
            return { to, paths: [], isLoading: false, isError: false };
          }
          const paths = await getShortestBreedingPaths(
            from.paldb_id,
            to.paldb_id
          );
          return { to, paths, isLoading: false, isError: false };
        } catch {
          return { to, paths: [], isLoading: false, isError: true };
        }
      })
    ).then((all) => {
      if (cancelled) return;
      setResults(all);
    });

    return () => {
      cancelled = true;
    };
  }, [from.id, toPals]);

  return (
    <div className="mt-1.5 space-y-2 rounded-md bg-slate-900/40 p-2 ring-1 ring-slate-800">
      {results.map((r) => (
        <RouteToCard key={r.to.id} from={from} result={r} />
      ))}
    </div>
  );
}

function RouteToCard({
  from,
  result,
}: {
  from: Pal;
  result: PathResult;
}) {
  if (result.to.id === from.id) {
    return (
      <div className="text-[11px] text-emerald-300">
        → 目標物種就是 {result.to.name_zh}（同種，可直接用此個體做父）
      </div>
    );
  }
  if (result.isLoading) {
    return (
      <div className="text-[11px] text-slate-500">
        → 查詢 {from.name_zh} → {result.to.name_zh} 路徑中…
      </div>
    );
  }
  if (result.isError) {
    return (
      <div className="text-[11px] text-rose-300">
        → 查詢 {result.to.name_zh} 路徑失敗
      </div>
    );
  }
  if (result.paths.length === 0) {
    return (
      <div className="text-[11px] text-amber-300">
        → {from.name_zh} 無法配種到 {result.to.name_zh}（PalDB 無路徑）
      </div>
    );
  }

  // 只列 1~2 代的路線（依需求：最短 1 代、最長 2 代全部列出）
  const within2 = result.paths.filter((p) => p.steps.length <= 2);

  if (within2.length === 0) {
    const min = result.paths[0].steps.length;
    return (
      <div className="text-[11px] text-amber-300">
        → 到 {result.to.name_zh} 最短需 {min} 代（超過 2 代，未列出）
      </div>
    );
  }

  return (
    <div className="text-[11px]">
      <div className="mb-1 text-slate-300">
        → 到{' '}
        <span className="font-medium text-slate-100">{result.to.name_zh}</span>
        ，1~2 代可達（共 {within2.length} 條路線）：
      </div>
      <BreedingPathList paths={within2} />
    </div>
  );
}
