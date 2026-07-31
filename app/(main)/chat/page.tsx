import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ChatClient } from '@/components/ChatClient';

export default async function ChatPage() {
  const session = await auth();
  const userId = (session!.user as any).id;

  // 載入最近 30 條對話(按時間正序)
  const history = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    take: 30,
  });

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
