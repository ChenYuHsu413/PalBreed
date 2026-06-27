import type { VisionParsedPal } from '../../services/visionImport';
import type { Gender } from '../../types/owned';
import { PalPicker } from '../common/PalPicker';
import { PassivePicker } from './PassivePicker';

export interface DraftRow extends VisionParsedPal {
  selected: boolean;
}

/** 用於判斷「庫中是否已有相同個體」：物種＋性別＋詞條集合。 */
export function palKey(pal_id: string, gender: Gender, passives: string[]): string {
  return [pal_id, gender, [...passives].sort().join(',')].join('|');
}

interface Props {
  draft: DraftRow;
  onChange: (patch: Partial<DraftRow>) => void;
  isDuplicate?: boolean;
}

export function ImportDraftCard({ draft, onChange, isDuplicate }: Props) {
  return (
    <div
      className={`rounded-lg p-3 ring-1 ${
        draft.selected
          ? 'bg-slate-800/60 ring-accent/40'
          : 'bg-slate-800/20 ring-slate-700/60'
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={draft.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
          className="h-4 w-4 accent-sky-400"
        />
        {isDuplicate && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300 ring-1 ring-amber-500/30">
            庫中已有
          </span>
        )}
        <span className="flex-1 text-xs text-slate-400">
          原文: {draft.raw_name || '(無)'}
          {draft.raw_passives && draft.raw_passives.length > 0 && (
            <> · 詞條原文: {draft.raw_passives.join(' / ')}</>
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-400">帕魯</span>
          <PalPicker
            value={draft.pal_id}
            onChange={(id) => onChange({ pal_id: id })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-slate-400">性別</span>
          <div className="flex gap-1">
            {(['male', 'female', 'unknown'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onChange({ gender: g as Gender })}
                className={`flex-1 rounded-md px-2 py-1 text-xs ring-1 ${
                  draft.gender === g
                    ? 'bg-accent/20 text-accent ring-accent/60'
                    : 'bg-slate-800 text-slate-300 ring-slate-700'
                }`}
              >
                {g === 'male' ? '♂ 公' : g === 'female' ? '♀ 母' : '—'}
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className="mt-2">
        <span className="mb-1 block text-[11px] text-slate-400">被動詞條</span>
        <PassivePicker
          value={draft.passives}
          onChange={(v) => onChange({ passives: v })}
        />
      </div>

      {draft.warnings && draft.warnings.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[11px] text-amber-300">
          {draft.warnings.map((w, i) => (
            <li key={i}>⚠ {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function draftsToImport(
  drafts: DraftRow[],
  source: string
): Array<{
  pal_id: string;
  nickname: string;
  gender: Gender;
  passives: string[];
  tags: string[];
  is_material: true;
  is_finished: false;
  note: string;
}> {
  return drafts
    .filter((d) => d.selected && d.pal_id)
    .map((d) => ({
      pal_id: d.pal_id,
      nickname: '',
      gender: d.gender,
      passives: d.passives,
      tags: [source],
      is_material: true as const,
      is_finished: false as const,
      note: d.raw_name ? `匯入原名: ${d.raw_name}` : '',
    }));
}
