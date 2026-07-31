// 臨時診斷端點 — 測試 DashScope 連線狀態
// 確認: API key 是否有效、模型是否可達、配額是否用完
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const baseURL = process.env.DASHSCOPE_BASE_URL;
  const chatModel = process.env.DASHSCOPE_CHAT_MODEL || 'qwen-plus';
  const vlModel = process.env.DASHSCOPE_VL_MODEL || 'qwen-vl-plus';

  const result: any = {
    timestamp: new Date().toISOString(),
    env: {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.slice(0, 15) + '...' : null,
      apiKeyLength: apiKey?.length || 0,
      baseURL: baseURL || '(fallback)',
      chatModel,
      vlModel,
    },
    tests: {},
  };

  if (!apiKey) {
    result.tests.error = 'DASHSCOPE_API_KEY 未設定';
    return NextResponse.json(result);
  }

  const client = new OpenAI({ apiKey, baseURL: baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1' });

  // Test 1: chat model
  try {
    const start = Date.now();
    const r = await client.chat.completions.create({
      model: chatModel,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 10,
    });
    result.tests.chat = {
      ok: true,
      latency_ms: Date.now() - start,
      reply: r.choices[0]?.message?.content,
    };
  } catch (err: any) {
    result.tests.chat = {
      ok: false,
      error_message: err?.message,
      error_status: err?.status,
      error_code: err?.code,
      error_type: err?.type,
      error_response: err?.response?.data,
    };
  }

  // Test 2: vision model
  try {
    const start = Date.now();
    const r = await client.chat.completions.create({
      model: vlModel,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 10,
    });
    result.tests.vision = {
      ok: true,
      latency_ms: Date.now() - start,
      reply: r.choices[0]?.message?.content,
    };
  } catch (err: any) {
    result.tests.vision = {
      ok: false,
      error_message: err?.message,
      error_status: err?.status,
      error_code: err?.code,
      error_type: err?.type,
      error_response: err?.response?.data,
    };
  }

  return NextResponse.json(result);
}
