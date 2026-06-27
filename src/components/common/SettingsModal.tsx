import { useState } from 'react';
import {
  useSettingsStore,
  type VisionProvider,
} from '../../store/useSettingsStore';
import { Button } from './Button';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ANTHROPIC_MODELS = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 (最準,貴)' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (平衡)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (便宜快)' },
];

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (快,免費額度多)' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (準,額度較少)' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (備用)' },
];

const GROQ_MODELS = [
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    label: 'Llama 4 Scout (快,免費額度多)',
  },
  {
    id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    label: 'Llama 4 Maverick (較準)',
  },
];

const PROVIDER_LABELS: Record<VisionProvider, string> = {
  anthropic: 'Anthropic Claude',
  gemini: 'Google Gemini',
  groq: 'Groq',
};

export function SettingsModal({ open, onClose }: Props) {
  const {
    settings,
    setProvider,
    setAnthropicKey,
    setAnthropicModel,
    setGeminiKey,
    setGeminiModel,
    setGroqKey,
    setGroqModel,
  } = useSettingsStore();
  const [anthropicKeyInput, setAnthropicKeyInput] = useState(
    settings.anthropic_api_key
  );
  const [geminiKeyInput, setGeminiKeyInput] = useState(settings.gemini_api_key);
  const [groqKeyInput, setGroqKeyInput] = useState(settings.groq_api_key);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showGroq, setShowGroq] = useState(false);

  const handleSave = () => {
    setAnthropicKey(anthropicKeyInput);
    setGeminiKey(geminiKeyInput);
    setGroqKey(groqKeyInput);
    onClose();
  };

  const inputClass =
    'w-full rounded-md bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-accent';

  return (
    <Modal open={open} title="設定" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <section className="space-y-2">
          <span className="block text-xs font-medium text-slate-400">
            截圖辨識 Provider
          </span>
          <div className="flex gap-2">
            {(['gemini', 'groq', 'anthropic'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProvider(p)}
                className={`flex-1 rounded-md px-3 py-2 text-sm ring-1 ${
                  settings.provider === p
                    ? 'bg-accent/20 text-accent ring-accent/60'
                    : 'bg-slate-800 text-slate-300 ring-slate-700'
                }`}
              >
                {PROVIDER_LABELS[p]}
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Gemini 在 Google AI Studio 申請免費 key(看區域 / 帳號可能無免費額度,失敗會回退到付費)。
            Groq 在 Groq Console 申請,有免費額度且速度極快。
            Claude 在 Anthropic Console 申請,需付費但準確度高。
          </p>
        </section>

        <section className="space-y-2 rounded-lg bg-slate-800/40 p-3 ring-1 ring-slate-700/60">
          <h4 className="text-xs font-semibold text-slate-300">
            Google Gemini
          </h4>
          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-400">
              API Key
            </span>
            <div className="flex gap-2">
              <input
                type={showGemini ? 'text' : 'password'}
                className={inputClass}
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder="AIza..."
                autoComplete="off"
              />
              <button
                type="button"
                className="rounded-md bg-slate-700 px-2 text-xs text-slate-200 hover:bg-slate-600"
                onClick={() => setShowGemini((v) => !v)}
              >
                {showGemini ? '隱藏' : '顯示'}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              申請: https://aistudio.google.com/apikey
            </p>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-400">模型</span>
            <select
              className={inputClass}
              value={settings.gemini_model}
              onChange={(e) => setGeminiModel(e.target.value)}
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="space-y-2 rounded-lg bg-slate-800/40 p-3 ring-1 ring-slate-700/60">
          <h4 className="text-xs font-semibold text-slate-300">Groq</h4>
          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-400">
              API Key
            </span>
            <div className="flex gap-2">
              <input
                type={showGroq ? 'text' : 'password'}
                className={inputClass}
                value={groqKeyInput}
                onChange={(e) => setGroqKeyInput(e.target.value)}
                placeholder="gsk_..."
                autoComplete="off"
              />
              <button
                type="button"
                className="rounded-md bg-slate-700 px-2 text-xs text-slate-200 hover:bg-slate-600"
                onClick={() => setShowGroq((v) => !v)}
              >
                {showGroq ? '隱藏' : '顯示'}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              申請: https://console.groq.com/keys
            </p>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-400">模型</span>
            <select
              className={inputClass}
              value={settings.groq_model}
              onChange={(e) => setGroqModel(e.target.value)}
            >
              {GROQ_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="space-y-2 rounded-lg bg-slate-800/40 p-3 ring-1 ring-slate-700/60">
          <h4 className="text-xs font-semibold text-slate-300">
            Anthropic Claude
          </h4>
          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-400">
              API Key
            </span>
            <div className="flex gap-2">
              <input
                type={showAnthropic ? 'text' : 'password'}
                className={inputClass}
                value={anthropicKeyInput}
                onChange={(e) => setAnthropicKeyInput(e.target.value)}
                placeholder="sk-ant-..."
                autoComplete="off"
              />
              <button
                type="button"
                className="rounded-md bg-slate-700 px-2 text-xs text-slate-200 hover:bg-slate-600"
                onClick={() => setShowAnthropic((v) => !v)}
              >
                {showAnthropic ? '隱藏' : '顯示'}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              申請: https://console.anthropic.com/settings/keys
            </p>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-slate-400">模型</span>
            <select
              className={inputClass}
              value={settings.anthropic_model}
              onChange={(e) => setAnthropicModel(e.target.value)}
            >
              {ANTHROPIC_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <p className="text-[11px] text-slate-500">
          所有 key 只存在你的瀏覽器 localStorage,直接從前端呼叫
          Provider API。
        </p>

        <div className="flex justify-end gap-2 border-t border-slate-700/60 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="button" variant="primary" onClick={handleSave}>
            儲存
          </Button>
        </div>
      </div>
    </Modal>
  );
}
