// 健康文件 API — 上傳病歷/醫生紙/體檢報告
// 用 Vercel Blob 存原件
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 允許的 MIME 類型
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const files = await prisma.healthFile.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, files });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const documentType = (formData.get('documentType') as string) || '其他';
  const note = (formData.get('note') as string) || null;

  if (!file) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `不支援的檔案類型:${file.type}。請用 PDF 或圖片(JPG/PNG/WebP/HEIC)` },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `檔案太大(${Math.round(file.size / 1024 / 1024)}MB),上限 10MB` },
      { status: 400 },
    );
  }

  // 上傳到 Vercel Blob
  // pathname: health/{userId}/{timestamp}-{filename}
  const safeName = file.name.replace(/[^a-zA-Z0-9._\u4e00-\u9fff-]/g, '_').slice(0, 80);
  const pathname = `health/${userId}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, file, {
    access: 'public', // Vercel Blob URL 是 unguessable,實際上是私密的
    addRandomSuffix: false,
  });

  // 存 metadata 到 DB
  const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';

  const record = await prisma.healthFile.create({
    data: {
      userId,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      filename: file.name,
      fileType,
      fileSize: file.size,
      documentType,
      note,
    },
  });

  return NextResponse.json({ success: true, file: record });
}
