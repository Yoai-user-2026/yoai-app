// Rate Limiting — 防止 token 被刷爆
// 每用戶每天總調用次數(chat + vision 合計)
// 例外:用戶所在家庭 FamilyGroup.isInternal = true → 不限次數
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
 * 檢查用戶是否屬於「內部」家庭(免 rate limit)
 */
export async function isInternalUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { familyGroup: { select: { isInternal: true } } },
  });
  return user?.familyGroup?.isInternal === true;
}

/**
 * 檢查用戶是否還能調用
 * 內部家庭用戶 → 不限次數
 * @returns { allowed: boolean, remaining: number, usedToday: number, internal: boolean }
 */
export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  usedToday: number;
  limit: number;
  internal: boolean;
}> {
  const usedToday = await getTodayUsage(userId);

  // 內部家庭用戶免 rate limit
  const internal = await isInternalUser(userId);
  if (internal) {
    return {
      allowed: true,
      remaining: 999,
      usedToday,
      limit: 999, // 視覺上顯示為 "999/999 內測"
      internal: true,
    };
  }

  const remaining = Math.max(0, DAILY_LIMIT - usedToday);
  return {
    allowed: usedToday < DAILY_LIMIT,
    remaining,
    usedToday,
    limit: DAILY_LIMIT,
    internal: false,
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
