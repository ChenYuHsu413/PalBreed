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
import { PalAvatar } from '../common/PalAvatar';
import { PassiveTag } from '../common/PassiveTag';

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

// 名稱 → 資料（解析 AI 回傳時用；對不到就丟，雙重防幻覺）
const PAL_BY_ZH = new Map(PALS.map((p) => [p.name_zh, p]));
const PASSIVE_BY_ZH = new Map(PASSIVES.map((p) => [p.name_zh, p]));

interface RecPal {
  name: string;
  passives?: string[];
  reason?: string;
  obtain?: string;
}
interface RecGroup {
  role: string;
  pals: RecPal[];
}
interface Advice {
  note?: string;
  groups: RecGroup[];
}

function buildPrompt(pals: OwnedPal[]): string {
  const owned = new Set(pals.map((p) => p.pal_id));
  const ownedNames = [...new Set(pals.map((p) => getPal(p.pal_id)?.name_zh ?? p.pal_id))];

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
    '== 強力候選清單（name 只能從這裡照抄）==',
    pool.join('\n'),
    '',
    '== 可用詞條（passives 只能從這些照抄）==',
    passiveNames.join('、'),
    '',
    '== 我已擁有 ==',
    ownedNames.length ? ownedNames.join('、') : '（目前沒有任何帕魯）',
    '',
    '請挑出我「還沒有（沒標 [已擁有]）」的，依角色分組，回傳 JSON。',
  ].join('\n');
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const s = fenced ? fenced[1] : text;
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  return a >= 0 && b > a ? s.slice(a, b + 1) : s;
}

export function AdvisorSection() {
  const pals = useOwnedPalsStore((s) => s.pals);
  const { settings } = useSettingsStore();
  const creds = activeProviderCreds(settings);

  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [rawFallback, setRawFallback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setAdvice(null);
    setRawFallback(null);
    try {
      const text = await getAdvice(buildPrompt(pals), creds);
      try {
        const parsed = JSON.parse(extractJson(text)) as Advice;
        setAdvice({ note: parsed.note, groups: parsed.groups ?? [] });
      } catch {
        setRawFallback(text); // JSON 壞掉時退回純文字
      }
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
        <Button variant="primary" onClick={run} disabled={loading || !creds.apiKey}>
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
        <div className="space-y-3">
          {advice.note && (
            <p className="rounded-md bg-slate-900/40 px-3 py-2 text-xs text-slate-300 ring-1 ring-slate-800">
              {advice.note}
            </p>
          )}
          {advice.groups.map((g, gi) => (
            <RoleGroup key={gi} group={g} />
          ))}
        </div>
      )}

      {rawFallback && (
        <div className="whitespace-pre-wrap rounded-lg bg-slate-900/50 px-4 py-3 text-sm leading-relaxed text-slate-200 ring-1 ring-slate-800">
          {rawFallback}
        </div>
      )}

      {(advice || rawFallback) && (
        <p className="text-right text-[11px] text-slate-500">
          由 {creds.label} · {creds.model} 生成 · 僅供參考
        </p>
      )}
    </section>
  );
}

function RoleGroup({ group }: { group: RecGroup }) {
  // 對得到資料的帕魯才顯示（防 AI 漏網的幻覺名稱）
  const valid = (group.pals ?? [])
    .map((rp) => ({ rp, pal: PAL_BY_ZH.get(rp.name) }))
    .filter((x): x is { rp: RecPal; pal: NonNullable<typeof x.pal> } => !!x.pal);
  if (valid.length === 0) return null;

  return (
    <div>
      <h3 className="mb-1.5 text-sm font-semibold text-accent">{group.role}</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {valid.map(({ rp, pal }) => (
          <div
            key={pal.id}
            className="rounded-lg bg-slate-900/40 p-2.5 ring-1 ring-slate-800"
          >
            <div className="mb-1 flex items-center gap-2">
              <PalAvatar palId={pal.id} size={32} />
              <span className="text-sm font-medium text-slate-100">
                {pal.name_zh}
              </span>
            </div>
            {rp.passives && rp.passives.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1">
                {rp.passives.map((name) => (
                  <PassiveTag
                    key={name}
                    passive={PASSIVE_BY_ZH.get(name)}
                    fallbackId={name}
                  />
                ))}
              </div>
            )}
            {rp.reason && (
              <p className="text-[11px] text-slate-300">{rp.reason}</p>
            )}
            {rp.obtain && (
              <p className="text-[11px] text-slate-500">取得：{rp.obtain}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
