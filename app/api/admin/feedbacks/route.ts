// Admin Feedbacks API — 反饋列表
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const feedbacks = await prisma.feedback.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  return Response.json({
    feedbacks: feedbacks.map((f) => ({
      id: f.id,
      type: f.type,
      rating: f.rating,
      content: f.content,
      messageContent: f.messageContent,
      userEmail: f.user.email,
      userName: f.user.name || f.user.email,
      createdAt: f.createdAt.toISOString(),
    })),
  });
}
