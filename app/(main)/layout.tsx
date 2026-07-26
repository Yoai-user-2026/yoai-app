// 已登入用戶的主佈局 — 帶底部導航
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { BottomNav } from '@/components/BottomNav';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      <div className="flex-1 max-w-md mx-auto w-full pb-24">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
