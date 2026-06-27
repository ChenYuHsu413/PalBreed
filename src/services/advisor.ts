import Anthropic from '@anthropic-ai/sdk';
import type { VisionProvider } from '../store/useSettingsStore';

export interface AdvisorOptions {
  provider: VisionProvider;
  apiKey: string;
  model: string;
}

export const ADVISOR_SYSTEM = `你是 Palworld(幻獸帕魯)的強力帕魯與配置推薦顧問。
使用者會給你他「已擁有的帕魯物種」清單。請依社群普遍公認的強勢選擇，推薦他**目前還沒有、值得入手**的強力帕魯及其完美詞條組合。

請分成這幾類，每類推薦 2~4 隻：
- 🗡 戰鬥（輸出 / 坦）
- 🐎 坐騎（陸 / 空 / 水域移動）
- 🏠 據點工作（採礦 / 伐木 / 製作 / 牧場 / 續航）

每個推薦請附：
1. 帕魯名（繁體中文）
2. 建議的完美詞條組（最多 4 個，例如：傳說、神速、攻擊力提升、力量等）
3. 為什麼強（一句話）
4. 怎麼取得（大方向：野外捕捉 或 配種；不確定確切地點就說用配種較穩，不要硬掰座標/數值）

規則：
- **只推薦使用者清單裡『沒有』的**；已擁有的最多用一行提醒可優化詞條。
- 繁體中文、條列、精簡可執行。
- 不確定就老實說，不要編造不存在的帕魯或數值。`;

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
