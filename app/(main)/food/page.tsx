// 食物記錄頁面 — 顯示家庭共享的食物清單
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureFamilyForUser } from '@/lib/family';
import { FoodList } from '@/components/FoodList';
import { Plus } from 'lucide-react';

export default async function FoodPage() {
  const session = await auth();
  const userId = (session!.user as any).id as string;
  const familyGroupId = await ensureFamilyForUser(userId);

  const foods = await prisma.foodRecord.findMany({
    where: { familyGroupId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { uploadedBy: { select: { name: true, email: true } } },
  });

  // 統計 — 簡單的分類匯總
  const byCategory = foods.reduce((acc: Record<string, number>, f) => {
    const cat = f.category || '其他';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="px-5 py-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl text-cocoa-600 font-medium">家庭食物</h1>
          <p className="text-xs text-cocoa-400 mt-1">大家共用的冰箱 & 採買清單 🌿</p>
        </div>
      </header>

      {/* 分類概覽 */}
      {Object.keys(byCategory).length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1">
          {Object.entries(byCategory).map(([cat, count]) => (
            <div
              key={cat}
              className="flex-shrink-0 px-3 py-1.5 bg-cream-100 rounded-full text-xs text-cocoa-500"
            >
              {cat} · {count}
            </div>
          ))}
        </div>
      )}

      <FoodList
        foods={foods.map((f) => ({
          id: f.id,
          name: f.name,
          category: f.category,
          quantity: f.quantity,
          unit: f.unit,
          imageUrl: f.imageUrl,
          uploadedBy: f.uploadedBy.name || f.uploadedBy.email,
          createdAt: f.createdAt.toISOString(),
        }))}
      />

      <p className="text-xs text-cocoa-400 text-center mt-6">
        想新增食物?去「聊聊」傳張照片,Yoai 會自動幫你整理
      </p>
    </div>
  );
}
