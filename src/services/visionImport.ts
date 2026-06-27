import Anthropic from '@anthropic-ai/sdk';
import { PALS, PASSIVES } from '../data';
import type { Gender } from '../types/owned';
import type { VisionProvider } from '../store/useSettingsStore';

export interface VisionParsedPal {
  pal_id: string;
  pal_label: string;
  gender: Gender;
  passives: string[];
  passive_labels: string[];
  raw_name?: string;
  raw_passives?: string[];
  warnings?: string[];
}

export interface VisionImportResult {
  parsed: VisionParsedPal[];
  raw_text: string;
}

export interface VisionImportOptions {
  provider: VisionProvider;
  apiKey: string;
  model: string;
}

const SYSTEM_PROMPT = `你是 Palworld(幻獸帕魯)遊戲截圖辨識助手。
使用者會給你一張或多張遊戲內介面截圖,可能包含:
- 帕魯詳細頁(顯示帕魯名字、性別圖示 ♂/♀、被動詞條清單)
- 帕魯倉庫列表(每隻一行,有名字 + 圖示 + 詞條)

你的任務是抽出每一隻帕魯的:
1. 名字(請從下方「Pal 名稱表」找最相近的 id;中文/英文/暱稱都要能對到)
2. 性別:male / female / unknown(如果沒看到圖示)
3. 被動詞條清單(請從下方「被動詞條表」找最相近的 id;最多 4 個)

** 嚴格要求 **
- 只回傳 JSON,不要有任何 markdown 程式碼框或多餘文字
- 名字一定要從給定的 pal_id 清單裡選,不要自己編
- 詞條也一定要從給定的 passive_id 清單裡選
- 如果某項你不確定,把 id 留空字串 "",並在 warnings 裡說明
- raw_name 記錄你「實際看到的文字」(包含暱稱或原文)
- raw_passives 記錄你「實際看到的詞條原文」

JSON schema:
{
  "pals": [
    {
      "pal_id": "string",
      "gender": "male" | "female" | "unknown",
      "passives": ["passive_id", ...],
      "raw_name": "string",
      "raw_passives": ["string", ...],
      "warnings": ["string", ...]
    }
  ]
}`;

function buildReferenceTable(): string {
  const pals = PALS.map(
    (p) => `${p.id} | ${p.name_zh} | ${p.name_en}`
  ).join('\n');
  const passives = PASSIVES.map(
    (p) => `${p.id} | ${p.name_zh} | ${p.name_en}`
  ).join('\n');
  return `## Pal 名稱表(pal_id | 中文 | 英文)\n${pals}\n\n## 被動詞條表(passive_id | 中文 | 英文)\n${passives}`;
}

const FULL_SYSTEM = SYSTEM_PROMPT + '\n\n' + buildReferenceTable();
const USER_INSTRUCTION = '請辨識上面所有截圖中的帕魯,回傳 JSON。';

type SupportedMime =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/gif';

async function fileToBase64(
  file: File
): Promise<{ media_type: SupportedMime; data: string }> {
  const buf = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const data = btoa(binary);
  const type = file.type;
  if (
    type === 'image/png' ||
    type === 'image/jpeg' ||
    type === 'image/webp' ||
    type === 'image/gif'
  ) {
    return { media_type: type, data };
  }
  return { media_type: 'image/png', data };
}

interface ModelResponseItem {
  pal_id?: string;
  gender?: string;
  passives?: string[];
  raw_name?: string;
  raw_passives?: string[];
  warnings?: string[];
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1].trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function normalizeGender(g: unknown): Gender {
  if (g === 'male' || g === 'female') return g;
  return 'unknown';
}

const PAL_IDS = new Set(PALS.map((p) => p.id));
const PASSIVE_IDS = new Set(PASSIVES.map((p) => p.id));

function getPalLabel(id: string): string {
  const p = PALS.find((x) => x.id === id);
  if (!p) return id;
  return p.name_zh ? `${p.name_zh}(${p.name_en})` : p.name_en;
}

function getPassiveLabel(id: string): string {
  const p = PASSIVES.find((x) => x.id === id);
  if (!p) return id;
  return p.name_zh ? `${p.name_zh}(${p.name_en})` : p.name_en;
}

/**
 * 解析 vision / 手貼的 JSON 字串成 VisionParsedPal[]。
 * 同時會用 PAL_IDS / PASSIVE_IDS 白名單把不認識的 id 清掉並寫進 warnings。
 * 接受的格式:
 *   { "pals": [ { pal_id, gender, passives, raw_name?, raw_passives?, warnings? } ] }
 * 也接受裸 array (直接 [{...}, {...}])。
 */
