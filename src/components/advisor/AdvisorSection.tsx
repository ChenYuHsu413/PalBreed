import { useState } from 'react';
import { useOwnedPalsStore } from '../../store/useOwnedPalsStore';
import {
  useSettingsStore,
  activeProviderCreds,
} from '../../store/useSettingsStore';
import { PALS, PASSIVES, getPal } from '../../data';
import type { OwnedPal } from '../../types/owned';
import type { PalRole } from '../../types/pal';
import { getAdvice } from '../../services/advisor';
import { Button } from '../common/Button';

const ROLE_ZH: Record<PalRole, string> = {
  combat: '戰鬥',
  mount: '坐騎',
  mount_speed: '坐騎(速度)',
  base_worker: '據點工作',
  mining: '採礦',
  handiwork: '製作',
  lumbering: '伐木',
  transporting: '搬運',
  support: '輔助',
};

function buildPrompt(pals: OwnedPal[]): string {
  const owned = new Set(pals.map((p) => p.pal_id));
  const ownedNames = [...new Set(pals.map((p) => getPal(p.pal_id)?.name_zh ?? p.pal_id))];

  // 候選白名單 = 有策劃過角色的強力帕魯；標記是否已擁有
  const pool = PALS.filter((p) => p.recommended_roles && p.recommended_roles.length > 0).map(
    (p) => {
      const roles = p.recommended_roles.map((r) => ROLE_ZH[r] ?? r).join('、');
      const mark = owned.has(p.id) ? '[已擁有] ' : '';
      const note = p.note ? `｜${p.note}` : '';
      return `- ${mark}${p.name_zh}｜角色:${roles}${note}`;
    }
  );

  const passiveNames = PASSIVES.filter((p) => !p.is_negative).map((p) => p.name_zh);

  return [
    '== 強力候選清單（只能從這裡推薦，名稱照抄）==',
    pool.join('\n'),
    '',
    '== 可用詞條（建議詞條只能從這些挑）==',
    passiveNames.join('、'),
    '',
    `== 我已擁有 ==`,
    ownedNames.length ? ownedNames.join('、') : '（目前沒有任何帕魯）',
    '',
    '請從「強力候選清單」中，挑出我「還沒有（沒標 [已擁有]）」的，依角色分組推薦。',
  ].join('\n');
}

export function AdvisorSection() {
  const pals = useOwnedPalsStore((s) => s.pals);
  const { settings } = useSettingsStore();
  const creds = activeProviderCreds(settings);

  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = buildPrompt(pals);
      const text = await getAdvice(prompt, creds);
      setAdvice(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl bg-bg-panel p-5 shadow-lg ring-1 ring-white/5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">⑤ AI 強力推薦</h2>
          <p className="text-xs text-slate-400">
            比對你的收藏，推薦你「還沒有」的社群公認強力帕魯與完美詞條組合。
          </p>
        </div>
        <Button
          variant="primary"
          onClick={run}
          disabled={loading || !creds.apiKey}
        >
          {loading ? `思考中…（${creds.label}）` : '✨ 產生推薦'}
        </Button>
      </header>

      {!creds.apiKey && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/30">
          尚未設定 {creds.label} API Key，請到右上「⚙ 設定」填入（與截圖辨識共用）。
        </p>
      )}

      {error && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
          {error}
        </p>
      )}

      {advice && (
        <div className="whitespace-pre-wrap rounded-lg bg-slate-900/50 px-4 py-3 text-sm leading-relaxed text-slate-200 ring-1 ring-slate-800">
          {advice}
        </div>
      )}

      {advice && (
        <p className="text-right text-[11px] text-slate-500">
          由 {creds.label} · {creds.model} 生成 · 僅供參考
        </p>
      )}
    </section>
  );
}
