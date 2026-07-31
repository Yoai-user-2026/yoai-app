'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBasket, Trash2, Pencil, X, Check, Loader2, Plus, Minus } from 'lucide-react';

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

export function FoodList({ foods, onChanged }: { foods: FoodItem[]; onChanged?: () => void }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FoodItem | null>(null);

  const handleChanged = () => {
    if (onChanged) onChanged();
    else router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這筆嗎?')) return;
    try {
      await fetch(`/api/food/${id}`, { method: 'DELETE' });
      handleChanged();
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
        <FoodRow
          key={food.id}
          food={food}
          onEdit={() => setEditing(food)}
          onDelete={() => handleDelete(food.id)}
        />
      ))}

      {editing && (
        <EditFoodModal
          food={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            handleChanged();
          }}
        />
      )}
    </div>
  );
}

function FoodRow({
  food,
  onEdit,
  onDelete,
}: {
  food: FoodItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-soft">
      {food.imageUrl ? (
        <img
          src={food.imageUrl}
          alt={food.name}
          className="w-14 h-14 rounded-xl object-cover bg-cream-100 flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-cream-100 flex items-center justify-center text-2xl flex-shrink-0">
          {CATEGORY_EMOJI[food.category || '其他'] || '📦'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-cocoa-600 text-sm font-medium truncate">
            {food.name}
          </span>
          <span className="text-cocoa-500 text-xs flex-shrink-0">
            ×{food.quantity}
            {food.unit || ''}
          </span>
        </div>
        <p className="text-xs text-cocoa-400 mt-0.5">
          {food.uploadedBy} · {new Date(food.createdAt).toLocaleDateString('zh-Hant')}
        </p>
      </div>
      <button
        onClick={onEdit}
        className="p-2 text-cocoa-300 hover:text-cocoa-600 transition-colors"
        aria-label="編輯"
      >
        <Pencil size={15} />
      </button>
      <button
        onClick={onDelete}
        className="p-2 text-cocoa-300 hover:text-rose-400 transition-colors"
        aria-label="刪除"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function EditFoodModal({
  food,
  onClose,
  onSaved,
}: {
  food: FoodItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(food.name);
  const [quantity, setQuantity] = useState(food.quantity);
  const [unit, setUnit] = useState(food.unit || '');
  const [category, setCategory] = useState(food.category || '其他');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adjust = (delta: number) => {
    setQuantity((q) => Math.max(0, Math.min(9999, q + delta)));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('名稱不能空');
      return;
    }
    if (quantity < 0) {
      setError('數量不能是負數');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/food/${food.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          quantity,
          unit: unit.trim() || null,
          category: category || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || '儲存失敗');
        return;
      }
      onSaved();
    } catch {
      setError('網絡出錯');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`確定要刪除「${food.name}」嗎?`)) return;
    try {
      await fetch(`/api/food/${food.id}`, { method: 'DELETE' });
      onSaved();
    } catch {
      alert('刪除失敗');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={() => !loading && onClose()}
    >
      <div
        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base text-cocoa-600 font-medium flex items-center gap-2">
            <Pencil size={16} />
            編輯食物
          </h2>
          <button onClick={onClose} className="text-cocoa-400 hover:text-cocoa-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* 縮圖 */}
          {food.imageUrl && (
            <img
              src={food.imageUrl}
              alt={food.name}
              className="w-full h-32 object-cover rounded-2xl bg-cream-100"
            />
          )}

          {/* 名稱 */}
          <div>
            <label className="text-xs text-cocoa-500 mb-1 block">名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
            />
          </div>

          {/* 數量 + 單位 (stepper 為主,輸入為輔) */}
          <div>
            <label className="text-xs text-cocoa-500 mb-1 block">數量</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjust(-1)}
                disabled={quantity <= 0}
                className="w-10 h-10 flex-shrink-0 bg-cream-100 hover:bg-cream-200 rounded-xl text-cocoa-600 flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
                aria-label="減一"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const v = parseInt(e.target.value || '0', 10);
                  if (!isNaN(v)) setQuantity(Math.max(0, Math.min(9999, v)));
                }}
                min={0}
                max={9999}
                className="flex-1 min-w-0 px-3 py-2 text-sm text-center border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
              />
              <button
                onClick={() => adjust(1)}
                className="w-10 h-10 flex-shrink-0 bg-cream-100 hover:bg-cream-200 rounded-xl text-cocoa-600 flex items-center justify-center active:scale-95 transition-transform"
                aria-label="加一"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="單位 (選填, e.g. 個/盒/kg)"
                maxLength={20}
                className="flex-1 px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
              />
            </div>
          </div>

          {/* 分類 */}
          <div>
            <label className="text-xs text-cocoa-500 mb-1 block">分類</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
            >
              {Object.keys(CATEGORY_EMOJI).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_EMOJI[cat]} {cat}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-rose-500 bg-rose-50 rounded-xl p-2">{error}</p>
          )}

          {/* 按鈕 */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-3 py-2.5 text-sm text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 text-sm text-cocoa-600 bg-cream-100 hover:bg-cream-200 rounded-2xl disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-2.5 text-sm text-white bg-cocoa-500 hover:bg-cocoa-600 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              儲存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
