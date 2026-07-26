// Rate Limiting — 防止 token 被刷爆
// 每用戶每天總調用次數(chat + vision 合計)
import { prisma } from './db';

export const DAILY_LIMIT = 30;

/**
 * 獲取用戶今天已用的次數
 */
export async function getTodayUsage(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.usageLog.count({
    where: {
      userId,
      createdAt: { gte: startOfDay },
    },
  });
}

/**
 * 檢查用戶是否還能調用
 * @returns { allowed: boolean, remaining: number, usedToday: number }
 */
export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  usedToday: number;
  limit: number;
}> {
  const usedToday = await getTodayUsage(userId);
  const remaining = Math.max(0, DAILY_LIMIT - usedToday);
  return {
    allowed: usedToday < DAILY_LIMIT,
    remaining,
    usedToday,
    limit: DAILY_LIMIT,
  };
}

/**
 * 記錄一次調用(寫入 UsageLog)
 */
export async function recordUsage(opts: {
  userId: string;
  type: 'chat' | 'vision' | 'food';
  promptTokens: number;
  completionTokens: number;
  category?: string;
  requestSummary?: string;
  responseSummary?: string;
}) {
  return prisma.usageLog.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      promptTokens: opts.promptTokens,
      completionTokens: opts.completionTokens,
      category: opts.category,
      requestSummary: opts.requestSummary?.slice(0, 200),
      responseSummary: opts.responseSummary?.slice(0, 200),
    },
  });
}
