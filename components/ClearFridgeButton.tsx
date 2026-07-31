'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X, AlertTriangle, Check, Loader2 } from 'lucide-react';

export function ClearFridgeButton({ count }: { count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 沒東西就不顯示按鈕
  if (count === 0) return null;

  const handleClear = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/food/clear', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || json.error || '清空失敗');
        return;
      }
      setSuccess({ count: json.deletedCount });
      // 1.2 秒後關 modal + 重新整理
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
        router.refresh();
      }, 1200);
    } catch (e) {
      setError('網絡出錯,請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-cocoa-400 hover:text-rose-500 px-2.5 py-1.5 rounded-full hover:bg-rose-50 transition-colors"
        aria-label="清空冰箱"
      >
        <Trash2 size={13} />
        清空
      </button>

      {/* 確認 modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !loading && !success && setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 成功狀態 */}
            {success ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  <Check size={24} className="text-emerald-600" />
                </div>
                <p className="text-sm text-cocoa-600 font-medium">
                  已清空 {success.count} 項食材 🌿
                </p>
                <p className="text-xs text-cocoa-400 mt-1">冰箱清乾淨囉</p>
              </div>
            ) : (
              <>
                {/* 警告圖示 */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={20} className="text-rose-500" />
                  </div>
                  <h2 className="text-base text-cocoa-600 font-medium">確定要清空冰箱嗎？</h2>
                </div>

                <p className="text-sm text-cocoa-500 leading-relaxed mb-1">
                  這會刪除家庭中<strong className="text-rose-600"> 所有 {count} 項食物</strong>記錄。
                </p>
                <p className="text-xs text-cocoa-400 mb-5">
                  操作無法復原。建議先確認食材都用完了,或先記錄好新一批再清。
                </p>

                {error && (
                  <div className="text-xs text-rose-500 mb-3 bg-rose-50 rounded-xl p-2">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={loading}
                    className="flex-1 py-2.5 text-sm text-cocoa-600 bg-cream-100 hover:bg-cream-200 rounded-2xl transition-colors disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleClear}
                    disabled={loading}
                    className="flex-1 py-2.5 text-sm text-white bg-rose-500 hover:bg-rose-600 rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        清空中...
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        確認清空
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
