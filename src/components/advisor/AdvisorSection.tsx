import { useState } from 'react';
import { useOwnedPalsStore } from '../../store/useOwnedPalsStore';
import { useTargetStore } from '../../store/useTargetStore';
import {
  useSettingsStore,
  activeProviderCreds,
} from '../../store/useSettingsStore';
import { getPal, getPassive } from '../../data';
import type { OwnedPal } from '../../types/owned';
import { getAdvice } from '../../services/advisor';
import { Button } from '../common/Button';

const GENDER_ZH = { male: '公', female: '母', unknown: '未知' } as const;
const MAX_PALS = 300;

function buildPrompt(
  pals: OwnedPal[],
  targetPalId: string | null,
  targetPassives: string[]
): string {
  const targetName = targetPalId
    ? getPal(targetPalId)?.name_zh ?? targetPalId
    : '未設定';
  const targetPassiveNames =
    targetPassives.length > 0
      ? targetPassives.map((id) => getPassive(id)?.name_zh ?? id).join('、')
      : '未設定';

  const lines = pals.slice(0, MAX_PALS).map((p, i) => {
    const name = getPal(p.pal_id)?.name_zh ?? p.pal_id;
    const passives =
      p.passives.map((id) => getPassive(id)?.name_zh ?? id).join('、') || '無詞條';
    const flags = [p.is_finished ? '成品' : '', ...p.tags].filter(Boolean);
    return `${i + 1}. ${name}(${GENDER_ZH[p.gender]})：${passives}${
      flags.length ? ` [${flags.join('/')}]` : ''
    }`;
  });

  const more = pals.length > MAX_PALS ? `\n（其餘 ${pals.length - MAX_PALS} 隻略過）` : '';

  return [
    '== 培育目標 ==',
    `目標物種：${targetName}`,
    `目標詞條：${targetPassiveNames}`,
    '',
    `== 我的素材庫（共 ${pals.length} 隻）==`,
    lines.join('\n') + more,
    '',
    '請依上述素材與目標給我建議。',
  ].join('\n');
}

export function AdvisorSection() {
  const pals = useOwnedPalsStore((s) => s.pals);
  const { targetPalId, targetPassives } = useTargetStore();
  const { settings } = useSettingsStore();
  const creds = activeProviderCreds(settings);

  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = buildPrompt(pals, targetPalId, targetPassives);
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
          <h2 className="text-lg font-semibold text-slate-100">⑤ AI 配種建議</h2>
          <p className="text-xs text-slate-400">
            讀取你的素材庫與目標，請 AI 給缺口分析、清理建議與下一步配種。
          </p>
        </div>
        <Button
          variant="primary"
          onClick={run}
          disabled={loading || pals.length === 0 || !creds.apiKey}
        >
          {loading ? `思考中…（${creds.label}）` : '✨ 產生建議'}
        </Button>
      </header>

      {pals.length === 0 && (
        <p className="rounded-md bg-slate-900/40 px-3 py-2 text-xs text-slate-400 ring-1 ring-slate-800">
          素材庫是空的，先到「素材庫」分頁建立素材後再來。
        </p>
      )}

      {pals.length > 0 && !creds.apiKey && (
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
