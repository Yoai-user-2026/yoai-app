// 健康記錄 - 單條刪除
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  // 確認是這個用戶的
  const record = await prisma.healthRecord.findUnique({ where: { id: params.id } });
  if (!record || record.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.healthRecord.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true, deletedId: params.id });
}
