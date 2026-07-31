// 清空家庭食物 API
// - 刪除整個家庭群組的所有食物記錄
// - 二次確認由前端負責(避免誤觸)
// - POST 而非 DELETE:這是「命令」式操作,不是單一資源刪除

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureFamilyForUser } from '@/lib/family';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id as string;

    const familyGroupId = await ensureFamilyForUser(userId);

    // 先數有幾項,給前端確認用
    const beforeCount = await prisma.foodRecord.count({
      where: { familyGroupId },
    });

    if (beforeCount === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: '冰箱已經是空的',
      });
    }

    // 刪除
    const result = await prisma.foodRecord.deleteMany({
      where: { familyGroupId },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `已清空 ${result.count} 項食材`,
    });
  } catch (err) {
    console.error('[food/clear] error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: String(err) },
      { status: 500 },
    );
  }
}
