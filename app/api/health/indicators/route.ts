// 自訂健康指標 API
// 結構: 一個 name (e.g. "月經週期") 對應多個 entries (時間序列)
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { decryptHealthField } from '@/lib/health-encrypt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const indicators = await prisma.healthCustomIndicator.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      entries: {
        orderBy: { recordDate: 'desc' },
        take: 20, // 每個 indicator 最多取 20 個 entry
      },
    },
  });

  // 解密 entry values
  const decrypted = indicators.map((ind) => ({
    id: ind.id,
    name: ind.name,
    unit: ind.unit,
    referenceMin: ind.referenceMin,
    referenceMax: ind.referenceMax,
    createdAt: ind.createdAt,
    entries: ind.entries.map((e) => {
      let value: number | string | null = null;
      try {
        if (e.isText) {
          value = decryptHealthField<string>(userId, {
            ciphertext: e.encryptedValue,
            iv: e.iv,
            authTag: e.authTag,
          });
        } else {
          value = decryptHealthField<number>(userId, {
            ciphertext: e.encryptedValue,
            iv: e.iv,
            authTag: e.authTag,
          });
        }
      } catch (err) {
        console.error('[health/indicators] decrypt failed:', e.id, err);
      }
      return {
        id: e.id,
        value,
        isText: e.isText,
        recordDate: e.recordDate,
        note: e.note,
        createdAt: e.createdAt,
      };
    }),
  }));

  return NextResponse.json({ success: true, indicators: decrypted });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const { name, unit, referenceMin, referenceMax } = body as {
    name: string;
    unit?: string;
    referenceMin?: number;
    referenceMax?: number;
  };

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const indicator = await prisma.healthCustomIndicator.create({
      data: {
        userId,
        name: name.trim().slice(0, 50),
        unit: unit?.trim().slice(0, 20) || null,
        referenceMin: referenceMin ?? null,
        referenceMax: referenceMax ?? null,
      },
    });
    return NextResponse.json({ success: true, indicator });
  } catch (err: any) {
    // unique constraint: userId + name
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: '已有同名指標,請用別的名字或在既有指標上新增數值' },
        { status: 409 },
      );
    }
    throw err;
  }
}
