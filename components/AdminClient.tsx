'use client';

import { useEffect, useState } from 'react';
import { Users, MessageSquare, ShoppingBasket, TrendingUp, Star, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Stats {
  totalUsers: number;
  todayActiveUsers: number;
  todayUsage: number;
  weekUsage: number;
  todayFeedbacks: number;
  categoryBreakdown: { category: string; count: number }[];
  totalTokens: { prompt: number; completion: number };
  todayTokens: { prompt: number; completion: number };
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  familyRole: string;
  shareSource: string | null;
  createdAt: string;
  totalUsage: number;
  todayUsage: number;
  feedbackCount: number;
  conversationCount: number;
}

interface FeedbackRow {
  id: string;
  type: string;
  rating: number;
  content: string | null;
  messageContent: string | null;
  userEmail: string;
  userName: string;
  createdAt: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  diet: '🍱 飲食',
  recipe: '🍳 食譜',
  emotion: '💗 情緒',
  cycle: '🌸 週期',
  food: '🥬 食物',
  info: '💡 資訊',
  other: '✨ 其他',
};

export function AdminClient({
  currentUserId,
  initialStats,
}: {
  currentUserId: string;
  initialStats: {
    totalUsers: number;
    todayUsage: number;
    totalFoods: number;
    totalConversations: number;
    totalFeedbacks: number;
  };
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [tab, setTab] = useState<'overview' | 'users' | 'feedbacks'>('overview');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [s, u, f] = await Promise.all([
        fetch('/api/admin/stats').then((r) => r.json()),
        fetch('/api/admin/users').then((r) => r.json()),
        fetch('/api/admin/feedbacks').then((r) => r.json()),
      ]);
      setStats(s);
      setUsers(u.users);
      setFeedbacks(f.feedbacks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refresh = () => {
    setLoading(true);
    fetchData();
  };

  return (
    <div className="px-5 py-4">
      <header className="mb-5">
        <h1 className="text-xl text-cocoa-600 font-medium">📊 內測儀表板</h1>
        <p className="text-xs text-cocoa-400 mt-1">看 Yoai 的真實使用情況 🌿</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-cream-100 rounded-2xl p-1 mb-4">
        {[
          { key: 'overview' as const, label: '總覽', icon: TrendingUp },
          { key: 'users' as const, label: `用戶(${initialStats.totalUsers})`, icon: Users },
          { key: 'feedbacks' as const, label: `反饋(${initialStats.totalFeedbacks})`, icon: MessageSquare },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-xl transition-all ${
              tab === t.key ? 'bg-white text-cocoa-600 shadow-sm' : 'text-cocoa-400'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {loading && !stats ? (
        <p className="text-center text-cocoa-400 py-8">載入中...</p>
      ) : tab === 'overview' ? (
        <OverviewTab stats={stats} initial={initialStats} />
      ) : tab === 'users' ? (
        <UsersTab users={users} currentUserId={currentUserId} />
      ) : (
        <FeedbacksTab feedbacks={feedbacks} />
      )}

      <button
        onClick={refresh}
        className="mt-6 text-xs text-cocoa-400 underline w-full text-center"
      >
        重新整理
      </button>
    </div>
  );
}

function OverviewTab({ stats, initial }: { stats: Stats | null; initial: any }) {
  if (!stats) return null;
  const totalTokens = stats.totalTokens.prompt + stats.totalTokens.completion;
  const todayTokens = stats.todayTokens.prompt + stats.todayTokens.completion;
  // 估算成本(qwen-plus: ¥0.004/千 tokens, qwen-vl-plus: ¥0.008/千 tokens)
  // 簡化用 qwen-plus 價格
  const costEstimate = ((totalTokens / 1000) * 0.004).toFixed(4);

  return (
    <div className="space-y-3">
      {/* 核心指標卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <Card
          icon={<Users size={18} />}
          label="總用戶"
          value={stats.totalUsers}
          hint={`今日活躍 ${stats.todayActiveUsers}`}
          color="cocoa"
        />
        <Card
          icon={<TrendingUp size={18} />}
          label="今日調用"
          value={stats.todayUsage}
          hint={`本週 ${stats.weekUsage}`}
          color="sage"
        />
        <Card
          icon={<ShoppingBasket size={18} />}
          label="食物記錄"
          value={initial.totalFoods}
          hint="家庭共享總數"
          color="rose"
        />
        <Card
          icon={<MessageSquare size={18} />}
          label="對話訊息"
          value={initial.totalConversations}
          hint={`反饋 ${stats.todayFeedbacks} 條`}
          color="cocoa"
        />
      </div>

      {/* Token 用量 */}
      <div className="bg-white rounded-2xl p-4 shadow-soft">
        <h3 className="text-sm font-medium text-cocoa-600 mb-2">💎 Token 消耗(估算)</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-cocoa-400">總計</p>
            <p className="text-lg text-cocoa-600 font-medium">{totalTokens.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-cocoa-400">今日</p>
            <p className="text-lg text-cocoa-600 font-medium">{todayTokens.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-xs text-cocoa-400 mt-3">
          累計成本約 <strong className="text-cocoa-600">¥{costEstimate}</strong>(qwen-plus 單價 ¥0.004/千 token)
        </p>
      </div>

      {/* 分類分布 */}
      {stats.categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-soft">
          <h3 className="text-sm font-medium text-cocoa-600 mb-3">📈 本週話題分布</h3>
          <div className="space-y-2">
            {stats.categoryBreakdown
              .sort((a, b) => b.count - a.count)
              .map((c) => {
                const total = stats.categoryBreakdown.reduce((s, x) => s + x.count, 0);
                const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                return (
                  <div key={c.category} className="flex items-center gap-2">
                    <span className="text-xs text-cocoa-500 w-20 flex-shrink-0">
                      {CATEGORY_LABEL[c.category] || c.category}
                    </span>
                    <div className="flex-1 h-2 bg-cream-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cocoa-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-cocoa-500 w-12 text-right">
                      {c.count} ({pct}%)
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  color: 'cocoa' | 'sage' | 'rose';
}) {
  const colorClass = {
    cocoa: 'bg-cocoa-500/10 text-cocoa-600',
    sage: 'bg-sage-400/20 text-sage-500',
    rose: 'bg-rose-300/30 text-rose-400',
  }[color];

  return (
    <div className="bg-white rounded-2xl p-3 shadow-soft">
      <div className={`inline-flex p-1.5 rounded-lg ${colorClass} mb-1.5`}>{icon}</div>
      <p className="text-2xl font-medium text-cocoa-600">{value}</p>
      <p className="text-xs text-cocoa-500">{label}</p>
      {hint && <p className="text-[10px] text-cocoa-400 mt-1">{hint}</p>}
    </div>
  );
}

function UsersTab({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  if (users.length === 0) {
    return <p className="text-center text-cocoa-400 py-8">還沒有其他用戶</p>;
  }
  return (
    <div className="space-y-2">
      {users.map((u) => {
        const isMe = u.id === currentUserId;
        const usageRate = Math.min(100, Math.round((u.todayUsage / 30) * 100));
        return (
          <div key={u.id} className="bg-white rounded-2xl p-3 shadow-soft">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-cocoa-600 truncate">
                    {u.name || u.email}
                    {isMe && <span className="ml-1.5 text-[10px] text-cocoa-400">(你)</span>}
                  </p>
                  {u.familyRole === 'owner' && (
                    <span className="text-[10px] bg-cocoa-500/10 text-cocoa-600 px-1.5 py-0.5 rounded">
                      主理人
                    </span>
                  )}
                </div>
                <p className="text-xs text-cocoa-400 truncate">{u.email}</p>
                {u.shareSource && (
                  <p className="text-[10px] text-cocoa-400 mt-0.5">
                    來源:{u.shareSource}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-cocoa-400">註冊</p>
                <p className="text-xs text-cocoa-500">
                  {new Date(u.createdAt).toLocaleDateString('zh-Hant')}
                </p>
              </div>
            </div>

            {/* 今日用量條 */}
            <div className="mb-2">
              <div className="flex justify-between text-[10px] text-cocoa-400 mb-1">
                <span>今日用量</span>
                <span>
                  {u.todayUsage} / 30 ({usageRate}%)
                </span>
              </div>
              <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    usageRate > 80 ? 'bg-rose-400' : 'bg-cocoa-500'
                  }`}
                  style={{ width: `${usageRate}%` }}
                />
              </div>
            </div>

            {/* 統計 */}
            <div className="flex gap-3 text-[10px] text-cocoa-400">
              <span>對話 {u.conversationCount}</span>
              <span>總調用 {u.totalUsage}</span>
              <span>反饋 {u.feedbackCount}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FeedbacksTab({ feedbacks }: { feedbacks: FeedbackRow[] }) {
  if (feedbacks.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare size={36} className="mx-auto text-cocoa-300 mb-2" />
        <p className="text-cocoa-500 text-sm">還沒有反饋</p>
        <p className="text-cocoa-400 text-xs mt-1">好友回應後按讚/倒讚/寫反饋就會出現在這</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {feedbacks.map((f) => (
        <div key={f.id} className="bg-white rounded-2xl p-3 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {f.type === 'thumbs' ? (
                f.rating > 0 ? (
                  <ThumbsUp size={16} className="text-sage-500" />
                ) : (
                  <ThumbsDown size={16} className="text-rose-400" />
                )
              ) : (
                <MessageSquare size={16} className="text-cocoa-500" />
              )}
              <span className="text-xs text-cocoa-500">
                {f.userName}
                {f.type === 'thumbs' && (
                  <span className="text-cocoa-400 ml-1.5">
                    {f.rating > 0 ? '覺得這個回應不錯' : '覺得這個回應不太好'}
                  </span>
                )}
              </span>
            </div>
            <span className="text-[10px] text-cocoa-400">
              {new Date(f.createdAt).toLocaleString('zh-Hant', { hour12: false }).slice(5, 16)}
            </span>
          </div>
          {f.messageContent && (
            <p className="text-xs text-cocoa-500 bg-cream-100/50 rounded-xl px-3 py-2 mb-2 italic">
              {f.messageContent.slice(0, 200)}
              {f.messageContent.length > 200 && '...'}
            </p>
          )}
          {f.content && (
            <p className="text-sm text-cocoa-700 leading-relaxed">{f.content}</p>
          )}
        </div>
      ))}
    </div>
  );
}
