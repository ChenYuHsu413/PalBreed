import { useEffect, useState } from 'react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useOwnedPalsStore } from '../../store/useOwnedPalsStore';
import { parseVisionJson } from '../../services/visionImport';
import {
  ImportDraftCard,
  draftsToImport,
  type DraftRow,
} from './ImportDraftCard';

interface Props {
  open: boolean;
  onClose: () => void;
}

const EXAMPLE = `{
  "pals": [
    {
      "pal_id": "lamball",
      "gender": "male",
      "passives": ["legend", "ferocious"],
      "raw_name": "(可選)截圖看到的暱稱或原文"
    },
    {
      "pal_id": "anubis",
      "gender": "female",
      "passives": ["legend", "ferocious", "musclehead", "lucky"]
    }
  ]
}`;

export function JsonImportModal({ open, onClose }: Props) {
  const { add } = useOwnedPalsStore();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftRow[] | null>(null);

  useEffect(() => {
    if (!open) {
      setText('');
      setError(null);
      setDrafts(null);
    }
  }, [open]);

  const handleParse = () => {
    if (!text.trim()) {
      setError('請先貼上 JSON');
      return;
    }
    setError(null);
    try {
      const parsed = parseVisionJson(text);
      if (parsed.length === 0) {
        setError('JSON 解析成功但沒有任何 pals 項目');
        return;
      }
      setDrafts(parsed.map((p) => ({ ...p, selected: !!p.pal_id })));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  };

  const handlePasteFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const content = await f.text();
    setText(content);
    e.target.value = '';
  };

  const updateDraft = (idx: number, patch: Partial<DraftRow>) => {
    setDrafts((prev) =>
      prev ? prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)) : prev
    );
  };

  const handleImport = () => {
    if (!drafts) return;
    const inputs = draftsToImport(drafts, 'JSON 匯入');
    for (const input of inputs) add(input);
    alert(`成功匯入 ${inputs.length} 隻帕魯`);
    onClose();
  };

  const insertExample = () => setText(EXAMPLE);

  return (
    <Modal
      open={open}
      title="📋 JSON 匯入帕魯"
      onClose={onClose}
      widthClass="max-w-4xl"
    >
      <div className="space-y-4 text-sm">
        {!drafts && (
          <>
            <div className="space-y-2 rounded-md bg-slate-800/40 p-3 text-xs text-slate-300 ring-1 ring-slate-700/60">
              <p>
                <strong>格式:</strong>{' '}
                <code className="rounded bg-slate-700/60 px-1">
                  {`{ "pals": [{ pal_id, gender, passives, raw_name? }] }`}
                </code>{' '}
                或直接是陣列{' '}
                <code className="rounded bg-slate-700/60 px-1">[{`{...}`}]</code>
              </p>
              <ul className="ml-4 list-disc space-y-0.5 text-slate-400">
                <li>
                  <code>pal_id</code> 跟{' '}
                  <code>passives</code> 必須用內部 id(如{' '}
                  <code>lamball</code> / <code>legend</code>),不認識的會被清空並提示
                </li>
                <li>
                  <code>gender</code>: <code>male</code> / <code>female</code> /{' '}
                  <code>unknown</code>
                </li>
                <li>每隻最多 4 個被動詞條</li>
                <li>
                  也吃 vision 模型輸出的格式(含 <code>raw_name</code> /{' '}
                  <code>warnings</code> 等欄位)
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-400">
                JSON 內容
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={insertExample}
                  className="text-[11px] text-accent hover:underline"
                >
                  插入範例
                </button>
                <label className="cursor-pointer text-[11px] text-accent hover:underline">
                  上傳 .json 檔
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handlePasteFile}
                  />
                </label>
              </div>
            </div>

            <textarea
              className="min-h-[280px] w-full rounded-md bg-slate-900 px-2.5 py-2 font-mono text-xs text-slate-100 ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-accent"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='貼上 JSON,例如: { "pals": [{ "pal_id": "lamball", "gender": "male", "passives": ["legend"] }] }'
              spellCheck={false}
            />

            {error && (
              <p className="rounded-md bg-red-900/40 px-3 py-2 text-xs text-red-200 ring-1 ring-red-700/60">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-700/60 pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                取消
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleParse}
                disabled={!text.trim()}
              >
                解析 JSON
              </Button>
            </div>
          </>
        )}

        {drafts && (
          <>
            <div className="rounded-md bg-slate-800/40 px-3 py-2 text-xs text-slate-300 ring-1 ring-slate-700/60">
              解析到 <strong>{drafts.length}</strong>{' '}
              隻帕魯,請勾選並確認後匯入。可手動微調名稱/性別/詞條。
            </div>

            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {drafts.map((d, idx) => (
                <ImportDraftCard
                  key={idx}
                  draft={d}
                  onChange={(patch) => updateDraft(idx, patch)}
                />
              ))}
            </div>

            <div className="flex justify-between gap-2 border-t border-slate-700/60 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDrafts(null)}
              >
                ← 改 JSON
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  取消
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleImport}
                  disabled={drafts.every((d) => !d.selected || !d.pal_id)}
                >
                  匯入勾選的{' '}
                  {drafts.filter((d) => d.selected && d.pal_id).length} 隻
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
