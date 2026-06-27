import { useMemo } from 'react';
import { useOwnedPalsStore } from '../../store/useOwnedPalsStore';
import { useTargetStore } from '../../store/useTargetStore';
import { getPal, getPassive } from '../../data';
import { useParentCombos } from '../../logic/useParentCombos';
import {
  analyzeBreedingPaths,
  type AnalyzedCombo,
  type ComboParentSlot,
  type GenderBreakdown,
  type PairingStatus,
} from '../../logic/analyzeBreedingPaths';
import type { Gender } from '../../types/owned';
import { PassiveTag } from '../common/PassiveTag';
import { PalAvatar } from '../common/PalAvatar';
import { EmptyState } from '../common/EmptyState';
import { MissingParentHelper } from './MissingParentHelper';
import { PassiveTransferHelper } from './PassiveTransferHelper';
import { BreedingOddsBlock } from './BreedingOddsBlock';
import { ShortestBreedBlock } from './ShortestBreedBlock';
import { canBreedFromOthers } from '../../services/paldbBreed';

const PAIRING_UI: Record<
  PairingStatus,
  { tone: string; text: string }
> = {
  ready: {
    tone: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    text: '✓ 可配種（一公一母齊）',
  },
  uncertain: {
    tone: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
    text: '◐ 性別待確認',
  },
  'gender-blocked': {
    tone: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
    text: '⚠ 性別不齊（缺異性）',
  },
  'one-side': {
    tone: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
    text: '◐ 只有一邊',
  },
  none: {
    tone: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    text: '✗ 都沒有',
  },
};

function GenderIcon({ gender }: { gender: Gender }) {
  if (gender === 'male') return <span className="text-sky-300">♂</span>;
  if (gender === 'female') return <span className="text-pink-300">♀</span>;
  return <span className="text-slate-500">—</span>;
}

function GenderBreakdownLine({ genders }: { genders: GenderBreakdown }) {
  const { male, female, unknown } = genders;
  if (male + female + unknown === 0) return null;
  return (
    <span className="text-[11px] font-mono">
      <span className="text-sky-300">♂{male}</span>{' '}
      <span className="text-pink-300">♀{female}</span>
      {unknown > 0 && <span className="text-slate-500"> —{unknown}</span>}
    </span>
  );
}

