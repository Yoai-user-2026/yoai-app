// 健康文件 - 單條刪除(同時刪 Blob 上的原件)
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { del } from '@vercel/blob';

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

  const file = await prisma.healthFile.findUnique({ where: { id: params.id } });
  if (!file || file.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 刪 Blob 上原件(best-effort,失敗不擋)
  try {
    await del(file.blobUrl);
  } catch (err) {
    console.error('[health/files] blob delete failed:', file.blobUrl, err);
  }

  await prisma.healthFile.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true, deletedId: params.id });
}
