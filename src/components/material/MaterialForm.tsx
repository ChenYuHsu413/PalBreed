import { useEffect, useState } from 'react';
import type { OwnedPal, OwnedPalInput } from '../../types/owned';
import { Button } from '../common/Button';
import { PalPicker } from '../common/PalPicker';
import { PassivePicker } from './PassivePicker';

interface Props {
  initial?: OwnedPal;
  onSubmit: (input: OwnedPalInput) => void;
  onCancel: () => void;
}

const EMPTY: OwnedPalInput = {
  pal_id: '',
  nickname: '',
  gender: 'unknown',
  passives: [],
  tags: [],
  is_material: true,
  is_finished: false,
  note: '',
};

export function MaterialForm({ initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<OwnedPalInput>(EMPTY);
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (initial) {
      const { owned_id: _o, created_at: _c, updated_at: _u, ...rest } = initial;
      setForm(rest);
      setTagsInput(initial.tags.join(', '));
    } else {
      setForm(EMPTY);
      setTagsInput('');
    }
  }, [initial]);

  const update = <K extends keyof OwnedPalInput>(
    key: K,
    value: OwnedPalInput[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({ ...form, tags });
  };

  const inputClass =
    'w-full rounded-md bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-accent';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <Field label="帕魯">
          <PalPicker
            value={form.pal_id}
            onChange={(id) => update('pal_id', id)}
            required
          />
        </Field>

        <Field label="性別">
          <div className="flex gap-2">
            {(['male', 'female', 'unknown'] as const).map((g) => (
              <label
                key={g}
                className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-center text-xs ring-1 ${
                  form.gender === g
                    ? 'bg-accent/20 text-accent ring-accent/60'
                    : 'bg-slate-800 text-slate-300 ring-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  className="sr-only"
                  checked={form.gender === g}
                  onChange={() => update('gender', g)}
                />
                {g === 'male' ? '♂ 公' : g === 'female' ? '♀ 母' : '— 未指定'}
              </label>
            ))}
          </div>
        </Field>
      </div>

      <Field label="暱稱（可選）">
        <input
          className={inputClass}
          value={form.nickname ?? ''}
          onChange={(e) => update('nickname', e.target.value)}
          placeholder="例：空渦龍 Legend 素材"
        />
      </Field>

      <Field label="被動詞條（最多 4 個）">
        <PassivePicker
          value={form.passives}
          onChange={(v) => update('passives', v)}
        />
      </Field>

      <Field label="標籤（用逗號分隔）">
        <input
          className={inputClass}
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="例：素材, 戰鬥"
        />
      </Field>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.is_material}
            onChange={(e) => update('is_material', e.target.checked)}
            className="h-4 w-4 accent-sky-400"
          />
          可作為素材
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.is_finished}
            onChange={(e) => update('is_finished', e.target.checked)}
            className="h-4 w-4 accent-emerald-400"
          />
          已是成品（不建議拿來配種）
        </label>
      </div>

      <Field label="備註">
        <textarea
          className={inputClass + ' min-h-[64px]'}
          value={form.note ?? ''}
          onChange={(e) => update('note', e.target.value)}
          placeholder="例：乾淨單詞條素材"
        />
      </Field>

      <div className="flex justify-end gap-2 border-t border-slate-700/60 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" variant="primary">
          {initial ? '儲存變更' : '新增素材'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
