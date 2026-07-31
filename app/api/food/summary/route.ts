// 食物摘要 API
// - 獲取用戶最近的食物記錄
// - 與知識庫比對，提取安全注意
// - 計算分類統計
// - 返回結構化摘要
// - 知識來源: 靜態 KB (lib/data/food-knowledge.json) + 動態 LearnedFood (DB)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import foodKnowledge from '@/lib/data/food-knowledge.json';
import { learnedToKbFormat, learnFood } from '@/lib/food-learn';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FoodKnowledge {
  version: string;
  last_reviewed: string;
  region_focus: string;
  sources: Record<string, string>;
  ingredients: Array<{
    name: string;
    aliases?: string[];
    category: string;
    safety_notes: Array<{
      type: string;
      text: string;
      sources?: string[];
      confidence?: string;
    }>;
    pet_danger?: {
      dog?: string;
      cat?: string;
      source?: string;
      note?: string;
    };
    common_allergens?: string[];
    health_benefits?: Array<{ text: string; source?: string }>;
    purchase_advice?: string;
    warning?: string;
    conflict_disclosed?: boolean;
  }>;
}

const knowledge = foodKnowledge as FoodKnowledge;

// 建立名稱別名索引（用於模糊匹配）
const nameToIngredient: Map<string, FoodKnowledge['ingredients'][0]> = new Map();

function buildIndex() {
  if (nameToIngredient.size > 0) return; // 已經建過
  for (const ing of knowledge.ingredients) {
    nameToIngredient.set(ing.name.toLowerCase(), ing);
    if (ing.aliases) {
      for (const alias of ing.aliases) {
        nameToIngredient.set(alias.toLowerCase(), ing);
      }
    }
  }
}

buildIndex();

/**
 * 將食物名稱標準化 + 匹配知識庫
 * 先查靜態 KB,miss 再查 LearnedFood (DB)
 */
