// 阿里雲通義千問 (DashScope) — 使用 OpenAI 兼容協議
// 兼容文檔: https://help.aliyun.com/zh/model-studio/developer-reference/use-qwen-by-calling-api
import OpenAI from 'openai';

const apiKey = process.env.DASHSCOPE_API_KEY;

if (!apiKey) {
  console.warn('[Yoai] DASHSCOPE_API_KEY 未設定,AI 對話功能將無法使用');
}

export const dashscope = new OpenAI({
  apiKey: apiKey || 'sk-placeholder',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export const CHAT_MODEL = process.env.DASHSCOPE_CHAT_MODEL || 'qwen-plus';
export const VL_MODEL = process.env.DASHSCOPE_VL_MODEL || 'qwen-vl-plus';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 文字對話 — 串流版
 */
export async function* streamChat(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {},
) {
  const stream = await dashscope.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    stream: true,
    temperature: options.temperature ?? 0.8,
    max_tokens: options.maxTokens ?? 1500,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

/**
 * 視覺識別 — 看圖後返回結構化 JSON
 */
export async function visionAnalysis(
  prompt: string,
  imageBase64: string,
  options: { jsonMode?: boolean } = {},
) {
  const messages: any[] = [
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageBase64 } },
        { type: 'text', text: prompt },
      ],
    },
  ];

  const response = await dashscope.chat.completions.create({
    model: VL_MODEL,
    messages,
    response_format: options.jsonMode ? { type: 'json_object' } : undefined,
    temperature: 0.3, // 識別任務要更精確
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || '';
}
