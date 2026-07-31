// 食物記錄 - 刪除 + 編輯 (PATCH)
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { foodBelongsToFamily } from '@/lib/family';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  // ownership check (透過 family 隔離 — 任何家庭成員都能編輯家庭共享的食物)
  const belongs = await foodBelongsToFamily(params.id, userId);
  if (!belongs) {
    return Response.json({ error: 'Not found or forbidden' }, { status: 404 });
  }

  const body = await req.json();
  const { quantity, name, unit, category, note } = body as {
    quantity?: number;
    name?: string;
    unit?: string;
    category?: string;
    note?: string | null;
  };

  // 至少要有一個欄位要改
  if (
    quantity === undefined &&
    name === undefined &&
    unit === undefined &&
    category === undefined &&
    note === undefined
  ) {
    return Response.json({ error: 'No fields to update' }, { status: 400 });
  }

  // 驗證 quantity
  if (quantity !== undefined) {
    if (typeof quantity !== 'number' || quantity < 0 || quantity > 9999) {
      return Response.json(
        { error: 'quantity 必須是 0-9999 的數字' },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.foodRecord.update({
    where: { id: params.id },
    data: {
      ...(quantity !== undefined ? { quantity } : {}),
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(unit !== undefined ? { unit: unit || null } : {}),
      ...(category !== undefined ? { category: category || null } : {}),
      ...(note !== undefined ? { note } : {}),
    },
  });

  return Response.json({ success: true, record: updated });
}
