// Admin Stats API — 內測數據總覽
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    todayActiveUsers,
    todayUsage,
    weekUsage,
    todayFeedbacks,
    categoryBreakdown,
    totalTokens,
    todayTokens,
  ] = await Promise.all([
    // 總用戶數
    prisma.user.count(),
    // 今日活躍(有用過的)
    prisma.usageLog.findMany({
      where: { createdAt: { gte: startOfDay } },
      distinct: ['userId'],
      select: { userId: true },
    }).then((rows) => rows.length),
    // 今日調用次數
    prisma.usageLog.count({ where: { createdAt: { gte: startOfDay } } }),
    // 本週調用
    prisma.usageLog.count({ where: { createdAt: { gte: startOfWeek } } }),
    // 今日反饋
    prisma.feedback.count({ where: { createdAt: { gte: startOfDay } } }),
    // 分類分布(本週)
    prisma.usageLog.groupBy({
      by: ['category'],
      where: { createdAt: { gte: startOfWeek } },
      _count: { _all: true },
    }),
    // 總 token(估算)
    prisma.usageLog.aggregate({
      _sum: { promptTokens: true, completionTokens: true },
    }),
    // 今日 token
    prisma.usageLog.aggregate({
      where: { createdAt: { gte: startOfDay } },
      _sum: { promptTokens: true, completionTokens: true },
    }),
  ]);

  return Response.json({
    totalUsers,
    todayActiveUsers,
    todayUsage,
    weekUsage,
    todayFeedbacks,
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c.category || 'other',
      count: c._count._all,
    })),
    totalTokens: {
      prompt: totalTokens._sum.promptTokens || 0,
      completion: totalTokens._sum.completionTokens || 0,
    },
    todayTokens: {
      prompt: todayTokens._sum.promptTokens || 0,
      completion: todayTokens._sum.completionTokens || 0,
    },
  });
}
