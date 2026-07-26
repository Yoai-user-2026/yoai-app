// 家庭群組輔助函數
import { prisma } from './db';

/**
 * 確保用戶屬於某個家庭群組
 * (理論上註冊時已建立,這是保險機制)
 */
export async function ensureFamilyForUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { familyGroupId: true },
  });

  if (user?.familyGroupId) return user.familyGroupId;

  // 沒有的話,自動建一個
  const group = await prisma.familyGroup.create({
    data: {
      name: process.env.DEFAULT_FAMILY_NAME || '我們的家',
      members: { connect: { id: userId } },
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { familyGroupId: group.id, familyRole: 'owner' },
  });
  return group.id;
}

/**
 * 檢查食物記錄是否屬於該用戶的家庭
 */
export async function foodBelongsToFamily(foodId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { familyGroupId: true },
  });
  if (!user?.familyGroupId) return false;

  const food = await prisma.foodRecord.findUnique({
    where: { id: foodId },
    select: { familyGroupId: true },
  });
  return food?.familyGroupId === user.familyGroupId;
}
