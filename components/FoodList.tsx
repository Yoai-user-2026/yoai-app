'use client';

import { ShoppingBasket, Trash2 } from 'lucide-react';

interface FoodItem {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  imageUrl: string | null;
  uploadedBy: string;
  createdAt: string;
}

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

export function FoodList({ foods }: { foods: FoodItem[] }) {
  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這筆嗎?')) return;
    try {
      await fetch(`/api/food/${id}`, { method: 'DELETE' });
      // 簡單刷新
      window.location.reload();
    } catch {
      alert('刪除失敗');
    }
  };

  if (foods.length === 0) {
    return (
      <div className="text-center py-16 bg-cream-100/50 rounded-3xl">
        <ShoppingBasket size={36} className="mx-auto text-cocoa-400 mb-3" />
        <p className="text-cocoa-500 text-sm">目前還沒有食物記錄</p>
        <p className="text-cocoa-400 text-xs mt-1">去聊天傳張照片,Yoai 會自動整理</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {foods.map((food) => (
        <div
          key={food.id}
          className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-soft"
        >
          {food.imageUrl ? (
            <img
              src={food.imageUrl}
              alt={food.name}
              className="w-14 h-14 rounded-xl object-cover bg-cream-100"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-cream-100 flex items-center justify-center text-2xl">
              {CATEGORY_EMOJI[food.category || '其他'] || '📦'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-cocoa-600 text-sm font-medium truncate">
                {food.name}
              </span>
              <span className="text-cocoa-400 text-xs flex-shrink-0">
                {food.quantity}
                {food.unit || ''}
              </span>
            </div>
            <p className="text-xs text-cocoa-400 mt-0.5">
              {food.uploadedBy} · {new Date(food.createdAt).toLocaleDateString('zh-Hant')}
            </p>
          </div>
          <button
            onClick={() => handleDelete(food.id)}
            className="p-2 text-cocoa-300 hover:text-rose-400 transition-colors"
            aria-label="刪除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
