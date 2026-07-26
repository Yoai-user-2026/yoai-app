// 單個食物記錄的刪除
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { foodBelongsToFamily } from '@/lib/family';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const belongs = await foodBelongsToFamily(params.id, userId);
  if (!belongs) {
    return Response.json({ error: 'Not found or forbidden' }, { status: 404 });
  }

  await prisma.foodRecord.delete({ where: { id: params.id } });
  return Response.json({ ok: true });
}
