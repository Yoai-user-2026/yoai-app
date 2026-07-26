// NextAuth v5 (Auth.js) 設定 — 使用 JWT session + Credentials Provider
// 文檔: https://authjs.dev/getting-started

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  // 注意: Auth.js v5 在 Vercel 自動配置 AUTH_SECRET 環境變量
  secret: process.env.AUTH_SECRET,

  trustHost: true, // 信任 Vercel 提供的 host header
  session: { strategy: 'jwt' },

  pages: {
    signIn: '/login',
  },

  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' }, // 註冊用
        mode: { label: 'Mode', type: 'text' }, // "login" | "register"
        inviteCode: { label: 'Invite Code', type: 'text' }, // 加入家庭群組用
      },
      async authorize(credentials) {
        const email = String(credentials?.email || '').toLowerCase().trim();
        const password = String(credentials?.password || '');
        const name = String(credentials?.name || '').trim();
        const mode = String(credentials?.mode || 'login');
        const inviteCode = String(credentials?.inviteCode || '').trim();

        if (!email || !password) return null;
        if (password.length < 6) return null;

        // === 註冊 ===
        if (mode === 'register') {
          try {
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
              console.log(`[auth] 註冊失敗: email 已存在 ${email}`);
              return null;
            }

            const passwordHash = await bcrypt.hash(password, 10);
            const userName = name || email.split('@')[0];

            // 決定要加入的家庭群組
            let familyGroupId: string | undefined;
            let familyRole = 'owner';

            if (inviteCode) {
              // 透過邀請碼加入既有家庭
              const group = await prisma.familyGroup.findUnique({
                where: { inviteCode },
              });
              if (!group) {
                console.log(`[auth] 註冊失敗: 邀請碼無效 ${inviteCode}`);
                return null;
              }
              familyGroupId = group.id;
              familyRole = 'member';
            }

            const user = await prisma.user.create({
              data: {
                email,
                name: userName,
                passwordHash,
                familyGroupId,
                familyRole,
              },
              include: { familyGroup: true },
            });
            console.log(`[auth] 用戶建立成功: ${user.id} ${email}`);

            // 如果是 owner,建立家庭群組
            if (!familyGroupId) {
              const group = await prisma.familyGroup.create({
                data: {
                  name: process.env.DEFAULT_FAMILY_NAME || '我們的家',
                  members: { connect: { id: user.id } },
                },
              });
              await prisma.user.update({
                where: { id: user.id },
                data: { familyGroupId: group.id, familyRole: 'owner' },
              });
              console.log(`[auth] 家庭群組建立成功: ${group.id}`);
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
            };
          } catch (err: any) {
            console.error(`[auth] 註冊異常:`, err?.message || err);
            // 拋出錯誤以觸發前端更詳細的提示
            throw new Error(`註冊失敗: ${err?.message || '未知錯誤'}`);
          }
        }

        // === 登入 ===
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // 第一次登入時,把 userId 存進 token
        token.userId = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
});
