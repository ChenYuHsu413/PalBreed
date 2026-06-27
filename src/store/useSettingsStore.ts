import { create } from 'zustand';
import { storage } from '../services/storage';

const KEY = 'settings';

export type VisionProvider = 'anthropic' | 'gemini' | 'groq';

export const PROVIDER_LABEL: Record<VisionProvider, string> = {
  gemini: 'Gemini',
  groq: 'Groq',
  anthropic: 'Anthropic Claude',
};

export interface ActiveCreds {
  provider: VisionProvider;
  apiKey: string;
  model: string;
  label: string;
}

/** 依目前選定的 provider 取出對應的 key / model / 顯示名（截圖辨識與 AI 建議共用）。 */
export function activeProviderCreds(s: Settings): ActiveCreds {
  if (s.provider === 'gemini') {
    return { provider: 'gemini', apiKey: s.gemini_api_key, model: s.gemini_model, label: PROVIDER_LABEL.gemini };
  }
  if (s.provider === 'groq') {
    return { provider: 'groq', apiKey: s.groq_api_key, model: s.groq_model, label: PROVIDER_LABEL.groq };
  }
  return { provider: 'anthropic', apiKey: s.anthropic_api_key, model: s.anthropic_model, label: PROVIDER_LABEL.anthropic };
}

export interface Settings {
  provider: VisionProvider;
  anthropic_api_key: string;
  anthropic_model: string;
  gemini_api_key: string;
  gemini_model: string;
  groq_api_key: string;
  groq_model: string;
}

const DEFAULT: Settings = {
  provider: 'gemini',
  anthropic_api_key: '',
  anthropic_model: 'claude-opus-4-8',
  gemini_api_key: '',
  gemini_model: 'gemini-2.5-flash',
  groq_api_key: '',
  groq_model: 'meta-llama/llama-4-scout-17b-16e-instruct',
};

interface SettingsState {
  settings: Settings;
  setProvider: (p: VisionProvider) => void;
  setAnthropicKey: (key: string) => void;
  setAnthropicModel: (model: string) => void;
  setGeminiKey: (key: string) => void;
  setGeminiModel: (model: string) => void;
  setGroqKey: (key: string) => void;
  setGroqModel: (model: string) => void;
}

function persist(next: Settings) {
  storage.set(KEY, next);
  return { settings: next };
}

export const useSettingsStore = create<SettingsState>((set) => ({
  // 舊版資料用 spread 補上預設,避免 missing field
  settings: { ...DEFAULT, ...storage.get<Partial<Settings>>(KEY, {}) },

  setProvider: (p) =>
    set((s) => persist({ ...s.settings, provider: p })),

  setAnthropicKey: (key) =>
    set((s) => persist({ ...s.settings, anthropic_api_key: key.trim() })),

  setAnthropicModel: (model) =>
    set((s) => persist({ ...s.settings, anthropic_model: model })),

  setGeminiKey: (key) =>
    set((s) => persist({ ...s.settings, gemini_api_key: key.trim() })),

  setGeminiModel: (model) =>
    set((s) => persist({ ...s.settings, gemini_model: model })),

  setGroqKey: (key) =>
    set((s) => persist({ ...s.settings, groq_api_key: key.trim() })),

  setGroqModel: (model) =>
    set((s) => persist({ ...s.settings, groq_model: model })),
}));
