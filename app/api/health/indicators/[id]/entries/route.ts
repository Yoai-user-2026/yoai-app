// 自訂指標 - 新增 entry (新一筆數值)
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encryptHealthField } from '@/lib/health-encrypt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  // 確認 ownership
  const ind = await prisma.healthCustomIndicator.findUnique({ where: { id: params.id } });
  if (!ind || ind.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const { value, isText, recordDate, note } = body as {
    value: number | string;
    isText?: boolean;
    recordDate: string;
    note?: string;
  };

  if (value === undefined || value === null || value === '') {
    return NextResponse.json({ error: 'value is required' }, { status: 400 });
  }
  if (!recordDate) {
    return NextResponse.json({ error: 'recordDate is required' }, { status: 400 });
  }

  const encrypted = encryptHealthField(userId, value);

  const entry = await prisma.healthCustomIndicatorEntry.create({
    data: {
      indicatorId: params.id,
      encryptedValue: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      isText: !!isText,
      recordDate: new Date(recordDate),
      note: note || null,
    },
  });

  return NextResponse.json({
    success: true,
    entry: {
      id: entry.id,
      value,
      isText: entry.isText,
      recordDate: entry.recordDate,
      note: entry.note,
    },
  });
}
