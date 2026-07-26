// 反饋 API — 用戶對話後的 👍/👎 或文字反饋
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const type: string = body.type; // "thumbs" | "text"
  const rating: number = body.rating ?? 0; // 1=讚, -1=倒讚, 0=無
  const content: string | undefined = body.content;
  const messageContent: string | undefined = body.messageContent;

  if (!['thumbs', 'text'].includes(type)) {
    return Response.json({ error: 'Invalid type' }, { status: 400 });
  }

  if (type === 'thumbs' && ![1, -1].includes(rating)) {
    return Response.json({ error: 'Rating must be 1 or -1' }, { status: 400 });
  }

  if (type === 'text' && !content?.trim()) {
    return Response.json({ error: 'Text feedback cannot be empty' }, { status: 400 });
  }

  await prisma.feedback.create({
    data: {
      userId,
      type,
      rating,
      content: content?.trim() || null,
      messageContent: messageContent?.slice(0, 1000) || null,
    },
  });

  return Response.json({ ok: true });
}
