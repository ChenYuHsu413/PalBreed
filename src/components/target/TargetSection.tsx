import { useTargetStore } from '../../store/useTargetStore';
import { BUILDS, getPassive } from '../../data';
import { PassiveTag } from '../common/PassiveTag';
import { PalPicker } from '../common/PalPicker';
import { Button } from '../common/Button';
import { PassivePicker } from '../material/PassivePicker';

export function TargetSection() {
  const {
    targetPalId,
    parentPalId,
    buildId,
    targetPassives,
    setTargetPal,
    setParentPal,
    setBuild,
    setTargetPassives,
    reset,
  } = useTargetStore();

  const selectClass =
    'w-full rounded-md bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-accent';

  const currentBuild = BUILDS.find((b) => b.id === buildId);

  return (
    <section className="space-y-4 rounded-2xl bg-bg-panel p-5 shadow-lg ring-1 ring-white/5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">② 目標規劃</h2>
          <p className="text-xs text-slate-400">
            選擇目標帕魯與用途模板，系統會自動帶入推薦詞條。
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          重置
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">
            目標帕魯
          </span>
          <PalPicker
            value={targetPalId ?? ''}
            onChange={(id) => setTargetPal(id || null)}
            placeholder="搜尋目標帕魯（中／英／編號）"
            allowClear
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">
            用途模板
          </span>
          <select
            className={selectClass}
            value={buildId ?? ''}
            onChange={(e) => setBuild(e.target.value || null)}
          >
            <option value="">— 自訂 —</option>
            {BUILDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label_zh}
              </option>
            ))}
          </select>
        </label>
      </div>

      {currentBuild?.description_zh && (
        <p className="rounded-md bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
          {currentBuild.description_zh}
        </p>
      )}

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-400">
          指定親代（選填）
        </span>
        <PalPicker
          value={parentPalId ?? ''}
          onChange={(id) => setParentPal(id || null)}
          placeholder="選一個你想當起點的親代物種"
          allowClear
        />
        <span className="mt-1 block text-[11px] text-slate-500">
          指定後，下方「配種策略」會額外列出「該親代 → 目標」3 代內的最短配種樹。
        </span>
      </label>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-medium text-slate-400">目標詞條</span>
          {currentBuild?.alternatives && currentBuild.alternatives.length > 0 && (
            <span className="text-[11px] text-slate-500">
              備選：
              {currentBuild.alternatives
                .map((id) => getPassive(id)?.name_zh ?? id)
                .join('、')}
            </span>
          )}
        </div>
        <PassivePicker
          value={targetPassives}
          onChange={setTargetPassives}
          max={4}
        />
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-slate-700/40 pt-3">
        {targetPassives.length === 0 ? (
          <span className="text-xs text-slate-500">尚未設定目標詞條</span>
        ) : (
          targetPassives.map((id) => (
            <PassiveTag key={id} passive={getPassive(id)} fallbackId={id} />
          ))
        )}
      </div>
    </section>
  );
}
