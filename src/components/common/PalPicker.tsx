import { useEffect, useMemo, useRef, useState } from 'react';
import { PALS, getPal } from '../../data';
import type { Pal } from '../../types/pal';
import { PalAvatar } from './PalAvatar';

interface Props {
  value: string;
  onChange: (palId: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  required?: boolean;
}

/**
 * 可搜尋的帕魯選擇器：支援中文名、英文名、paldex 編號（如 "100"、"107A"）搜尋。
 */
export function PalPicker({
  value,
  onChange,
  placeholder = '搜尋帕魯（中／英／編號）',
  allowClear = false,
  required = false,
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedPal = value ? getPal(value) : undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qZh = query.trim();
    if (!q) return PALS.slice(0, 30);
    return PALS.filter((p) => {
      if (p.name_en.toLowerCase().includes(q)) return true;
      if (p.name_zh && p.name_zh.includes(qZh)) return true;
      if (p.id.includes(q)) return true;
      if (p.paldex && p.paldex.toLowerCase().includes(q)) return true;
      if (p.paldb_id.toLowerCase().includes(q)) return true;
      return false;
    }).slice(0, 50);
  }, [query]);

  useEffect(() => {
    if (activeIdx >= filtered.length) setActiveIdx(0);
  }, [filtered.length, activeIdx]);

  // 點外面關閉
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // 鍵盤導覽
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setActiveIdx((i) => Math.max(0, i - 1));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      const pick = filtered[activeIdx];
      if (pick) selectPal(pick);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setOpen(false);
      e.preventDefault();
    }
  };

  // 滾到 active item
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const selectPal = (p: Pal) => {
    onChange(p.id);
    setQuery('');
    setOpen(false);
  };

  const clear = () => {
    onChange('');
    setQuery('');
  };

  const baseInputClass =
    'w-full rounded-md bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-accent';

  return (
    <div className="relative" ref={rootRef}>
      {/* 顯示已選 + 搜尋輸入 */}
      <div className="relative">
        <input
          type="text"
          value={
            open
              ? query
              : selectedPal
                ? formatLabel(selectedPal)
                : query
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIdx(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className={baseInputClass + ' pr-16'}
          required={required && !value}
        />
        {selectedPal && allowClear && !open && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-xs text-slate-500 hover:bg-slate-700/60 hover:text-slate-200"
            aria-label="clear"
          >
            清除
          </button>
        )}
        {!selectedPal && !open && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
            ▼
          </span>
        )}
      </div>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md bg-slate-800 py-1 ring-1 ring-slate-600 shadow-xl"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500">無符合帕魯</li>
          ) : (
            filtered.map((p, i) => (
              <li
                key={p.id}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectPal(p);
                }}
                className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
                  i === activeIdx
                    ? 'bg-accent/15 text-slate-50'
                    : 'text-slate-200 hover:bg-slate-700/40'
                }`}
              >
                <PalAvatar palId={p.id} size={24} />
                <span className="w-10 shrink-0 font-mono text-xs text-slate-500">
                  #{p.paldex ?? '?'}
                </span>
                <span className="font-medium">{p.name_zh || p.name_en}</span>
                <span className="text-xs text-slate-500">{p.name_en}</span>
                {p.elements.length > 0 && (
                  <span className="ml-auto text-[10px] text-slate-500">
                    {p.elements.join(' / ')}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function formatLabel(p: Pal): string {
  const num = p.paldex ? `#${p.paldex} ` : '';
  const zh = p.name_zh || p.name_en;
  const en = p.name_zh ? `（${p.name_en}）` : '';
  return `${num}${zh}${en}`;
}
