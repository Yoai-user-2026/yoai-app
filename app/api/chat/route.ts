// 對話 API — 串流版
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { streamChat, visionAnalysis } from '@/lib/dashscope';
import { buildSystemPrompt, FOOD_VISION_PROMPT } from '@/lib/yoai-prompt';
import { ensureFamilyForUser } from '@/lib/family';

export const runtime = 'nodejs'; // 串流需要 node runtime
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const userMessage: string = body.message || '';
  const imageBase64: string | undefined = body.imageBase64;

  // 確保有家庭群組
  await ensureFamilyForUser(userId);

  // === 看圖場景 ===
  let visionResult: any = null;
  let extractedFoods: any[] = [];
  if (imageBase64) {
    try {
      const raw = await visionAnalysis(FOOD_VISION_PROMPT, imageBase64, { jsonMode: true });
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

  // === 構建對話歷史(給 LLM 用)===
  const recent = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    take: 20, // 最近 20 條
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
  } else if (extractedFoods.length > 0) {
    contextHint = '你剛辨識出以下食物:\n' + extractedFoods.map(f => `- ${f.name} ${f.quantity}${f.unit || ''} (${f.category || ''})`).join('\n');
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
              imageUrl: imageBase64, // 暫存 base64
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

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
