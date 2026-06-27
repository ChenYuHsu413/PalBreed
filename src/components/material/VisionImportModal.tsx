import { useEffect, useRef, useState } from 'react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import {
  useSettingsStore,
  activeProviderCreds,
} from '../../store/useSettingsStore';
import { useOwnedPalsStore } from '../../store/useOwnedPalsStore';
import { importPalsFromImages } from '../../services/visionImport';
import {
  ImportDraftCard,
  draftsToImport,
  palKey,
  type DraftRow,
} from './ImportDraftCard';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function VisionImportModal({ open, onClose }: Props) {
  const { settings } = useSettingsStore();
  const { add, pals } = useOwnedPalsStore();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftRow[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setPreviews([]);
      setDrafts(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imgs: File[] = [];
      for (const it of items) {
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const f = it.getAsFile();
          if (f) imgs.push(f);
        }
      }
      if (imgs.length > 0) {
        e.preventDefault();
        setFiles((prev) => [...prev, ...imgs]);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const imgs = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (imgs.length) setFiles((prev) => [...prev, ...imgs]);
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const {
    apiKey: activeKey,
    model: activeModel,
    label: providerLabel,
  } = activeProviderCreds(settings);

  // 庫中既有個體的指紋，用來標記「庫中已有」並預設不勾，避免重複匯入
  const existingKeys = new Set(
    pals.map((p) => palKey(p.pal_id, p.gender, p.passives))
  );

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setError('請先上傳/拖入/貼上至少一張截圖');
      return;
    }
    if (!activeKey) {
      setError(`尚未設定 ${providerLabel} API Key,請先到右上「⚙ 設定」填入`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await importPalsFromImages(files, {
        provider: settings.provider,
        apiKey: activeKey,
        model: activeModel,
      });
      if (res.parsed.length === 0) {
        setError('沒有辨識到任何帕魯,請確認截圖是否清晰');
      }
      setDrafts(
        res.parsed.map((p) => {
          const dup =
            !!p.pal_id && existingKeys.has(palKey(p.pal_id, p.gender, p.passives));
          return { ...p, selected: !!p.pal_id && !dup };
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (idx: number, patch: Partial<DraftRow>) => {
    setDrafts((prev) =>
      prev ? prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)) : prev
    );
  };

  const setAllSelected = (v: boolean) => {
    setDrafts((prev) =>
      prev ? prev.map((d) => ({ ...d, selected: v && !!d.pal_id })) : prev
    );
  };

  const handleImport = () => {
    if (!drafts) return;
    const inputs = draftsToImport(drafts, '截圖匯入');
    for (const input of inputs) add(input);
    alert(`成功匯入 ${inputs.length} 隻帕魯`);
    onClose();
  };

  const dupCount = drafts
    ? drafts.filter(
        (d) =>
          !!d.pal_id && existingKeys.has(palKey(d.pal_id, d.gender, d.passives))
      ).length
    : 0;
  const selectedCount = drafts
    ? drafts.filter((d) => d.selected && d.pal_id).length
    : 0;

  return (
    <Modal
      open={open}
      title="📷 截圖匯入帕魯"
      onClose={onClose}
      widthClass="max-w-4xl"
    >
      <div className="space-y-4 text-sm">
        {!drafts && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/40 p-6 text-center"
            >
              <p className="text-slate-300">
                把截圖拖到這、按{' '}
                <kbd className="rounded bg-slate-700 px-1.5 py-0.5 text-xs">
                  Ctrl+V
                </kbd>{' '}
                直接貼上,或
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                選擇檔案
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
              <p className="mt-2 text-[11px] text-slate-500">
                建議:從帕魯倉庫拍含名字 + 性別圖示 + 詞條的整頁截圖,一次可傳多張
              </p>
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {previews.map((url, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded-md ring-1 ring-slate-700"
                  >
                    <img
                      src={url}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

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
                onClick={handleAnalyze}
                disabled={loading || files.length === 0}
              >
                {loading
                  ? `辨識中... (${providerLabel} / ${activeModel})`
                  : `🔍 用 ${providerLabel} 辨識 (${files.length} 張)`}
              </Button>
            </div>
          </>
        )}

        {drafts && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-800/40 px-3 py-2 text-xs text-slate-300 ring-1 ring-slate-700/60">
              <span>
                辨識到 <strong>{drafts.length}</strong> 隻 · 已勾選{' '}
                <strong className="text-accent">{selectedCount}</strong>
                {dupCount > 0 && (
                  <span className="text-amber-300">
                    {' '}
                    · {dupCount} 隻庫中已有（預設不勾）
                  </span>
                )}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAllSelected(true)}
                  className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600"
                >
                  全選
                </button>
                <button
                  type="button"
                  onClick={() => setAllSelected(false)}
                  className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600"
                >
                  全不選
                </button>
              </span>
            </div>

            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {drafts.map((d, idx) => (
                <ImportDraftCard
                  key={idx}
                  draft={d}
                  onChange={(patch) => updateDraft(idx, patch)}
                  isDuplicate={
                    !!d.pal_id &&
                    existingKeys.has(palKey(d.pal_id, d.gender, d.passives))
                  }
                />
              ))}
            </div>

            <div className="flex justify-between gap-2 border-t border-slate-700/60 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDrafts(null)}
              >
                ← 重新上傳
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