async function findIngredient(foodName: string): Promise<FoodKnowledge['ingredients'][0] | null> {
  const normalized = foodName.toLowerCase().trim();

  // 1. 靜態 KB 完全匹配
  if (nameToIngredient.has(normalized)) {
    return nameToIngredient.get(normalized) || null;
  }

  // 2. 靜態 KB 部分匹配
  for (const [key, ing] of nameToIngredient.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return ing;
    }
  }

  // 3. LearnedFood (DB) — 動態學過的
  try {
    const learned = await prisma.learnedFood.findFirst({
      where: {
        OR: [
          { name: { equals: foodName, mode: 'insensitive' } },
          { aliases: { has: foodName } },
          { aliases: { has: normalized } },
        ],
      },
    });
    if (learned) return learnedToKbFormat(learned) as any;
  } catch (err) {
    console.error('[food/summary] LearnedFood lookup failed:', err);
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id as string;

    // 確保家庭群組存在
    const { ensureFamilyForUser } = await import('@/lib/family');
    const familyGroupId = await ensureFamilyForUser(userId);

    // 獲取用戶所在家庭的最近食物記錄（最近 60 天）
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const records = await prisma.foodRecord.findMany({
      where: {
        familyGroupId,
        createdAt: { gte: sixtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (records.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          empty: true,
          message: '尚未有食物記錄。請先新增幾筆食物記錄再生成摘要。',
        },
      });
    }

    // === 統計 ===
    const totalItems = records.length;
    const categoryCount: Record<string, number> = {};
    const matchedIngredients = new Set<string>();
    const safetyWarnings: Array<{
      food: string;
      note: string;
      sources: string[];
      confidence: string;
      type: string;
    }> = [];
    const petDangers: Array<{
      food: string;
      danger: string;
      note?: string;
    }> = [];
    const allergensFound: Set<string> = new Set();
    const unknownFoods: Set<string> = new Set();
    const seenPetDangers: Set<string> = new Set();

    for (const record of records) {
      // 統計分類
      const category = record.category || '其他';
      categoryCount[category] = (categoryCount[category] || 0) + 1;

      // 匹配知識庫 (靜態 + 動態)
      const ingredient = await findIngredient(record.name);
      if (ingredient) {
        matchedIngredients.add(ingredient.name);

        // 收集安全注意
        for (const note of ingredient.safety_notes) {
          safetyWarnings.push({
            food: ingredient.name,
            note: note.text,
            sources: note.sources || [],
            confidence: note.confidence || 'medium',
            type: note.type,
          });
        }

        // 收集寵物禁忌 (用 seenPetDangers 去重 — 同個食物加 2 次只顯示 1 次)
        if (ingredient.pet_danger) {
          const dogDanger = ingredient.pet_danger.dog;
          const catDanger = ingredient.pet_danger.cat;
          if (
            dogDanger?.toUpperCase().includes('TOXIC') ||
            dogDanger?.toUpperCase().includes('UNSAFE') ||
            catDanger?.toUpperCase().includes('TOXIC') ||
            catDanger?.toUpperCase().includes('UNSAFE')
          ) {
            if (!seenPetDangers.has(ingredient.name)) {
              seenPetDangers.add(ingredient.name);
              petDangers.push({
                food: ingredient.name,
                danger: `${dogDanger || catDanger}`,
                note: ingredient.pet_danger.note,
              });
            }
          }
        }

        // 收集過敏原
        if (ingredient.common_allergens) {
          for (const allergen of ingredient.common_allergens) {
            allergensFound.add(allergen);
          }
        }
      } else {
        unknownFoods.add(record.name);
      }
    }

    // === Lazy learning: 遇到未收錄的食物,自動 call LLM 學 ===
    // (不阻塞主流程 — 用 Promise.all 並行,加 5 秒超時保險)
    if (unknownFoods.size > 0) {
      const toLearn = Array.from(unknownFoods).slice(0, 5); // 一次最多學 5 個,避免超時
      const learningPromises = toLearn.map((name) =>
        Promise.race([
          learnFood(name),
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ source: 'failed' as const, error: 'timeout' }),
              5000,
            ),
          ),
        ]),
      );
      // 等所有學完,但不阻塞超過 6 秒
      try {
        await Promise.all(learningPromises);
        console.log(`[food/summary] lazy-learned ${toLearn.length} foods`);
        // 重新 query LearnedFood 一次,然後對 known 集合做後續比對
        // (這次只記錄,下一次 summary 會自然命中)
      } catch (err) {
        console.error('[food/summary] lazy learning error:', err);
      }
    }

    // === 生成摘要 ===
    const summary = {
      empty: false,
      generated_at: new Date().toISOString(),
      data_period_days: 60,
      total_items: totalItems,
      unique_ingredients_matched: matchedIngredients.size,
      unique_ingredients_unknown: unknownFoods.size,
      category_breakdown: categoryCount,
      safety_warnings: dedupeWarnings(safetyWarnings),
      pet_dangers: petDangers,
      allergens_in_pantry: Array.from(allergensFound),
      unknown_foods: Array.from(unknownFoods),
      suggestions: {
        add_to_knowledge_base:
          unknownFoods.size > 0
            ? `有 ${unknownFoods.size} 種食物尚未在知識庫中：${Array.from(unknownFoods).slice(0, 5).join('、')}。可考慮在下一版擴展知識庫。`
            : null,
      },
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
    console.error('[food/summary] error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: String(err) },
      { status: 500 },
    );
  }
}

/**
 * 去重安全警告（相同食物+內容的合併）
 */
function dedupeWarnings(
  warnings: Array<{ food: string; note: string; sources: string[]; confidence: string; type: string }>,
) {
  const seen = new Map<string, typeof warnings[0]>();
  for (const w of warnings) {
    const key = `${w.food}::${w.note}`;
    if (!seen.has(key)) {
      seen.set(key, w);
    }
  }
  return Array.from(seen.values()).sort((a, b) => {
    // 高信心優先
    const confOrder = { high: 0, medium: 1, low: 2 };
    return (
      (confOrder[a.confidence as keyof typeof confOrder] ?? 3) -
      (confOrder[b.confidence as keyof typeof confOrder] ?? 3)
    );
  });
}
