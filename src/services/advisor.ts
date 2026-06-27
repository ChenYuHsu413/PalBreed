import Anthropic from '@anthropic-ai/sdk';
import type { VisionProvider } from '../store/useSettingsStore';

export interface AdvisorOptions {
  provider: VisionProvider;
  apiKey: string;
  model: string;
}

export const ADVISOR_SYSTEM = `你是 Palworld(幻獸帕魯)的配種與素材規劃顧問。
使用者會給你他目前的「素材庫」（手上每隻帕魯的物種、性別、被動詞條）以及（可能有的）培育目標。

請用**繁體中文、條列、精簡可執行**的方式給建議，聚焦在：
1. 目標達成度：以現有素材，目標物種＋目標詞條湊得齊嗎？缺哪些詞條。
2. 缺口補法：缺的詞條建議去抓哪種帕魯、或從哪隻現有素材轉移。
3. 該清理的素材：哪些是污染品（帶負面詞條、無目標詞條）可以放生／當飼料。
4. 下一步配種：給出 1~3 個最該先做的配種動作（記得配種要一公一母）。

不要冗長解釋遊戲機制，直接給能照做的步驟。若資料不足就說明還需要什麼資訊。`;

// --- Gemini ---
async function geminiText(prompt: string, apiKey: string, model: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: ADVISOR_SYSTEM }] },
      generationConfig: { temperature: 0.5, maxOutputTokens: 2000 },
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Gemini API 錯誤 (${resp.status}): ${detail.slice(0, 200)}`);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini 沒有回傳文字');
  return text;
}

// --- Groq (OpenAI 相容) ---
async function groqText(prompt: string, apiKey: string, model: string) {
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: ADVISOR_SYSTEM },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Groq API 錯誤 (${resp.status}): ${detail.slice(0, 200)}`);
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq 沒有回傳文字');
  return text;
}

// --- Anthropic ---
async function anthropicText(prompt: string, apiKey: string, model: string) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const res = await client.messages.create({
    model,
    max_tokens: 2000,
    system: ADVISOR_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = res.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('Anthropic 沒有回傳文字');
  return block.text;
}

export async function getAdvice(
  prompt: string,
  opts: AdvisorOptions
): Promise<string> {
  if (!opts.apiKey) throw new Error('尚未設定 API Key');
  if (opts.provider === 'gemini') return geminiText(prompt, opts.apiKey, opts.model);
  if (opts.provider === 'groq') return groqText(prompt, opts.apiKey, opts.model);
  return anthropicText(prompt, opts.apiKey, opts.model);
}
