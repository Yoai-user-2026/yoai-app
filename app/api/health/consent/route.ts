// 健康資料同意書 API
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONSENT_VERSION = 'v1.0-2026-07-31';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const consent = await prisma.healthConsent.findUnique({
    where: { userId },
  });

  return NextResponse.json({
    success: true,
    consented: !!consent,
    consent: consent || null,
    version: CONSENT_VERSION,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  // 抓 IP 和 UA 給 audit log
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
  const userAgent = req.headers.get('user-agent') || null;

  // upsert:如果已同意過,更新 timestamp (代表重新確認當前版本)
  const consent = await prisma.healthConsent.upsert({
    where: { userId },
    update: {
      consentVersion: CONSENT_VERSION,
      consentedAt: new Date(),
      ipAddress,
      userAgent,
    },
    create: {
      userId,
      consentVersion: CONSENT_VERSION,
      ipAddress,
      userAgent,
    },
  });

  return NextResponse.json({ success: true, consent });
}
