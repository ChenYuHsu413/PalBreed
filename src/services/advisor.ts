import Anthropic from '@anthropic-ai/sdk';
import type { VisionProvider } from '../store/useSettingsStore';

export interface AdvisorOptions {
  provider: VisionProvider;
  apiKey: string;
  model: string;
}

export const ADVISOR_SYSTEM = `你是 Palworld(幻獸帕魯)的強力帕魯推薦顧問。

**鐵則：name 只能從使用者提供的「強力候選清單」一字不差照抄；passives 只能從「可用詞條」清單照抄。禁止任何清單以外的名稱（不存在的會被丟棄）。**

任務：比對使用者「已擁有」，從候選清單挑出他**還沒有**的，依角色分組推薦。

**只回傳 JSON，不要 markdown 程式碼框、不要多餘文字。** 格式：
{
  "note": "選填，一句總結或『已幾乎收齊』之類的提醒",
  "groups": [
    {
      "role": "戰鬥",
      "pals": [
        {
          "name": "空渦龍",
          "passives": ["傳說", "神速", "攻擊力提升", "力量"],
          "reason": "為什麼強，一句話",
          "obtain": "怎麼取得，野外捕捉或配種大方向"
        }
      ]
    }
  ]
}

role 只用：戰鬥 / 坐騎 / 工作。passives 最多 4 個。只放「還沒有」的；某類無合適就不要放那個 group。reason/obtain 用繁體中文、精簡。`;

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
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      },
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
      response_format: { type: 'json_object' },
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