export function parseVisionJson(rawText: string): VisionParsedPal[] {
  let parsed: { pals?: ModelResponseItem[] } | ModelResponseItem[];
  try {
    parsed = JSON.parse(extractJsonObject(rawText));
  } catch (err) {
    console.error('JSON parse failed', err, rawText);
    throw new Error('JSON 無法解析,請看 console 原始輸出');
  }

  const items = Array.isArray(parsed) ? parsed : (parsed.pals ?? []);
  if (!Array.isArray(items)) {
    throw new Error('JSON 格式錯誤:找不到 pals 陣列');
  }
  return items.map((it) => {
    const warnings: string[] = [...(it.warnings ?? [])];
    let palId = it.pal_id ?? '';
    if (palId && !PAL_IDS.has(palId)) {
      warnings.push(`pal_id "${palId}" 不在名稱表內,已清空`);
      palId = '';
    }
    const passives = (it.passives ?? []).filter((p): p is string => {
      if (!p) return false;
      if (!PASSIVE_IDS.has(p)) {
        warnings.push(`詞條 "${p}" 不在名稱表內,已忽略`);
        return false;
      }
      return true;
    });

    return {
      pal_id: palId,
      pal_label: palId ? getPalLabel(palId) : '(未辨識)',
      gender: normalizeGender(it.gender),
      passives: passives.slice(0, 4),
      passive_labels: passives.slice(0, 4).map(getPassiveLabel),
      raw_name: it.raw_name,
      raw_passives: it.raw_passives,
      warnings: warnings.length ? warnings : undefined,
    };
  });
}

// --- Anthropic provider ---

async function callAnthropic(
  images: File[],
  apiKey: string,
  model: string
): Promise<string> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const imageBlocks = await Promise.all(
    images.map(async (img) => {
      const { media_type, data } = await fileToBase64(img);
      return {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type, data },
      };
    })
  );

  const response = await client.messages.create({
    model,
    max_tokens: 8000,
    system: FULL_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          { type: 'text', text: USER_INSTRUCTION },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Anthropic 回應沒有文字內容');
  }
  return textBlock.text;
}

// --- Gemini provider ---

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string };
  promptFeedback?: { blockReason?: string };
}

async function callGemini(
  images: File[],
  apiKey: string,
  model: string
): Promise<string> {
  const imageParts = await Promise.all(
    images.map(async (img) => {
      const { media_type, data } = await fileToBase64(img);
      return {
        inline_data: { mime_type: media_type, data },
      };
    })
  );

  const body = {
    contents: [
      {
        role: 'user',
        parts: [...imageParts, { text: USER_INSTRUCTION }],
      },
    ],
    systemInstruction: { parts: [{ text: FULL_SYSTEM }] },
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8000,
      temperature: 0.2,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    let detail = '';
    try {
      const err = (await resp.json()) as GeminiResponse;
      detail = err.error?.message ?? '';
    } catch {
      detail = await resp.text();
    }
    throw new Error(
      `Gemini API 錯誤 (${resp.status}): ${detail || '未知錯誤'}`
    );
  }

  const data = (await resp.json()) as GeminiResponse;

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini 拒絕回應: ${data.promptFeedback.blockReason}`);
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw new Error(
      `Gemini 沒有回傳文字 (finishReason=${data.candidates?.[0]?.finishReason ?? 'unknown'})`
    );
  }

  return text;
}

// --- Groq provider (OpenAI 相容 chat completions) ---

interface GroqResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  error?: { message?: string; type?: string };
}

async function callGroq(
  images: File[],
  apiKey: string,
  model: string
): Promise<string> {
  const imageParts = await Promise.all(
    images.map(async (img) => {
      const { media_type, data } = await fileToBase64(img);
      return {
        type: 'image_url' as const,
        image_url: { url: `data:${media_type};base64,${data}` },
      };
    })
  );

  const body = {
    model,
    messages: [
      { role: 'system', content: FULL_SYSTEM },
      {
        role: 'user',
        content: [...imageParts, { type: 'text', text: USER_INSTRUCTION }],
      },
    ],
    temperature: 0.2,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  };

  const resp = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!resp.ok) {
    let detail = '';
    try {
      const err = (await resp.json()) as GroqResponse;
      detail = err.error?.message ?? '';
    } catch {
      detail = await resp.text();
    }
    throw new Error(`Groq API 錯誤 (${resp.status}): ${detail || '未知錯誤'}`);
  }

  const data = (await resp.json()) as GroqResponse;
  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error(
      `Groq 沒有回傳文字 (finish_reason=${data.choices?.[0]?.finish_reason ?? 'unknown'})`
    );
  }

  return text;
}

// --- Public API ---

const PROVIDER_NAME: Record<VisionProvider, string> = {
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  groq: 'Groq',
};

export async function importPalsFromImages(
  images: File[],
  opts: VisionImportOptions
): Promise<VisionImportResult> {
  if (images.length === 0) throw new Error('沒有提供圖片');
  if (!opts.apiKey) {
    throw new Error(`尚未設定 ${PROVIDER_NAME[opts.provider]} API Key`);
  }

  let rawText: string;
  if (opts.provider === 'gemini') {
    rawText = await callGemini(images, opts.apiKey, opts.model);
  } else if (opts.provider === 'groq') {
    rawText = await callGroq(images, opts.apiKey, opts.model);
  } else {
    rawText = await callAnthropic(images, opts.apiKey, opts.model);
  }

  const parsed = parseVisionJson(rawText);
  return { parsed, raw_text: rawText };
}
