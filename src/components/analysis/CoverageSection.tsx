import { useMemo } from 'react';
import { useOwnedPalsStore } from '../../store/useOwnedPalsStore';
import { useTargetStore } from '../../store/useTargetStore';
import { analyzePassiveCoverage } from '../../logic/analyzePassiveCoverage';
import { recommendMaterials } from '../../logic/recommendMaterials';
import {
  LEVEL_LABEL,
  LEVEL_TONE,
} from '../../logic/calculateMaterialScore';
import { getPal, getPassive } from '../../data';
import { Tag } from '../common/Tag';
import { PassiveTag } from '../common/PassiveTag';
import { EmptyState } from '../common/EmptyState';

export function CoverageSection() {
  const pals = useOwnedPalsStore((s) => s.pals);
  const targetPassives = useTargetStore((s) => s.targetPassives);

  const coverage = useMemo(
    () => analyzePassiveCoverage(pals, targetPassives),
    [pals, targetPassives]
  );

  const ranked = useMemo(
    () => recommendMaterials(pals, targetPassives),
    [pals, targetPassives]
  );

  if (targetPassives.length === 0) {
    return (
      <section className="rounded-2xl bg-bg-panel p-5 shadow-lg ring-1 ring-white/5">
        <Header />
        <EmptyState
          title="尚未設定目標詞條"
          hint="請至 ② 目標規劃 設定後再回來"
        />
      </section>
    );
  }

  const covered = coverage.coveredPassives.length;
  const total = targetPassives.length;
  const rateText = `${covered} / ${total}`;
  const rateTone =
    covered === total ? 'good' : covered > 0 ? 'warn' : 'bad';

  return (
    <section className="space-y-4 rounded-2xl bg-bg-panel p-5 shadow-lg ring-1 ring-white/5">
      <Header right={<Tag tone={rateTone}>覆蓋 {rateText}</Tag>} />

      <div className="space-y-1.5">
        {targetPassives.map((pid) => {
          const sources = coverage.sourcesByPassive[pid] ?? [];
          const isCovered = sources.length > 0;
          const passive = getPassive(pid);
          return (
            <div
              key={pid}
              className="flex flex-wrap items-center gap-2 rounded-md bg-slate-900/40 px-3 py-2 text-xs ring-1 ring-slate-800"
            >
              <span
                className={`font-mono text-sm ${isCovered ? 'text-emerald-400' : 'text-rose-400'}`}
                aria-label={isCovered ? '已覆蓋' : '未覆蓋'}
              >
                {isCovered ? '✓' : '✗'}
              </span>
              <PassiveTag passive={passive} fallbackId={pid} />
              <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                {isCovered ? (
                  sources.map((s) => {
                    const palName = getPal(s.pal_id)?.name_zh ?? s.pal_id;
                    const label = s.nickname
                      ? `${palName}（${s.nickname}）`
                      : palName;
                    return (
                      <Tag
                        key={s.owned_id}
                        tone={s.is_finished ? 'accent' : 'neutral'}
                        title={s.is_finished ? '成品，建議保留' : undefined}
                      >
                        {label}
                        {s.is_finished && ' · 成品'}
                      </Tag>
                    );
                  })
                ) : (
                  <span className="text-slate-500">
                    素材庫內沒有此詞條 — 需要補一隻
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-300">
          推薦素材（依乾淨度排序）
        </h3>
        {ranked.length === 0 ? (
          <EmptyState
            title="素材庫沒有任何含目標詞條的可用素材"
            hint="標記為「成品」的不會列入推薦"
          />
        ) : (
          <ol className="space-y-1.5">
            {ranked.slice(0, 8).map(({ ownedPal, score }, i) => {
              const palName = getPal(ownedPal.pal_id)?.name_zh ?? ownedPal.pal_id;
              return (
                <li
                  key={ownedPal.owned_id}
                  className="flex flex-wrap items-center gap-2 rounded-md bg-slate-900/40 px-3 py-2 text-xs ring-1 ring-slate-800"
                >
                  <span className="w-5 text-right font-mono text-slate-500">
                    {i + 1}.
                  </span>
                  <span className="font-medium text-slate-100">{palName}</span>
                  {ownedPal.nickname && (
                    <span className="text-slate-500">
                      （{ownedPal.nickname}）
                    </span>
                  )}
                  <Tag tone={LEVEL_TONE[score.level]}>
                    {score.score} 分 · {LEVEL_LABEL[score.level]}
                  </Tag>
                  <div className="ml-auto flex flex-wrap gap-1">
                    {score.matchedPassives.map((p) => (
                      <PassiveTag key={p} passive={getPassive(p)} fallbackId={p} />
                    ))}
                    {score.negativePassives.map((p) => (
                      <PassiveTag key={p} passive={getPassive(p)} fallbackId={p} />
                    ))}
                  </div>
                  {score.warnings.length > 0 && (
                    <p className="w-full pl-7 text-[11px] text-amber-300/80">
                      ⚠ {score.warnings.join('；')}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">
          ③ 詞條缺口分析
        </h2>
        <p className="text-xs text-slate-400">
          已擁有 / 缺少的詞條，以及推薦素材排序。
        </p>
      </div>
      {right}
    </header>
  );
}
