import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ChatClient } from '@/components/ChatClient';

export default async function ChatPage() {
  const session = await auth();
  const userId = (session!.user as any).id;

  // 載入最近 50 條對話(按時間正序)
  // 修正: 之前用 asc + take 30 → 拿到最舊 30 條
  // 改成 desc + take 50,再 reverse 維持時間正序
  const historyDesc = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const history = historyDesc.reverse();

  // 載入用戶記憶
  const memories = await prisma.memory.findMany({
    where: { userId },
    orderBy: { weight: 'desc' },
    take: 10,
  });

  return (
    <ChatClient
      userName={session!.user?.name || '主理人'}
      initialMessages={history.map((h) => {
        // 解析 metadata,提取 imageUrl
        let imageUrl: string | undefined;
        if (h.metadata) {
          try {
            const m = JSON.parse(h.metadata);
            imageUrl = m.imageUrl || undefined;
          } catch {}
        }
        return {
          id: h.id,
          role: h.role as 'user' | 'assistant' | 'system',
          content: h.content,
          imageUrl,
          createdAt: h.createdAt.toISOString(),
        };
      })}
      memories={memories.map((m) => ({ key: m.key, value: m.value }))}
    />
  );
}
