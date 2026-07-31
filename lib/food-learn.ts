// 動態食物學習 — 從單一食材名稱抽取結構化知識
// 流程: 用戶拍照 → vision 識別出 X → X 不在靜態 KB → call LLM 抽取 → 存 LearnedFood
// 下次再有人加 X,直接 hit LearnedFood,零延遲
import OpenAI from 'openai';
import { prisma } from './db';

const apiKey = process.env.DASHSCOPE_API_KEY;
const baseURL =
  process.env.DASHSCOPE_BASE_URL ||
  'https://dashscope.aliyuncs.com/compatible-mode/v1';

const dashscope = new OpenAI({ apiKey: apiKey || 'sk-placeholder', baseURL });

const CHAT_MODEL = process.env.DASHSCOPE_CHAT_MODEL || 'qwen-plus';

const LEARN_PROMPT = `你是一位營養與食品安全專家。給定一個食材名稱,輸出該食材的結構化知識。

# 輸出格式 (JSON only)
{
  "name": "標準中文名稱",
  "aliases": ["其他常見叫法"],
  "category": "蔬菜|水果|肉類|海鮮|乳製品|蛋類|主食|零食|調味料|飲品|其他",
  "safety_notes": [
    { "type": "cooking|preparation|storage|pregnancy|infant|allergy|other", "text": "說明", "sources": ["USDA"], "confidence": "high|medium|low" }
  ],
  "pet_danger": { "dog": "safe|toxic|unsafe(if ...)", "cat": "safe|toxic|unsafe(if ...)", "source": "ASPCA", "note": "(optional)" },
  "common_allergens": ["過敏原清單,空 array 如果沒有"],
  "health_benefits": [
    { "text": "對身體的好處", "source": "(optional)" }
  ],
  "purchase_advice": "選購建議 (選填)",
  "confidence": "high|medium|low"
}

# 規則
1. 不知道的欄位留空 array 或 null
2. **絕對不要編造** — 沒把握的標 confidence "low"
3. 罕見/地域性太強的食材,整個 confidence 設 "low"
4. 只回 JSON,不要其他文字
5. safety_notes 不要超過 3 條
6. health_benefits 不要超過 3 條`;

/**
 * 教 Yoai 一個新食材
 * - 已經學過 (LearnedFood 存在) → 不重複學,直接返回
 * - 沒學過 → call LLM 抽取,存 DB
 * @returns { source: 'static' | 'learned' | 'newly_learned' | 'failed', data: ... }
 */
export async function learnFood(
  name: string,
  categoryHint?: string,
): Promise<{
  source: 'already_known' | 'newly_learned' | 'failed';
  data?: any;
  error?: string;
}> {
  const normalized = name.trim().toLowerCase();
  if (!normalized || normalized.length < 1) {
    return { source: 'failed', error: 'empty name' };
  }

  // 1. 已經學過
  const existing = await prisma.learnedFood.findFirst({
    where: {
      OR: [
        { name: { equals: name, mode: 'insensitive' } },
        { aliases: { has: name } },
        { aliases: { has: normalized } },
      ],
    },
  });
  if (existing) {
    return { source: 'already_known', data: existing };
  }

  // 2. 沒學過 → call LLM
  try {
    const completion = await dashscope.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: LEARN_PROMPT },
        {
          role: 'user',
          content: categoryHint
            ? `食材:${name}\n(系統推測分類:${categoryHint})\n\n請輸出 JSON:`
            : `食材:${name}\n\n請輸出 JSON:`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 800,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const parsed = JSON.parse(raw);

    // 3. 存 DB
    const saved = await prisma.learnedFood.create({
      data: {
        name: parsed.name || name,
        aliases: Array.isArray(parsed.aliases) ? parsed.aliases : [],
        category: parsed.category || categoryHint || '其他',
        safetyNotes: Array.isArray(parsed.safety_notes) ? parsed.safety_notes : [],
        petDanger: parsed.pet_danger || null,
        commonAllergens: Array.isArray(parsed.common_allergens) ? parsed.common_allergens : [],
        healthBenefits: Array.isArray(parsed.health_benefits) ? parsed.health_benefits : [],
        purchaseAdvice: parsed.purchase_advice || null,
        source: 'user_taught',
        confidence: parsed.confidence || 'medium',
      },
    });

    return { source: 'newly_learned', data: saved };
  } catch (err: any) {
    console.error(`[food-learn] failed for "${name}":`, err?.message || err);
    return { source: 'failed', error: err?.message || String(err) };
  }
}

/**
 * 把 LearnedFood entry 轉成跟靜態 KB 相同結構 (給 food summary merge)
 */
export function learnedToKbFormat(lf: any) {
  return {
    name: lf.name,
    aliases: lf.aliases,
    category: lf.category,
    safety_notes: lf.safetyNotes || [],
    pet_danger: lf.petDanger || undefined,
    common_allergens: lf.commonAllergens || [],
    health_benefits: lf.healthBenefits || [],
    purchase_advice: lf.purchaseAdvice || undefined,
    warning: lf.confidence === 'low' ? '此知識由 AI 自動學習,信心度較低,僅供參考' : undefined,
    conflict_disclosed: lf.confidence === 'low',
  };
}
