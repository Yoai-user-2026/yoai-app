// Admin Users API — 用戶列表 + 每個用戶的使用情況
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      familyRole: true,
      shareSource: true,
      createdAt: true,
      _count: {
        select: { usageLogs: true, feedbacks: true, conversations: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 計算每個用戶今日調用次數
  const todayUsage = await prisma.usageLog.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: startOfDay } },
    _count: { _all: true },
  });
  const todayMap: Record<string, number> = {};
  for (const u of todayUsage) {
    todayMap[u.userId] = u._count._all;
  }

  return Response.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      familyRole: u.familyRole,
      shareSource: u.shareSource,
      createdAt: u.createdAt.toISOString(),
      totalUsage: u._count.usageLogs,
      todayUsage: todayMap[u.id] || 0,
      feedbackCount: u._count.feedbacks,
      conversationCount: u._count.conversations,
    })),
  });
}
