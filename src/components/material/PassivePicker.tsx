import { useMemo, useState } from 'react';
import { PASSIVES, getPassive } from '../../data';
import { PassiveTag } from '../common/PassiveTag';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}

export function PassivePicker({ value, onChange, max = 4 }: Props) {
  const [query, setQuery] = useState('');

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PASSIVES.filter(
      (p) =>
        !value.includes(p.id) &&
        (q === '' ||
          p.name_en.toLowerCase().includes(q) ||
          p.name_zh.includes(query.trim()) ||
          p.id.includes(q))
    ).slice(0, 16);
  }, [query, value]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      if (value.length >= max) return;
      onChange([...value, id]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {value.length === 0 && (
          <span className="text-xs text-slate-500">尚未選擇任何詞條</span>
        )}
        {value.map((id) => (
          <PassiveTag
            key={id}
            passive={getPassive(id)}
            fallbackId={id}
            onRemove={() => toggle(id)}
          />
        ))}
        <span className="ml-auto text-xs text-slate-500">
          {value.length} / {max}
        </span>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋詞條（中／英／id）"
        className="w-full rounded-md bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-accent"
      />

      <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-md bg-slate-900/40 p-2 ring-1 ring-slate-800">
        {options.length === 0 ? (
          <span className="text-xs text-slate-500">無符合詞條</span>
        ) : (
          options.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              disabled={value.length >= max}
              className="disabled:cursor-not-allowed"
              title={p.description_zh ?? ''}
            >
              <PassiveTag
                passive={p}
                disabled={value.length >= max}
              />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
