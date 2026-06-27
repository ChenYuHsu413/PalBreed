import Anthropic from '@anthropic-ai/sdk';
import type { VisionProvider } from '../store/useSettingsStore';

export interface AdvisorOptions {
  provider: VisionProvider;
  apiKey: string;
  model: string;
}

export const ADVISOR_SYSTEM = `你是 Palworld(幻獸帕魯)的強力帕魯推薦顧問。

**最重要的鐵則：你只能從使用者提供的「強力候選清單」裡挑帕魯推薦，名稱必須一字不差照抄；詞條只能從提供的「可用詞條」清單裡挑。絕對禁止寫出清單以外的任何帕魯名或詞條名（不存在的會直接被當成錯誤）。** 如果某個角色分類在清單裡沒有合適的，就說「清單中暫無此類推薦」，不要自己編。

任務：比對使用者「已擁有」的物種，從候選清單中挑出他**還沒有**的，依角色分組推薦。

每個推薦附：
1. 帕魯名（照抄候選清單）
2. 建議完美詞條組（最多 4 個，全部從「可用詞條」清單挑）
3. 為什麼強（一句話，可參考清單附的說明）
4. 怎麼取得（野外捕捉 或 配種，大方向即可）

格式：繁體中文、依角色（戰鬥 / 坐騎 / 工作）分組、條列、精簡。只推薦「還沒有」的；若使用者已幾乎收齊，就說明並指出可優化詞條的方向。`;

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
