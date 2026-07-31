// 一鍵永久刪除所有健康資料
// 刪除: 同意書 + 所有體檢記錄 + 所有自訂指標 + 所有上傳文件
// 不動: 用戶帳號、對話、食庫、家庭
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { del } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  // 先抓所有 Blob 檔案(為了刪除 Vercel Blob 上的原件)
  const files = await prisma.healthFile.findMany({ where: { userId } });

  // 刪除 DB 記錄(級聯刪除 entries)
  const [recordsDel, indicatorsDel, filesDel, consentDel] = await Promise.all([
    prisma.healthRecord.deleteMany({ where: { userId } }),
    prisma.healthCustomIndicator.deleteMany({ where: { userId } }),
    prisma.healthFile.deleteMany({ where: { userId } }),
    prisma.healthConsent.deleteMany({ where: { userId } }),
  ]);

  // 嘗試刪除 Vercel Blob 上的檔案
  let blobDeleted = 0;
  let blobErrors: string[] = [];
  for (const f of files) {
    try {
      await del(f.blobUrl);
      blobDeleted++;
    } catch (err) {
      console.error('[health/clear-all] blob delete failed:', f.blobUrl, err);
      blobErrors.push(f.filename);
    }
  }

  return NextResponse.json({
    success: true,
    deleted: {
      records: recordsDel.count,
      customIndicators: indicatorsDel.count,
      files: filesDel.count,
      consent: consentDel.count,
      blobFiles: blobDeleted,
      blobErrors: blobErrors.length,
    },
    message: `已永久刪除所有健康資料${blobErrors.length > 0 ? `（${blobErrors.length} 個檔案原件刪除失敗,需手動清理）` : ''}`,
  });
}
