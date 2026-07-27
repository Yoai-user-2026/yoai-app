// 對話 API — 串流版 + Rate Limiting + Usage 記錄
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { streamChat, visionAnalysis } from '@/lib/dashscope';
import { buildSystemPrompt, FOOD_VISION_PROMPT } from '@/lib/yoai-prompt';
import { ensureFamilyForUser } from '@/lib/family';
import { checkRateLimit, recordUsage } from '@/lib/rate-limit';
import { estimateTokens } from '@/lib/token-estimate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 分類 prompt — 簡單規則式,避免額外 LLM 調用
function classifyMessage(userMsg: string, hasImage: boolean): string {
  if (hasImage) return 'food';
  const text = userMsg.toLowerCase();
  if (/(推薦|食譜|煮|做菜|料理|晚餐|午餐|早餐|食材|怎麼做|煮法|做)/.test(text)) return 'recipe';
  if (/(累|煩|難過|開心|心情|壓力|焦慮|想哭|寂寞|孤單|鬱|開心|快樂|好累|不想)/.test(text)) return 'emotion';
  if (/(吃|喝|餓|渴|口|買|菜|餐|飯|麵|湯|水果|蔬菜|肉|魚|蛋|奶|飲料)/.test(text)) return 'diet';
  if (/(月經|經期|週期|荷爾蒙|內分泌|經痛|姨媽)/.test(text)) return 'cycle';
  if (/(什麼|為什麼|怎麼|如何|介紹|解釋)/.test(text)) return 'info';
  return 'other';
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const userMessage: string = body.message || '';
  const imageBase64: string | undefined = body.imageBase64;

  // === Rate Limit 檢查 ===
  const rateLimit = await checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'rate_limit_exceeded',
        message: `今天的額度用完啦(已用 ${rateLimit.usedToday}/${rateLimit.limit} 次)~\n明天 0 點就會重置,先休息一下吧 🌿`,
        usedToday: rateLimit.usedToday,
        limit: rateLimit.limit,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  // 確保有家庭群組
  await ensureFamilyForUser(userId);

  // === 自動分類(用戶訊息)===
  const category = classifyMessage(userMessage, !!imageBase64);

  // === 看圖場景 ===
  let visionResult: any = null;
  let extractedFoods: any[] = [];
  let visionTokens = 0;
  if (imageBase64) {
    try {
      const raw = await visionAnalysis(FOOD_VISION_PROMPT, imageBase64, { jsonMode: true });
      visionTokens = estimateTokens(FOOD_VISION_PROMPT) + 1000; // 圖片按 ~1000 token 估算
      try {
        visionResult = JSON.parse(raw);
        extractedFoods = visionResult.items || [];
      } catch {
        visionResult = { raw };
      }
    } catch (err) {
      console.error('[vision] error:', err);
    }
  }

  // === 守門員: vision 失敗 / 圖片不是食物場景 ===
  // 不讓對話模型在「沒看到圖」的情況下幻想出食物(修 Bug 2: 薑汁雞絲蔬菜湯幽靈回覆)
  if (imageBase64) {
    const visionOk = visionResult && Array.isArray(visionResult.items);
    const isFood = visionResult?.isFoodImage !== false; // 沒明確說「不是」就當作是
    if (!visionOk || !isFood || extractedFoods.length === 0) {
      const reason =
        visionResult?.reason ||
        'Yoai 看不太清楚這張圖';
      const friendlyMsg = `${reason} 🌿 換個角度再拍一張,或者直接打字告訴我也行~`;

      // 存用戶訊息
      await prisma.conversation.create({
        data: {
          userId,
          role: 'user',
          content: userMessage || '[圖片]',
          metadata: JSON.stringify({ hasImage: true }),
        },
      });
      // 存 assistant 回應
      await prisma.conversation.create({
        data: { userId, role: 'assistant', content: friendlyMsg },
      });
      // 記錄 usage
      try {
        await recordUsage({
          userId,
          type: 'vision',
          promptTokens: visionTokens,
          completionTokens: estimateTokens(friendlyMsg),
          category: 'food',
          requestSummary: userMessage || '[圖片]',
          responseSummary: friendlyMsg,
        });
      } catch (err) {
        console.error('[usage] record error:', err);
      }

      // 回傳 SSE stream (單一訊息,直接關閉)
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(friendlyMsg));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining - 1),
        },
      });
    }
  }

  // === 構建對話歷史 ===
  const recent = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const memories = await prisma.memory.findMany({
    where: { userId },
    orderBy: { weight: 'desc' },
    take: 8,
  });

  // 構造 system prompt
  let contextHint = '';
  if (imageBase64) {
    contextHint = '用戶上傳了一張圖片,以下是視覺模型識別的結果:\n';
    if (visionResult) {
      contextHint += JSON.stringify(visionResult, null, 2);
    }
    contextHint += '\n\n請根據這些資訊,用溫暖的語氣回應。先給情緒價值(一句話就夠),再整理資料。如果辨識出食物,主動詢問是否要加入家庭共享的食物記錄。';
  }

  const systemPrompt = buildSystemPrompt({
    userName: session.user.name,
    memories,
    context: contextHint,
  });

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...recent.map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content })),
    {
      role: 'user' as const,
      content: imageBase64 && !userMessage
        ? '[用戶上傳了一張圖片,請根據視覺識別結果回應]'
        : userMessage || '[用戶上傳了圖片]',
    },
  ];

  // 估算 prompt tokens
  let promptTokens = 4;
  for (const m of messages) {
    promptTokens += 4 + estimateTokens(m.content);
  }
  if (visionTokens) promptTokens += visionTokens;

  // === 串流回應 + 同時存資料庫 ===
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';

      // 先存用戶訊息
      await prisma.conversation.create({
        data: {
          userId,
          role: 'user',
          content: userMessage || '[圖片]',
          metadata: imageBase64 ? JSON.stringify({ hasImage: true }) : null,
        },
      });

      // 如果有食物,自動加入家庭記錄
      if (extractedFoods.length > 0) {
        const familyGroupId = await ensureFamilyForUser(userId);
        for (const food of extractedFoods) {
          if (food.confidence === 'uncertain') continue;
          await prisma.foodRecord.create({
            data: {
              familyGroupId,
              uploadedById: userId,
              name: food.name,
              category: food.category,
              quantity: food.quantity || 1,
              unit: food.unit,
              imageUrl: imageBase64,
              sourceText: 'photo',
              rawVisionJson: JSON.stringify(food),
            },
          });
        }
      }

      try {
        for await (const chunk of streamChat(messages)) {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        console.error('[chat] stream error:', err);
        controller.enqueue(encoder.encode('\n\n(網路不順,我重試一下...)'));
      }

      // 存 assistant 回應
      if (fullResponse) {
        await prisma.conversation.create({
          data: { userId, role: 'assistant', content: fullResponse },
        });
      }

      // === 記錄 usage(包含分類 + token 估算)===
      const completionTokens = estimateTokens(fullResponse);
      try {
        await recordUsage({
          userId,
          type: imageBase64 ? 'vision' : 'chat',
          promptTokens,
          completionTokens,
          category,
          requestSummary: userMessage || (imageBase64 ? '[圖片識別]' : ''),
          responseSummary: fullResponse,
        });
      } catch (err) {
        console.error('[usage] record error:', err);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-RateLimit-Limit': String(rateLimit.limit),
      'X-RateLimit-Remaining': String(rateLimit.remaining - 1),
    },
  });
}
