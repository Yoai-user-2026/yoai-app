// 簡易記憶抽取 — 從用戶訊息抓偏好,寫入 Memory 表
// 設計: pattern-based (不需要 LLM 調用,零延遲)
// 限制: 只能抓「明確」訊號;模糊語意留給未來 LLM 抽取
import { prisma } from '@/lib/db';

interface MemoryPattern {
  key: string;       // Memory.key
  regex: RegExp;
  description: string; // 給 log 用
}

// 繁體中文 + 簡體中文 兼容
const MEMORY_PATTERNS: MemoryPattern[] = [
  // 過敏
  { key: 'allergy', regex: /(我(對|會|吃).{1,15}(過敏|敏感|不能吃|不可以吃))/i, description: 'allergy' },
  // 位置（HK/台灣/內地城市 + 國際主要城市）
  {
    key: 'location',
    regex: /(我(住|在|來自|係|喺|是)(香港|澳門|台灣|台北|台中|高雄|北京|上海|廣州|深圳|杭州|成都|東京|大阪|京都|新加坡|紐約|洛杉磯|三藩市|多倫多|溫哥華|倫敦|悉尼|墨爾本|巴黎|柏林))/i,
    description: 'location',
  },
  // 飲食偏好
  { key: 'favorite_food', regex: /(我(喜歡|愛|鍾意|愛吃|愛喝).{1,15}(食物|食|飲|嘢)?)/i, description: 'favorite_food' },
  { key: 'dislike_food', regex: /(我(不吃|不喜歡|討厭|怕|不能吃).{1,15})/i, description: 'dislike_food' },
  // 運動習慣
  { key: 'exercise', regex: /(我(有|會|經常|通常).{0,5}(做|去)(gym|健身|跑步|瑜伽|游水|游水|行山|踩單車))/i, description: 'exercise' },
  // 飲食限制（素/葷）
  { key: 'diet_type', regex: /(我(吃|係|是|屬)(素|葷|vegan|vegetarian|素食|純素|海鮮素|蛋奶素))/i, description: 'diet_type' },
];

/**
 * 從單則用戶訊息抽取記憶,寫入 Memory 表 (upsert)
 * 返回新擷取到的記憶 key 列表（給 log / debug 用）
 */
export async function extractAndSaveMemories(
  userId: string,
  message: string,
): Promise<string[]> {
  if (!message || message.length < 4) return [];

  const extracted: string[] = [];

  for (const pattern of MEMORY_PATTERNS) {
    const match = message.match(pattern.regex);
    if (!match) continue;

    const value = match[0].slice(0, 100); // 限制長度,避免太長的 capture

    try {
      await prisma.memory.upsert({
        where: { userId_key: { userId, key: pattern.key } },
        update: { value, updatedAt: new Date() },
        create: { userId, key: pattern.key, value, weight: 1.0 },
      });
      extracted.push(pattern.key);
    } catch (err) {
      // 單條失敗不影響其他
      console.error(`[memory] upsert failed for key=${pattern.key}:`, err);
    }
  }

  return extracted;
}
