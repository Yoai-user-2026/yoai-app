// 首頁 — 根據登入狀態分流
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect('/chat');
  } else {
    redirect('/login');
  }
}
