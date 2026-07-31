'use client';

import { useState } from 'react';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  PawPrint,
  Leaf,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  RotateCcw,
  Info,
} from 'lucide-react';

// 與 FoodList 對齊的分類 emoji
const CATEGORY_EMOJI: Record<string, string> = {
  蔬菜: '🥬',
  水果: '🍎',
  肉類: '🥩',
  海鮮: '🐟',
  乳製品: '🥛',
  蛋類: '🥚',
  主食: '🍚',
  零食: '🍪',
  調味料: '🧂',
  飲品: '🧃',
  其他: '📦',
};

const SAFETY_TYPE_LABEL: Record<string, string> = {
  cooking: '烹飪注意',
  preparation: '處理注意',
  storage: '保存注意',
  pregnancy: '孕婦注意',
  infant: '嬰幼兒注意',
  allergy: '過敏注意',
  other: '注意',
};

interface SafetyWarning {
  food: string;
  note: string;
  sources: string[];
  confidence: string;
  type: string;
}

interface PetDanger {
  food: string;
  danger: string;
  note?: string;
}

interface SummaryData {
  empty: boolean;
  message?: string;
  generated_at?: string;
  data_period_days?: number;
  total_items?: number;
  unique_ingredients_matched?: number;
  unique_ingredients_unknown?: number;
  category_breakdown?: Record<string, number>;
  safety_warnings?: SafetyWarning[];
  pet_dangers?: PetDanger[];
  allergens_in_pantry?: string[];
  unknown_foods?: string[];
  suggestions?: {
    add_to_knowledge_base?: string | null;
  };
}

const CONFIDENCE_DOT: Record<string, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-400',
  low: 'bg-cocoa-300',
};

const SOURCE_LABEL: Record<string, string> = {
  usda: 'USDA',
  codex: 'Codex',
  aspca: 'ASPCA',
  cfst: '香港食安中心',
  twfda: '台灣食藥署',
  cn_food_table: '中國食物成分表',
  nhs_allergens: 'NHS',
};

