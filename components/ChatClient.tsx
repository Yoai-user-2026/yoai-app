'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Camera, Sparkles, ThumbsUp, ThumbsDown, MessageSquare, X, Quote, Reply } from 'lucide-react';
import { VoiceInput } from './VoiceInput';
import { BetaChip } from './BetaChip';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  imageUrl?: string;
  feedback?: 'up' | 'down' | null;
  feedbackTextOpen?: boolean;
}

interface ChatClientProps {
  userName: string;
  initialMessages: Message[];
  memories: Array<{ key: string; value: string }>;
}

const DAILY_LIMIT = 30;

export function ChatClient({ userName, initialMessages, memories }: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [usage, setUsage] = useState<{ usedToday: number; remaining: number; limit: number; internal: boolean } | null>(null);
  const [feedbackTextFor, setFeedbackTextFor] = useState<string | null>(null);
  // 引用:選中的某則過去訊息,點引用按鈕時設定
  const [quote, setQuote] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 自動滾到底
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  // 拉取當日用量
  const refreshUsage = async () => {
    try {
      const r = await fetch('/api/usage');
      if (r.ok) {
        const data = await r.json();
        setUsage(data);
      }
    } catch {}
  };

  useEffect(() => {
    refreshUsage();
  }, []);

  const sendMessage = async (text: string, imageBase64?: string) => {
    if (sending) return;
    if (!text.trim() && !imageBase64) return;

    // === 構造送出訊息 ===
    // 如果有引用,格式化成「引述過往 + 新問題」,讓 AI 明確看到上下文
    let finalText = text;
    if (quote && !imageBase64) {
      const quoteText = quote.content;
      const role = quote.role === 'user' ? '用戶' : 'Yoai';
      finalText = `[引述過往對話 — ${role}說的]:\n"${quoteText}"\n\n[我的新問題]:\n${text}`;
    } else if (quote && imageBase64) {
      // 引用 + 圖片:把引述放在圖片訊息前
      const quoteText = quote.content;
      const role = quote.role === 'user' ? '用戶' : 'Yoai';
      finalText = `[引述過往對話 — ${role}說的]:\n"${quoteText}"\n\n${text}`;
    }

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: finalText || '[圖片]',
      createdAt: new Date().toISOString(),
      imageUrl: imageBase64,
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setQuote(null); // 送出後清掉引用
    setSending(true);

    // 加一個 placeholder assistant
    const placeholderId = `temp-bot-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: placeholderId, role: 'assistant', content: '', createdAt: new Date().toISOString() },
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: finalText,
          imageBase64,
        }),
      });

      // 處理 429 rate limit
      if (response.status === 429) {
        const errData = await response.json();
        setMessages((m) =>
          m.map((msg) =>
            msg.id === placeholderId
              ? { ...msg, content: errData.message || '今天的額度用完啦,明天再來 🌿' }
              : msg,
          ),
        );
        refreshUsage();
        return;
      }

      if (!response.ok) throw new Error('Chat API error');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setMessages((m) =>
          m.map((msg) =>
            msg.id === placeholderId ? { ...msg, content: accumulated } : msg,
          ),
        );
      }
    } catch (err) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === placeholderId
            ? { ...msg, content: '嗯... 網路好像不順,等一下再試試看 🍵' }
            : msg,
        ),
      );
    } finally {
      setSending(false);
      refreshUsage();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const base64 = await compressImage(file);
      await sendMessage('', base64);
    } catch (err) {
      alert('圖片讀取失敗,換一張試試?');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 反饋: 👍/👎
  const handleThumbs = async (msgId: string, rating: 1 | -1) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    setMessages((m) =>
      m.map((x) => (x.id === msgId ? { ...x, feedback: rating > 0 ? 'up' : 'down' } : x)),
    );
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'thumbs',
          rating,
          messageContent: msg.content,
        }),
      });
    } catch {}
  };

  // 反饋: 文字
  const handleTextFeedback = async (msgId: string, content: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || !content.trim()) return;
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          content,
          messageContent: msg.content,
        }),
      });
      setFeedbackTextFor(null);
      alert('收到你的反饋了,謝謝 🌿');
    } catch {}
  };

  return (
    // iOS Safari 看得到輸入框修:
    // 之前用 h-dvh — 但 iOS Safari 模式下 dvh 仍包含 URL bar,
    // → 整個 ChatClient 高度 = viewport 高度
    // → header + messages + input 總和超過 viewport
    // → input 被推到 URL bar 後面,用戶看不到(截圖 bug)
    //
    // 改用 fixed inset-0 + 內層 max-w-md 居中:
    // → ChatClient 自己佔滿整個視窗
    // → 內層 flex 計算:header (flex-shrink-0) + messages (flex-1) + input (flex-shrink-0)
    // → input pb-20 給 BottomNav (fixed bottom-0, ~64px) 留位
    <div className="fixed inset-0 z-40 flex justify-center bg-cream-50">
      <div className="w-full max-w-md flex flex-col bg-cream-50">
      {/* Header */}
      <header className="px-5 py-4 bg-white/60 backdrop-blur border-b border-cream-200 flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cocoa-400 to-cocoa-600 flex items-center justify-center text-lg">
          🌿
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-medium text-cocoa-600">Yoai</h1>
            <BetaChip />
          </div>
          <p className="text-xs text-cocoa-400">和 {userName} 在一起</p>
        </div>
        {usage && (
          <div className="text-right">
            {usage.internal ? (
              <>
                <p className="text-xs text-amber-600 font-medium">∞ 內測</p>
                <p className="text-[10px] text-cocoa-400">不限次數</p>
              </>
            ) : (
              <>
                <p className="text-xs text-cocoa-500 font-medium">
                  {usage.remaining}/{usage.limit}
                </p>
                <p className="text-[10px] text-cocoa-400">今日剩餘</p>
              </>
            )}
          </div>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cream-200 to-cream-300 flex items-center justify-center text-2xl">
              🌿
            </div>
            <p className="text-cocoa-500 text-sm leading-relaxed">
              嗨 {userName}~
              <br />
              今天想聊點什麼?想拍照也可以喔 📷
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            } message-enter`}
          >
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cocoa-400 to-cocoa-600 flex items-center justify-center text-sm mr-2 flex-shrink-0 self-end">
                  🌿
                </div>
              )}
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cocoa-500 text-white rounded-br-md'
                    : 'bg-white text-cocoa-600 shadow-soft rounded-bl-md'
                }`}
              >
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="upload"
                    className="rounded-xl mb-2 max-w-full"
                  />
                )}
                {msg.content && <div className="whitespace-pre-wrap break-words">{msg.content}</div>}
                {msg.role === 'assistant' && msg.content === '' && (
                  <div className="flex gap-1 py-1">
                    <span className="w-1.5 h-1.5 bg-cocoa-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-cocoa-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-cocoa-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </div>

            {/* 引用按鈕 — 所有訊息都可引用 */}
            {msg.content && msg.content !== '[圖片]' && (
              <div className={`flex ${msg.role === 'user' ? 'justify-end mr-1' : 'justify-start ml-10'}`}>
                <button
                  onClick={() => {
                    if (quote?.id === msg.id) {
                      setQuote(null);
                    } else {
                      setQuote(msg);
                      setTimeout(() => {
                        const ta = document.querySelector('textarea');
                        ta?.focus();
                      }, 100);
                    }
                  }}
                  className={`mt-1 px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 transition-colors ${
                    quote?.id === msg.id
                      ? 'bg-cocoa-500 text-white'
                      : 'text-cocoa-300 hover:text-cocoa-500 hover:bg-cream-100'
                  }`}
                  aria-label="引用這則訊息"
                >
                  <Quote size={10} />
                  {quote?.id === msg.id ? '取消引用' : '引用'}
                </button>
              </div>
            )}

            {/* 反饋按鈕 — 只在已完成的 assistant 訊息下顯示 */}
            {msg.role === 'assistant' && msg.content && !msg.content.includes('今天的額度') && (
              <div className="ml-10 mt-1 flex items-center gap-1">
                <button
                  onClick={() => handleThumbs(msg.id, 1)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    msg.feedback === 'up'
                      ? 'bg-sage-400/20 text-sage-500'
                      : 'text-cocoa-300 hover:text-sage-500'
                  }`}
                  aria-label="讚"
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  onClick={() => handleThumbs(msg.id, -1)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    msg.feedback === 'down'
                      ? 'bg-rose-300/30 text-rose-400'
                      : 'text-cocoa-300 hover:text-rose-400'
                  }`}
                  aria-label="倒讚"
                >
                  <ThumbsDown size={14} />
                </button>
                <button
                  onClick={() => setFeedbackTextFor(feedbackTextFor === msg.id ? null : msg.id)}
                  className="p-1.5 rounded-lg text-cocoa-300 hover:text-cocoa-500 transition-colors"
                  aria-label="寫反饋"
                >
                  <MessageSquare size={14} />
                </button>

                {feedbackTextFor === msg.id && (
                  <FeedbackTextInput
                    onSubmit={(text) => handleTextFeedback(msg.id, text)}
                    onCancel={() => setFeedbackTextFor(null)}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input
          - flex-shrink-0 確保不被壓縮
          - pb 留位給 BottomNav (fixed bottom-0, ~64px) + iOS safe area
          - max(5rem=80px, env(safe-area)+4rem) 確保兩種情況都覆蓋 */}
      <div className="px-4 py-3 bg-white/80 backdrop-blur border-t border-cream-200 flex-shrink-0" style={{ paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4rem))' }}>
        {/* 引用預覽塊 */}
        {quote && (
          <div className="mb-2 bg-cream-50 border-l-2 border-cocoa-400 rounded-lg p-2 flex items-start gap-2">
            <Quote size={14} className="text-cocoa-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-cocoa-400 mb-0.5">
                引用 {quote.role === 'user' ? '你' : 'Yoai'} 的訊息
              </p>
              <p className="text-xs text-cocoa-500 line-clamp-2 break-words">
                {quote.content.slice(0, 150)}{quote.content.length > 150 ? '...' : ''}
              </p>
            </div>
            <button
              onClick={() => setQuote(null)}
              className="p-1 text-cocoa-300 hover:text-cocoa-500 flex-shrink-0"
              aria-label="取消引用"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending || (usage?.remaining === 0)}
            className="w-11 h-11 rounded-2xl bg-cream-100 text-cocoa-500 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
          >
            <Camera size={20} />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={
                usage?.remaining === 0
                  ? '今天的額度用完啦,明天 0 點重置 🌿'
                  : '跟 Yoai 說點什麼...'
              }
              rows={1}
              disabled={usage?.remaining === 0}
              className="w-full px-4 py-2.5 bg-cream-50 rounded-2xl outline-none text-sm text-cocoa-600 placeholder-cocoa-400/60 resize-none max-h-32 focus:ring-2 focus:ring-cocoa-400/30 disabled:opacity-50"
              style={{ minHeight: '44px' }}
            />
          </div>
          <VoiceInput
            onTranscript={(text) => setInput((prev) => (prev ? prev + ' ' : '') + text)}
            disabled={sending || uploading || usage?.remaining === 0}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={sending || (!input.trim() && !uploading) || usage?.remaining === 0}
            className="w-11 h-11 rounded-2xl bg-cocoa-500 text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

function FeedbackTextInput({
  onSubmit,
  onCancel,
}: {
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  return (
    <div className="ml-2 flex items-center gap-1">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit(text);
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="寫點反饋..."
        autoFocus
        className="px-2 py-1 bg-cream-50 rounded-lg outline-none text-xs text-cocoa-600 w-32 focus:ring-2 focus:ring-cocoa-400/30"
      />
      <button
        onClick={() => onSubmit(text)}
        className="px-2 py-1 bg-cocoa-500 text-white text-xs rounded-lg"
      >
        送出
      </button>
      <button onClick={onCancel} className="p-1 text-cocoa-300">
        <X size={12} />
      </button>
    </div>
  );
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const max = 1024;
        let { width, height } = img;
        if (width > max || height > max) {
          if (width > height) {
            height = (height / width) * max;
            width = max;
          } else {
            width = (width / height) * max;
            height = max;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas error'));
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
