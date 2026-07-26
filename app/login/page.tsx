'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 注意:auth.js 用 FormData 提交,所有 undefined 會被轉成字符串 "undefined"
      // 所以永遠不要傳 undefined,要麼不傳該字段,要麼傳空字符串
      const trimmedInvite = inviteCode?.trim() || '';
      const credentials: Record<string, any> = {
        email,
        password,
        mode,
      };
      if (mode === 'register') {
        credentials.name = name || '';
        credentials.inviteCode = trimmedInvite; // 空字串而非 undefined
      }

      const result = await signIn('credentials', {
        ...credentials,
        redirect: false,
      });

      if (result?.error) {
        // Auth.js 會把 CredentialsError 包裝成 "CredentialsSignin" 或 "Configuration"
        const errCode = (result as any)?.code || result.error;
        let msg = '';
        if (errCode === 'CredentialsSignin') {
          msg = mode === 'register'
            ? '註冊失敗:Email 可能已被使用、密碼太短(至少 6 位)或邀請碼無效'
            : '登入失敗:帳號或密碼錯誤';
        } else if (typeof errCode === 'string' && errCode.includes('註冊失敗')) {
          // 從後端拋出的具體錯誤
          msg = errCode;
        } else {
          msg = `認證錯誤 (${errCode}),請重試或聯絡管理員`;
        }
        setError(msg);
        console.error('[login] 認證失敗:', errCode, result);
      } else {
        router.push('/chat');
        router.refresh();
      }
    } catch (err: any) {
      console.error('[login] 異常:', err);
      setError(`發生錯誤: ${err?.message || '請稍後再試'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-cream-50 to-cream-100">
      {/* Logo 區 */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-cocoa-400 to-cocoa-600 flex items-center justify-center shadow-soft">
          <span className="text-3xl">🌿</span>
        </div>
        <h1 className="text-3xl font-serif text-cocoa-600 tracking-wide">Yoai</h1>
        <p className="mt-2 text-sm text-cocoa-500">在細微處,陪你過好每一天</p>
      </div>

      {/* 表單卡片 */}
      <div className="w-full max-w-sm bg-white/80 backdrop-blur rounded-3xl p-6 shadow-soft">
        {/* 分頁切換 */}
        <div className="flex gap-1 bg-cream-100 rounded-2xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-sm rounded-xl transition-all ${
              mode === 'login' ? 'bg-white text-cocoa-600 shadow-sm' : 'text-cocoa-400'
            }`}
          >
            登入
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 text-sm rounded-xl transition-all ${
              mode === 'register' ? 'bg-white text-cocoa-600 shadow-sm' : 'text-cocoa-400'
            }`}
          >
            註冊
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="怎麼稱呼你?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-cream-50 rounded-2xl outline-none text-cocoa-600 placeholder-cocoa-400/60 focus:ring-2 focus:ring-cocoa-400/30"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-cream-50 rounded-2xl outline-none text-cocoa-600 placeholder-cocoa-400/60 focus:ring-2 focus:ring-cocoa-400/30"
          />
          <input
            type="password"
            placeholder="密碼(至少 6 位)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 bg-cream-50 rounded-2xl outline-none text-cocoa-600 placeholder-cocoa-400/60 focus:ring-2 focus:ring-cocoa-400/30"
          />
          {mode === 'register' && (
            <input
              type="text"
              placeholder="家庭邀請碼(選填,留空會自動建立新家庭)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full px-4 py-3 bg-cream-50 rounded-2xl outline-none text-cocoa-600 placeholder-cocoa-400/60 focus:ring-2 focus:ring-cocoa-400/30"
            />
          )}

          {error && (
            <p className="text-sm text-rose-400 px-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cocoa-500 text-white rounded-2xl font-medium hover:bg-cocoa-600 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? '處理中...' : mode === 'login' ? '登入' : '建立帳號'}
          </button>
        </form>

        <p className="mt-4 text-xs text-center text-cocoa-400">
          {mode === 'register' ? '註冊即代表同意 Yoai 用溫暖的方式陪伴你 🌿' : '忘記密碼的話,先聯絡管理員重設'}
        </p>
      </div>
    </main>
  );
}
