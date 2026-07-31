// 家庭管理頁面
import { auth, signOut } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureFamilyForUser } from '@/lib/family';
import { Copy, LogOut, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { InviteGenerator } from '@/components/InviteGenerator';
import { BetaChip } from '@/components/BetaChip';

export default async function FamilyPage() {
  const session = await auth();
  const userId = (session!.user as any).id as string;
  const familyGroupId = await ensureFamilyForUser(userId);

  const group = await prisma.familyGroup.findUnique({
    where: { id: familyGroupId },
    include: {
      members: {
        select: { id: true, name: true, email: true, familyRole: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!group) {
    return <div className="px-5 py-4">載入中...</div>;
  }

  const inviteUrl = `${process.env.AUTH_URL || 'http://localhost:3000'}/login?invite=${group.inviteCode}`;

  return (
    <div className="px-5 py-4 space-y-5">
      <header>
        <div className="flex items-center gap-1.5">
          <h1 className="text-xl text-cocoa-600 font-medium">{group.name}</h1>
          <BetaChip />
        </div>
        <p className="text-xs text-cocoa-400 mt-1">共 {group.members.length} 位成員</p>
      </header>

      {/* 邀請區 */}
      <section className="bg-gradient-to-br from-cocoa-400 to-cocoa-600 rounded-3xl p-5 text-white">
        <p className="text-sm opacity-90 mb-2">邀請家人加入</p>
        <div className="bg-white/15 backdrop-blur rounded-2xl p-3 mb-3">
          <p className="text-xs opacity-75 mb-1">邀請碼</p>
          <p className="font-mono text-lg tracking-wider break-all">{group.inviteCode}</p>
        </div>
        <p className="text-xs opacity-80 mt-3">
          家人註冊時貼上邀請碼,就會加入這個家 🌿
        </p>
      </section>

      {/* 分享連結生成器 */}
      <InviteGenerator inviteCode={group.inviteCode} />

      {/* 成員列表 */}
      <section>
        <h2 className="text-sm text-cocoa-500 mb-3 px-1">家人</h2>
        <div className="space-y-2">
          {group.members.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-soft"
            >
              <div className="w-10 h-10 rounded-xl bg-cream-200 flex items-center justify-center">
                <UserIcon size={18} className="text-cocoa-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-cocoa-600 font-medium">
                  {m.name || m.email}
                  {m.familyRole === 'owner' && (
                    <span className="ml-2 text-xs text-cocoa-400">(主理人)</span>
                  )}
                </p>
                {m.name && (
                  <p className="text-xs text-cocoa-400 truncate">{m.email}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 說明區 */}
      <section className="bg-cream-100/60 rounded-2xl p-4 text-xs text-cocoa-500 leading-relaxed">
        <p className="mb-1.5">🌿 <strong>私密 & 共享</strong></p>
        <p>你和 Yoai 的對話、記憶 — <strong>完全私密</strong>,只有你能看到</p>
        <p>家庭食物記錄 — <strong>全家共享</strong>,自動同步給每位成員</p>
      </section>

      {/* Admin 入口(只有 owner 看得到) */}
      {group.members.find((m) => m.id === userId && m.familyRole === 'owner') && (
        <Link
          href="/admin"
          className="block bg-gradient-to-r from-cocoa-500 to-cocoa-600 text-white rounded-2xl p-4 text-center font-medium hover:from-cocoa-600 hover:to-cocoa-700 transition-all"
        >
          📊 內測儀表板
          <p className="text-xs opacity-80 mt-0.5 font-normal">看用戶、調用、反饋、Token 消耗</p>
        </Link>
      )}

      {/* 登出 */}
      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/login' });
        }}
      >
        <button
          type="submit"
          className="w-full py-3 text-cocoa-400 text-sm flex items-center justify-center gap-2"
        >
          <LogOut size={16} /> 登出
        </button>
      </form>
    </div>
  );
}