export function MergePlanSection() {
  const pals = useOwnedPalsStore((s) => s.pals);
  const { targetPalId, parentPalId, targetPassives } = useTargetStore();

  const targetPal = targetPalId ? getPal(targetPalId) : null;
  const parentPal = parentPalId ? getPal(parentPalId) : null;
  const { combos, isLoading, isError } = useParentCombos(targetPal?.paldb_id);

  const analysis = useMemo(
    () =>
      analyzeBreedingPaths(combos, pals, targetPalId, targetPassives),
    [combos, pals, targetPalId, targetPassives]
  );

  if (!targetPalId) {
    return (
      <section className="rounded-2xl bg-bg-panel p-5 shadow-lg ring-1 ring-white/5">
        <Header />
        <EmptyState
          title="尚未選擇目標帕魯"
          hint="請至 ② 目標規劃 選擇目標帕魯"
        />
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl bg-bg-panel p-5 shadow-lg ring-1 ring-white/5">
      <Header />

      <Notice />

      {parentPal && targetPal && (
        <ShortestBreedBlock parent={parentPal} target={targetPal} />
      )}

      {isLoading && (
        <div className="rounded-md bg-slate-900/40 px-3 py-2 text-xs text-slate-400 ring-1 ring-slate-800">
          正在查詢 PalDB 配種表…
        </div>
      )}

      {isError && (
        <div className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
          PalDB API 查詢失敗，請稍後重試。
        </div>
      )}

      {!isLoading && !isError && combos.length === 0 && (
        <EmptyState
          title="PalDB 沒有此目標的父母組合"
          hint="可能尚未收錄、或此種為野生獨佔不可配種"
        />
      )}

      {!isLoading && combos.length > 0 && (
        <>
          {analysis.notes.length > 0 && (
            <div className="space-y-1 rounded-md bg-amber-500/10 px-3 py-2 ring-1 ring-amber-500/30">
              {analysis.notes.map((n, i) => (
                <p key={i} className="text-xs text-amber-200">
                  ⚠ {n}
                </p>
              ))}
            </div>
          )}

          <CombosList analysis={analysis} targetPassives={targetPassives} />

          {analysis.recommendedCombo && (
            <RecommendedStrategy
              targetName={targetPal?.name_zh ?? targetPalId}
              recommended={analysis.recommendedCombo}
              hasTargetSpeciesOwned={analysis.hasTargetSpeciesOwned}
              targetPassives={targetPassives}
              ownedPals={pals}
            />
          )}
        </>
      )}
    </section>
  );
}

function Header() {
  return (
    <header>
      <h2 className="text-lg font-semibold text-slate-100">④ 配種策略</h2>
      <p className="text-xs text-slate-400">
        根據 PalDB 配種表，列出能配出目標的父母組合，並對照你手上素材推薦路線。
      </p>
    </header>
  );
}

function Notice() {
  return (
    <div className="rounded-md bg-slate-900/40 px-3 py-2 text-[11px] text-slate-400 ring-1 ring-slate-800">
      <p className="font-medium text-slate-300">＊ 配種策略原則：</p>
      <ul className="ml-3 mt-1 list-disc space-y-0.5">
        <li>
          每個物種只能由<span className="text-slate-300">特定父母組合</span>產生（PalDB 配種表）
        </li>
        <li>
          一對配種必須<span className="text-sky-300">♂一公</span>+
          <span className="text-pink-300">♀一母</span>，系統會依你素材的性別判斷能否配
        </li>
        <li>
          詞條從父代詞條池
          <span className="text-amber-300">隨機</span>繼承 0~4 個，需多次嘗試
        </li>
        <li>
          純化詞條的最佳路線：先用組合配出 1 隻目標物種帶單詞條 → 再
          <span className="text-emerald-300">同種配種</span>逐步集中
        </li>
      </ul>
    </div>
  );
}

function CombosList({
  analysis,
  targetPassives,
}: {
  analysis: ReturnType<typeof analyzeBreedingPaths>;
  targetPassives: string[];
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-slate-300">
        能配出目標的父母組合（共 {analysis.combos.length} 組，依推薦度排序）
      </h3>
      <ol className="space-y-2">
        {analysis.combos.map((combo, i) => (
          <ComboRow
            key={i}
            combo={combo}
            rank={i + 1}
            targetPassives={targetPassives}
          />
        ))}
      </ol>
    </div>
  );
}

function ComboRow({
  combo,
  rank,
  targetPassives,
}: {
  combo: AnalyzedCombo;
  rank: number;
  targetPassives: string[];
}) {
  const { tone: statusTone, text: statusText } = PAIRING_UI[combo.pairing];

  return (
    <li className="rounded-lg bg-slate-900/40 p-3 ring-1 ring-slate-800">
      <header className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
          組合 {rank}
        </span>
        {combo.isSameSpecies && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300 ring-1 ring-emerald-500/30">
            同種配種
          </span>
        )}
        <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${statusTone}`}>
          {statusText}
        </span>
        {combo.passiveCoverageFromThisCombo.length > 0 && (
          <span className="ml-auto text-[11px] text-emerald-300/80">
            此組合素材可提供 {combo.passiveCoverageFromThisCombo.length} 個目標詞條
          </span>
        )}
      </header>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <SlotBlock slot={combo.slotA} side="親代 A" />
        <SlotBlock slot={combo.slotB} side="親代 B" />
      </div>
      <PairingHint combo={combo} />
      {combo.hasBothParents && (
        <BreedingOddsBlock combo={combo} targetPassives={targetPassives} />
      )}
    </li>
  );
}

function PairingHint({ combo }: { combo: AnalyzedCombo }) {
  if (combo.pairing === 'gender-blocked') {
    const need = combo.isSameSpecies
      ? `你的${combo.slotA.species?.name_zh ?? combo.slotA.enUrl}都是同性別，需要再取得一隻異性個體才能配。`
      : '兩種素材目前都是同性別，需要其中一邊換成異性個體（配種必須一公一母）。';
    return (
      <p className="mt-2 rounded-md bg-orange-500/10 px-2.5 py-1.5 text-[11px] text-orange-300 ring-1 ring-orange-500/30">
        ⚠ {need}
      </p>
    );
  }
  if (combo.pairing === 'uncertain') {
    return (
      <p className="mt-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200 ring-1 ring-amber-500/30">
        ◐ 需靠性別未知的個體湊對，請進遊戲確認牠們是一公一母。
      </p>
    );
  }
  return null;
}

function SlotBlock({
  slot,
  side,
}: {
  slot: ComboParentSlot;
  side: string;
}) {
  const speciesName = slot.species?.name_zh ?? slot.enUrl;
  const has = slot.ownedMatching.length > 0;

  return (
    <div className="rounded-md bg-slate-800/60 px-3 py-2 ring-1 ring-slate-700">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          {slot.species && <PalAvatar palId={slot.species.id} size={28} />}
          <span>
            {side}：
            <span className="ml-1 text-sm font-medium text-slate-100">
              {speciesName}
            </span>
            {!slot.species && (
              <span className="ml-1 text-[10px] text-slate-500">
                ({slot.enUrl})
              </span>
            )}
          </span>
        </div>
        <span className="flex items-center gap-2">
          {has && <GenderBreakdownLine genders={slot.genders} />}
          <span
            className={`text-xs font-mono ${has ? 'text-emerald-300' : 'text-rose-400'}`}
          >
            {has ? `✓ ${slot.ownedMatching.length} 隻` : '✗ 沒有'}
          </span>
        </span>
      </div>
      {slot.ownedWithTargetPassives.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {slot.ownedWithTargetPassives.map(({ ownedPal, matchedPassives }) => (
            <li
              key={ownedPal.owned_id}
              className="flex flex-wrap items-center gap-1 text-[11px] text-slate-300"
            >
              <GenderIcon gender={ownedPal.gender} />
              <span className="text-slate-400">
                {ownedPal.nickname || `(無暱稱)`}
              </span>
              <span className="text-slate-500">·</span>
              {matchedPassives.map((p) => (
                <PassiveTag key={p} passive={getPassive(p)} fallbackId={p} />
              ))}
            </li>
          ))}
        </ul>
      )}
      {!has && slot.species && (
        <MissingParentHelper species={slot.species} />
      )}
    </div>
  );
}

function RecommendedStrategy({
  targetName,
  recommended,
  hasTargetSpeciesOwned,
  targetPassives,
  ownedPals,
}: {
  targetName: string;
  recommended: AnalyzedCombo;
  hasTargetSpeciesOwned: boolean;
  targetPassives: string[];
  ownedPals: import('../../types/owned').OwnedPal[];
}) {
  const speciesA = recommended.slotA.species?.name_zh ?? recommended.slotA.enUrl;
  const speciesB = recommended.slotB.species?.name_zh ?? recommended.slotB.enUrl;
  const sameSpecies = recommended.isSameSpecies;

  const steps: string[] = [];

  if (sameSpecies && hasTargetSpeciesOwned) {
    steps.push(
      `❶ 你已經有 ${targetName}，可直接同種配種純化詞條（需一公一母）。各目標詞條的素材轉移到 ${targetName} 後，用 ${targetName} × ${targetName} 集中 4 詞條。`
    );
  } else if (sameSpecies && !hasTargetSpeciesOwned) {
    steps.push(
      `❶ 此組合需要 2 隻 ${targetName}，但你目前沒有。請改用其他組合先孵出第一隻 ${targetName}。`
    );
  } else {
    if (!recommended.slotA.ownedMatching.length) {
      steps.push(`❶ 先取得 ${speciesA}（任何個體即可，最好已帶部分目標詞條）。`);
    } else {
      steps.push(`❶ 你已有 ${speciesA}，可直接用作親代 A。`);
    }
    if (!recommended.slotB.ownedMatching.length) {
      steps.push(`❷ 取得 ${speciesB}。`);
    } else {
      steps.push(`❷ 你已有 ${speciesB}，可直接用作親代 B。`);
    }
    steps.push(
      `❸ ${speciesA} × ${speciesB} → ${targetName}（兩隻須一公一母；多次嘗試直到子代繼承到目標詞條）。`
    );
    steps.push(
      `❹ 重複上述步驟，配出多隻帶不同目標詞條的 ${targetName}（每隻盡量帶 1~2 個目標詞條，避免污染）。`
    );
    steps.push(
      `❺ 收齊後改用 ${targetName} × ${targetName}（同種配種）逐步集中 4 詞條。`
    );
  }

  // 標示哪些目標詞條此組合的素材已覆蓋
  const coveredByCombo = new Set(recommended.passiveCoverageFromThisCombo);
  const notCovered = targetPassives.filter((p) => !coveredByCombo.has(p));

  return (
    <div className="rounded-lg bg-emerald-500/10 px-3 py-3 ring-1 ring-emerald-500/30">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-200">
        <span>🎯 推薦路線</span>
        <span className="text-slate-300">
          {sameSpecies
            ? `同種配種 (${speciesA})`
            : `${speciesA} × ${speciesB}`}
        </span>
      </div>
      <ol className="space-y-1 text-xs text-slate-200">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>

      {targetPassives.length > 0 && (
        <div className="mt-3 border-t border-emerald-500/20 pt-2 text-[11px]">
          <div className="text-slate-400">目標詞條 vs 此組合可直接提供：</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {targetPassives.map((p) => {
              const covered = coveredByCombo.has(p);
              return (
                <span
                  key={p}
                  className="inline-flex items-center gap-1"
                  title={
                    covered
                      ? '此組合的素材已有此詞條'
                      : '此詞條須從別的素材跨種轉移過來'
                  }
                >
                  <span
                    className={`font-mono ${covered ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    {covered ? '✓' : '✗'}
                  </span>
                  <PassiveTag passive={getPassive(p)} fallbackId={p} />
                </span>
              );
            })}
          </div>
          {notCovered.length > 0 && (
            <p className="mt-2 text-amber-200">
              ⚠ 缺 {notCovered.length} 個詞條無法從此組合直接提供。每個缺詞條的取得方式見下方。
            </p>
          )}
          {notCovered.length > 0 && (
            <MissingPassivesTransferList
              missing={notCovered}
              ownedPals={ownedPals}
              comboParents={getRecommendedComboParents(recommended)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function getRecommendedComboParents(combo: AnalyzedCombo) {
  const out: import('../../types/pal').Pal[] = [];
  const seen = new Set<string>();
  for (const sp of [combo.slotA.species, combo.slotB.species]) {
    if (sp && !seen.has(sp.id)) {
      seen.add(sp.id);
      out.push(sp);
    }
  }
  return out;
}

function MissingPassivesTransferList({
  missing,
  ownedPals,
  comboParents,
}: {
  missing: string[];
  ownedPals: import('../../types/owned').OwnedPal[];
  comboParents: import('../../types/pal').Pal[];
}) {
  // 組合的親代物種若都無法由「其他物種」配出（特殊配種產物 / 同種死路），
  // 就沒辦法把詞條轉移進來——直接說明，不再列無效的轉移路線。
  const isDeadEnd =
    comboParents.length > 0 &&
    comboParents.every((p) => !canBreedFromOthers(p.id));
  const speciesLabel = comboParents.map((p) => p.name_zh).join('／');

  return (
    <div className="mt-2 space-y-2">
      {missing.map((passiveId) => {
        // 找出所有帶該詞條的素材
        const carriers = ownedPals
          .filter((p) => p.passives.includes(passiveId))
          .map((ownedPal) => ({
            ownedPal,
            pal: getPal(ownedPal.pal_id),
          }))
          .filter((x): x is { ownedPal: typeof x.ownedPal; pal: NonNullable<typeof x.pal> } => !!x.pal);

        return (
          <div
            key={passiveId}
            className="rounded-md bg-slate-900/40 p-2 ring-1 ring-slate-800"
          >
            <div className="mb-1 flex items-center gap-1.5">
              <span className="font-mono text-rose-400">✗</span>
              <PassiveTag passive={getPassive(passiveId)} fallbackId={passiveId} />
              {!isDeadEnd && carriers.length === 0 && (
                <span className="text-[11px] text-amber-300">
                  素材庫沒有任何個體帶此詞條
                </span>
              )}
            </div>
            {isDeadEnd ? (
              <p className="text-[11px] text-amber-300">
                {speciesLabel} 是特殊配種產物，無法由其他物種配出，因此此詞條無法透過配種轉移進來。
                只能直接抓 / 養出本身已帶此詞條的 {speciesLabel}，再用同種配種純化。
              </p>
            ) : (
              carriers.map(({ ownedPal, pal }) => (
                <PassiveTransferHelper
                  key={ownedPal.owned_id}
                  passive={getPassive(passiveId)}
                  passiveId={passiveId}
                  fromPal={pal}
                  fromNickname={ownedPal.nickname}
                  toPals={comboParents}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
