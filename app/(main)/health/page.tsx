// 健康檔案頁面 — 同意 gate + 主介面
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { HealthConsent } from '@/components/HealthConsent';
import { HealthDashboard } from '@/components/HealthDashboard';
import { HeartPulse } from 'lucide-react';

export default async function HealthPage() {
  const session = await auth();
  const userId = (session!.user as any).id as string;

  const consent = await prisma.healthConsent.findUnique({
    where: { userId },
  });

  return (
    <div className="px-5 py-4">
      <header className="mb-4">
        <h1 className="text-xl text-cocoa-600 font-medium flex items-center gap-2">
          <HeartPulse size={20} className="text-rose-400" />
          健康
        </h1>
        <p className="text-xs text-cocoa-400 mt-1">你的身體數據檔案,完全個人化 🌿</p>
      </header>

      {!consent ? <HealthConsent /> : <HealthDashboard userId={userId} />}
    </div>
  );
}
