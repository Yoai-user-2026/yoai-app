'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, FileLock } from 'lucide-react';

export function HealthConsent() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAgree = async () => {
    if (!agreed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health/consent', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || '提交失敗,請稍後再試');
        return;
      }
      router.refresh();
    } catch (e) {
      setError('網絡出錯,請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 免責聲明區塊 */}
      <div className="bg-rose-50/60 border border-rose-100 rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 bg-rose-100 rounded-full flex items-center justify-center">
            <Shield size={18} className="text-rose-500" />
          </div>
          <h2 className="text-base text-rose-700 font-medium">使用前請先了解</h2>
        </div>

        <div className="space-y-2 text-xs text-cocoa-600 leading-relaxed">
          <p>
            <strong>Yoai 給的是飲食建議,不是醫療建議。</strong>
            嚴重的健康問題、診斷、用藥,請諮詢專業醫療人員。
          </p>
          <p>
            <strong>你的健康資料怎麼存:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li>用 AES-256 加密,只有你能解密</li>
              <li>連你家庭的成員都看不到(完全個人化)</li>
              <li>不會賣給第三方、不會用於廣告</li>
              <li>你可以隨時一鍵永久刪除</li>
            </ul>
          </p>
          <p>
            <strong>上傳的病歷 / 醫生紙:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li>存到 Vercel Blob(加密連線)</li>
              <li>只有拿到檔案 URL 的人能打開(URL 隨機不可猜)</li>
              <li>刪除時會一併刪掉原件</li>
            </ul>
          </p>
          <p className="text-rose-600">
            <strong>⚠️ 重要:</strong>如果你的體檢資料涉及敏感疾病(精神疾病、HIV 等),
            建議你只輸入「醫生建議的數字」就好,不要上傳原始報告。
          </p>
        </div>
      </div>

      {/* 同意勾選 */}
      <div className="bg-white rounded-2xl p-4 shadow-soft space-y-3">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 accent-cocoa-500"
          />
          <span className="text-sm text-cocoa-600 leading-relaxed">
            我已了解上述說明,同意 Yoai 儲存並使用我的健康資料來提供個人化建議。
            我可以隨時撤回同意並永久刪除資料。
          </span>
        </label>

        {error && (
          <p className="text-xs text-rose-500 bg-rose-50 rounded-xl p-2">{error}</p>
        )}

        <button
          onClick={handleAgree}
          disabled={!agreed || loading}
          className="w-full bg-cocoa-500 hover:bg-cocoa-600 text-white rounded-2xl py-3 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              提交中...
            </>
          ) : (
            <>
              <FileLock size={14} />
              我同意,開始使用
            </>
          )}
        </button>
      </div>
    </div>
  );
}
