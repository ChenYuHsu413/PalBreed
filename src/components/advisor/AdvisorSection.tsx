import { useState } from 'react';
import { useOwnedPalsStore } from '../../store/useOwnedPalsStore';
import {
  useSettingsStore,
  activeProviderCreds,
} from '../../store/useSettingsStore';
import { getPal } from '../../data';
import type { OwnedPal } from '../../types/owned';
import { getAdvice } from '../../services/advisor';
import { Button } from '../common/Button';

function buildPrompt(pals: OwnedPal[]): string {
  // 去重的已擁有物種清單（推薦缺口只需知道「有哪些物種」）
  const species = [...new Set(pals.map((p) => getPal(p.pal_id)?.name_zh ?? p.pal_id))];

  return [
    `== 我已擁有的帕魯物種（${species.length} 種）==`,
    species.length ? species.join('、') : '（目前沒有任何帕魯）',
    '',
    '請推薦我「還沒有」的社群公認強力帕魯與其完美詞條組合，分戰鬥／坐騎／據點工作三類。',
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
