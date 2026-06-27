import { useState } from 'react';
import type { BreedingPath } from '../../services/paldbBreed';

interface Props {
  paths: BreedingPath[];
  /** 每個代數分組預設顯示幾條，其餘折疊 */
  perGroupCap?: number;
}

/** 把路徑依「代數（步數）」分組，逐組列出，多的可展開。 */
export function BreedingPathList({ paths, perGroupCap = 5 }: Props) {
  const groups = new Map<number, BreedingPath[]>();
  for (const p of paths) {
    const g = p.steps.length;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(p);
  }
  const gens = Array.from(groups.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-2">
      {gens.map((gen) => (
        <PathGroup
          key={gen}
          gen={gen}
          paths={groups.get(gen)!}
          cap={perGroupCap}
        />
      ))}
    </div>
  );
}

function PathGroup({
  gen,
  paths,
  cap,
}: {
  gen: number;
  paths: BreedingPath[];
  cap: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? paths : paths.slice(0, cap);
  const hidden = paths.length - shown.length;

  return (
    <div>
      <div className="mb-1 text-[11px] text-slate-400">
        <span className="text-amber-300">{gen} 代</span>
        （共 {paths.length} 條）
      </div>
      <ol className="space-y-1.5">
        {shown.map((path, i) => (
          <li
            key={i}
            className="rounded-md bg-slate-900/40 px-2 py-1.5 ring-1 ring-slate-800"
          >
            <ol className="space-y-0.5">
              {path.steps.map((s, j) => {
                const a = s.parentA?.name_zh ?? s.parentAEnUrl;
                const b = s.parentB?.name_zh ?? s.parentBEnUrl;
                const c = s.child?.name_zh ?? s.childEnUrl;
                return (
                  <li key={j} className="font-mono text-[11px] text-slate-300">
                    {j + 1}. {a} × {b} ={' '}
                    <span className="text-emerald-300">{c}</span>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 text-[11px] text-sky-300 underline-offset-2 hover:underline"
        >
          顯示其餘 {hidden} 條
        </button>
      )}
      {expanded && paths.length > cap && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 ml-2 text-[11px] text-slate-400 underline-offset-2 hover:underline"
        >
          收起
        </button>
      )}
    </div>
  );
}
