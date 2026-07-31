// 自訂指標 - 刪除 / 修改
// 刪除 indicator 會級聯刪除所有 entries
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function checkOwnership(indicatorId: string, userId: string) {
  const ind = await prisma.healthCustomIndicator.findUnique({ where: { id: indicatorId } });
  if (!ind || ind.userId !== userId) return null;
  return ind;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const ind = await checkOwnership(params.id, userId);
  if (!ind) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.healthCustomIndicator.delete({ where: { id: params.id } });
  return NextResponse.json({
    success: true,
    deletedId: params.id,
    message: `已刪除「${ind.name}」及其所有記錄`,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const ind = await checkOwnership(params.id, userId);
  if (!ind) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { name, unit, referenceMin, referenceMax } = body as {
    name?: string;
    unit?: string;
    referenceMin?: number | null;
    referenceMax?: number | null;
  };

  const updated = await prisma.healthCustomIndicator.update({
    where: { id: params.id },
    data: {
      name: name?.trim().slice(0, 50) || ind.name,
      unit: unit !== undefined ? (unit?.trim().slice(0, 20) || null) : ind.unit,
      referenceMin: referenceMin !== undefined ? referenceMin : ind.referenceMin,
      referenceMax: referenceMax !== undefined ? referenceMax : ind.referenceMax,
    },
  });

  return NextResponse.json({ success: true, indicator: updated });
}
