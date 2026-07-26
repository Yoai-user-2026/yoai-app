'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Camera, Sparkles, ThumbsUp, ThumbsDown, MessageSquare, X } from 'lucide-react';

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
  const [usage, setUsage] = useState<{ usedToday: number; remaining: number; limit: number } | null>(null);
  const [feedbackTextFor, setFeedbackTextFor] = useState<string | null>(null);
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

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text || '[圖片]',
      createdAt: new Date().toISOString(),
      imageUrl: imageBase64,
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
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
          message: text,
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
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="px-5 py-4 bg-white/60 backdrop-blur border-b border-cream-200 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cocoa-400 to-cocoa-600 flex items-center justify-center text-lg">
          🌿
        </div>
        <div className="flex-1">
          <h1 className="text-base font-medium text-cocoa-600">Yoai</h1>
          <p className="text-xs text-cocoa-400">和 {userName} 在一起</p>
        </div>
        {usage && (
          <div className="text-right">
            <p className="text-xs text-cocoa-500 font-medium">
              {usage.remaining}/{usage.limit}
            </p>
            <p className="text-[10px] text-cocoa-400">今日剩餘</p>
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

      {/* Input */}
      <div className="px-4 py-3 bg-white/80 backdrop-blur border-t border-cream-200">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
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
