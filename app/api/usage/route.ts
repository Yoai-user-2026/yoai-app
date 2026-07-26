// 用戶今日 usage 查詢(前端 header 顯示剩餘額度)
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const limit = await checkRateLimit(userId);
  return Response.json(limit);
}