function formatSource(src: string): string {
  return SOURCE_LABEL[src] || src;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-Hant', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function FoodSummary({ initialData }: { initialData?: SummaryData | null }) {
  const [data, setData] = useState<SummaryData | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedWarnings, setExpandedWarnings] = useState<Set<string>>(new Set());

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/food/summary', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || json.error || '生成失敗，請稍後再試');
        return;
      }
      setData(json.data);
    } catch (e) {
      setError('網絡出錯，請檢查連線後再試');
    } finally {
      setLoading(false);
    }
  };

  // === 空狀態: 還沒生成過 ===
  if (!data && !loading) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-cream-100 to-cream-50 rounded-3xl p-6 border border-cocoa-100">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={20} className="text-amber-500" />
            <h2 className="text-base text-cocoa-600 font-medium">食材摘要</h2>
          </div>
          <p className="text-sm text-cocoa-500 leading-relaxed mb-1">
            根據你和家人最近紀錄的食材,Yoai 會自動比對香港 / 國際食品安全資料庫,告訴你:
          </p>
          <ul className="text-sm text-cocoa-500 space-y-1.5 mt-3 mb-5">
            <li className="flex items-start gap-2">
              <span className="text-rose-400 mt-0.5">⚠</span>
              <span>哪些食物有烹飪或處理上的注意</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-400 mt-0.5">🐱</span>
              <span>對家中貓狗有沒有禁忌</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">🌿</span>
              <span>常見致敏原是否在家中食材出現</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cocoa-400 mt-0.5">📦</span>
              <span>食材分類概覽</span>
            </li>
          </ul>
          <button
            onClick={generate}
            className="w-full bg-cocoa-500 hover:bg-cocoa-600 text-white rounded-2xl py-3 text-sm font-medium transition-colors shadow-soft"
          >
            🔍 為我分析家裡的食材
          </button>
          <p className="text-[11px] text-cocoa-400 text-center mt-3 leading-relaxed">
            分析範圍: 過去 60 天的家庭食材紀錄
            <br />
            資料來源: USDA / Codex / ASPCA / 香港食安中心 / 台灣食藥署
          </p>
        </div>
      </div>
    );
  }

  // === Loading ===
  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-soft flex flex-col items-center">
        <Loader2 size={32} className="text-cocoa-400 animate-spin mb-3" />
        <p className="text-sm text-cocoa-500">正在比對食材資料庫...</p>
        <p className="text-xs text-cocoa-400 mt-1">約需 2-3 秒</p>
      </div>
    );
  }

  // === 錯誤 ===
  if (error) {
    return (
      <div className="space-y-3">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-2">
          <AlertTriangle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-rose-700 font-medium">生成失敗</p>
            <p className="text-xs text-rose-600 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={generate}
          className="w-full bg-cocoa-500 hover:bg-cocoa-600 text-white rounded-2xl py-3 text-sm font-medium transition-colors"
        >
          <RotateCcw size={14} className="inline mr-1" />
          重試
        </button>
      </div>
    );
  }

  if (!data) return null;

  // === 空資料: 沒食物紀錄 ===
  if (data.empty) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-soft text-center">
        <div className="text-4xl mb-3">🧺</div>
        <p className="text-sm text-cocoa-500 mb-1">{data.message || '還沒有食材紀錄'}</p>
        <p className="text-xs text-cocoa-400">先去「聊聊」傳幾張食物照片,讓 Yoai 幫你記錄</p>
      </div>
    );
  }

  // === 完整結果 ===
  const total = data.total_items || 0;
  const matched = data.unique_ingredients_matched || 0;
  const unknown = data.unique_ingredients_unknown || 0;
  const cats = data.category_breakdown || {};
  const catEntries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const maxCatCount = Math.max(...catEntries.map(([, v]) => v), 1);
  const warnings = data.safety_warnings || [];
  const pets = data.pet_dangers || [];
  const allergens = data.allergens_in_pantry || [];
  const unknowns = data.unknown_foods || [];
  const suggestion = data.suggestions?.add_to_knowledge_base;

  // 把同一個食材的多條警告合在一起,變成一張卡
  const groupedWarnings: Array<{
    food: string;
    emoji: string;
    summary: string;
    notes: Array<{ text: string; sources: string[] }>;
    sources: string[];
  }> = (() => {
    const map = new Map<
      string,
      { notes: Array<{ text: string; sources: string[] }>; sources: Set<string> }
    >();
    for (const w of warnings) {
      const existing = map.get(w.food);
      if (existing) {
        existing.notes.push({ text: w.note, sources: w.sources || [] });
        for (const s of w.sources || []) existing.sources.add(s);
      } else {
        map.set(w.food, {
          notes: [{ text: w.note, sources: w.sources || [] }],
          sources: new Set(w.sources || []),
        });
      }
    }
    return Array.from(map.entries()).map(([food, data]) => {
      // 預設用食材 emoji (無分類時用 🥬)
      const emoji = '🥬';
      // summary = 第一條 note 的 text (截到 60 字)
      const summaryText = data.notes[0]?.text || '';
      const summary =
        summaryText.length > 60 ? summaryText.slice(0, 60) + '…' : summaryText;
      return {
        food,
        emoji,
        summary,
        notes: data.notes,
        sources: Array.from(data.sources),
      };
    });
  })();

  const toggleWarningGroup = (food: string) => {
    setExpandedWarnings((prev) => {
      const next = new Set(prev);
      if (next.has(food)) next.delete(food);
      else next.add(food);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* 標題 + 重新生成 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" />
          <h2 className="text-base text-cocoa-600 font-medium">食材摘要</h2>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="text-xs text-cocoa-500 hover:text-cocoa-700 flex items-center gap-1 px-2 py-1 rounded-full hover:bg-cream-100"
        >
          <RotateCcw size={12} />
          重新整理
        </button>
      </div>

      {/* 概覽 */}
      <div className="bg-white rounded-2xl p-4 shadow-soft">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl text-cocoa-600 font-medium">{total}</div>
            <div className="text-[11px] text-cocoa-400 mt-0.5">總食材數</div>
          </div>
          <div className="border-l border-r border-cream-100">
            <div className="text-2xl text-emerald-600 font-medium">{matched}</div>
            <div className="text-[11px] text-cocoa-400 mt-0.5">已收錄</div>
          </div>
          <div>
            <div className="text-2xl text-cocoa-400 font-medium">{unknown}</div>
            <div className="text-[11px] text-cocoa-400 mt-0.5">未收錄</div>
          </div>
        </div>
        <p className="text-[10px] text-cocoa-400 text-center mt-3">
          {formatTime(data.generated_at)} · 分析過去 {data.data_period_days || 60} 天紀錄
        </p>
      </div>

      {/* 類別分佈 */}
      {catEntries.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-soft">
          <h3 className="text-sm text-cocoa-600 font-medium mb-3 flex items-center gap-1.5">
            <Leaf size={14} className="text-emerald-500" />
            類別分佈
          </h3>
          <div className="space-y-2.5">
            {catEntries.map(([cat, count]) => {
              const pct = (count / maxCatCount) * 100;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-cocoa-500 flex items-center gap-1.5">
                      <span className="text-base">{CATEGORY_EMOJI[cat] || '📦'}</span>
                      {cat}
                    </span>
                    <span className="text-xs text-cocoa-400">{count}</span>
                  </div>
                  <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cocoa-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 安全注意 */}
      {warnings.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
          <h3 className="text-sm text-cocoa-600 font-medium mb-3 flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-amber-500" />
            食材注意 ({groupedWarnings.length} 種)
          </h3>
          <div className="space-y-2">
            {groupedWarnings.map((g) => {
              const expanded = expandedWarnings.has(g.food);
              return (
                <div
                  key={g.food}
                  className="bg-white rounded-xl border border-amber-100/60 overflow-hidden"
                >
                  <button
                    onClick={() => toggleWarningGroup(g.food)}
                    className="w-full px-3 py-2.5 text-left flex items-start gap-2"
                  >
                    <span className="text-base flex-shrink-0 mt-0.5">{g.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-cocoa-600 font-medium mb-0.5">
                        {g.food}
                      </div>
                      <div className="text-xs text-cocoa-500 leading-relaxed line-clamp-2">
                        {g.summary}
                      </div>
                    </div>
                    <div className="flex-shrink-0 mt-1 text-cocoa-400">
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-3 pb-3 border-t border-amber-100/40 pt-2 space-y-1.5">
                      {g.notes.map((n, i) => (
                        <p key={i} className="text-xs text-cocoa-500 leading-relaxed">
                          {n.text}
                        </p>
                      ))}
                      {g.sources.length > 0 && (
                        <p className="text-[10px] text-cocoa-400 pt-1">
                          來源: {g.sources.map(formatSource).join(' · ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 寵物禁忌 */}
      {pets.length > 0 && (
        <div className="bg-rose-100/60 border-2 border-rose-200 rounded-2xl p-4">
          <h3 className="text-sm text-rose-700 font-medium mb-2 flex items-center gap-1.5">
            <PawPrint size={14} />
            寵物禁忌 ({pets.length})
          </h3>
          <p className="text-[11px] text-rose-600 mb-3">
            你家有養貓狗嗎? 這些食材要特別注意 ⚠️
          </p>
          <div className="space-y-2">
            {pets.map((p, idx) => (
              <div key={idx} className="bg-white rounded-xl p-3 border border-rose-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-cocoa-600 font-medium">{p.food}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-rose-500 text-white rounded">
                    危險
                  </span>
                </div>
                <p className="text-xs text-cocoa-500">{p.danger}</p>
                {p.note && <p className="text-[11px] text-cocoa-400 mt-1">💡 {p.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 常見致敏原 */}
      {allergens.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4">
          <h3 className="text-sm text-amber-700 font-medium mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} />
            常見致敏原 ({allergens.length})
          </h3>
          <p className="text-[11px] text-amber-700 mb-3">
            家中有對這些過敏的成員嗎? 提醒一下家人留意
          </p>
          <div className="flex flex-wrap gap-2">
            {allergens.map((a) => (
              <span
                key={a}
                className="px-2.5 py-1 bg-white text-amber-700 text-xs rounded-full border border-amber-200"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 未收錄食材 */}
      {unknowns.length > 0 && (
        <div className="bg-cream-100/60 border border-cream-200 rounded-2xl p-4">
          <h3 className="text-sm text-cocoa-500 font-medium mb-2 flex items-center gap-1.5">
            <HelpCircle size={14} />
            尚未收錄 ({unknowns.length})
          </h3>
          <p className="text-[11px] text-cocoa-400 mb-3">
            Yoai 還在學習這些食材,會在之後版本加入
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unknowns.map((u) => (
              <span
                key={u}
                className="px-2 py-0.5 bg-white text-cocoa-500 text-xs rounded-full"
              >
                {u}
              </span>
            ))}
          </div>
          {suggestion && (
            <p className="text-[10px] text-cocoa-400 mt-3 leading-relaxed">
              💡 {suggestion}
            </p>
          )}
        </div>
      )}

      {/* 全綠燈 */}
      {warnings.length === 0 && pets.length === 0 && allergens.length === 0 && (
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">🌿</div>
          <p className="text-sm text-emerald-700 font-medium">沒有特別需要注意的</p>
          <p className="text-xs text-cocoa-500 mt-1">
            目前的食材看起來都安全放心,有需要再隨時查看
          </p>
        </div>
      )}

      {/* 底部說明 */}
      <div className="bg-cream-50 rounded-2xl p-3 flex items-start gap-2">
        <Info size={14} className="text-cocoa-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-cocoa-400 leading-relaxed">
          摘要只供參考,不取代專業營養師 / 獸醫 / 醫療建議。具體食品安全問題以香港食安中心、ASPCA 等官方資料為準。
        </p>
      </div>
    </div>
  );
}
