// 健康記錄 API — 9 個常規指標的體檢記錄
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encryptHealthField, decryptHealthField } from '@/lib/health-encrypt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface StandardHealthMarkers {
  cholesterol?: number;   // 總膽固醇 mmol/L
  ldl?: number;            // mmol/L
  hdl?: number;            // mmol/L
  triglycerides?: number;  // 三酸甘油脂 mmol/L
  glucose?: number;        // 空腹血糖 mmol/L
  hba1c?: number;          // %
  vitaminD?: number;       // ng/mL
  iron?: number;           // g/dL (血紅素)
  bmi?: number;            // kg/m²
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const records = await prisma.healthRecord.findMany({
    where: { userId },
    orderBy: { recordDate: 'desc' },
    take: 50,
  });

  // 解密
  const decrypted = records.map((r) => {
    try {
      const markers = decryptHealthField<StandardHealthMarkers>(userId, {
        ciphertext: r.encryptedData,
        iv: r.iv,
        authTag: r.authTag,
      });
      return {
        id: r.id,
        recordDate: r.recordDate,
        note: r.note,
        markers,
        createdAt: r.createdAt,
      };
    } catch (err) {
      console.error('[health/records] decrypt failed for', r.id, err);
      return {
        id: r.id,
        recordDate: r.recordDate,
        note: r.note,
        markers: {},
        createdAt: r.createdAt,
        decryptError: true,
      };
    }
  });

  return NextResponse.json({ success: true, records: decrypted });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const body = await req.json();
  const { recordDate, note, markers } = body as {
    recordDate: string;
    note?: string;
    markers: StandardHealthMarkers;
  };

  if (!recordDate) {
    return NextResponse.json({ error: 'recordDate is required' }, { status: 400 });
  }
  if (!markers || Object.keys(markers).length === 0) {
    return NextResponse.json({ error: 'at least one marker is required' }, { status: 400 });
  }

  // 加密
  const encrypted = encryptHealthField(userId, markers);

  const record = await prisma.healthRecord.create({
    data: {
      userId,
      encryptedData: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      recordDate: new Date(recordDate),
      note: note || null,
    },
  });

  return NextResponse.json({
    success: true,
    record: {
      id: record.id,
      recordDate: record.recordDate,
      note: record.note,
      markers,
    },
  });
}
