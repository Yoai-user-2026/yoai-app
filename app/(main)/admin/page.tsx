// Admin Dashboard — 內測數據總覽
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminClient } from '@/components/AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await auth();
  const userId = (session!.user as any).id as string;

  // 基礎統計查詢(server-side 預渲染)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [totalUsers, todayUsage, totalFoods, totalConversations, totalFeedbacks] = await Promise.all([
    prisma.user.count(),
    prisma.usageLog.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.foodRecord.count(),
    prisma.conversation.count(),
    prisma.feedback.count(),
  ]);

  return (
    <AdminClient
      currentUserId={userId}
      initialStats={{
        totalUsers,
        todayUsage,
        totalFoods,
        totalConversations,
        totalFeedbacks,
      }}
    />
  );
}
