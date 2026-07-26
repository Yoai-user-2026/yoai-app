'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Camera, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  imageUrl?: string;
}

interface ChatClientProps {
  userName: string;
  initialMessages: Message[];
  memories: Array<{ key: string; value: string }>;
}

export function ChatClient({ userName, initialMessages, memories }: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 自動滾到底
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

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
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      // 壓縮到最大 1024px,提升上傳速度
      const base64 = await compressImage(file);
      await sendMessage('', base64);
    } catch (err) {
      alert('圖片讀取失敗,換一張試試?');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
        <Sparkles size={18} className="text-cocoa-400" />
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
            className={`flex message-enter ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
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
            disabled={uploading || sending}
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
              placeholder="跟 Yoai 說點什麼..."
              rows={1}
              className="w-full px-4 py-2.5 bg-cream-50 rounded-2xl outline-none text-sm text-cocoa-600 placeholder-cocoa-400/60 resize-none max-h-32 focus:ring-2 focus:ring-cocoa-400/30"
              style={{ minHeight: '44px' }}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={sending || (!input.trim() && !uploading)}
            className="w-11 h-11 rounded-2xl bg-cocoa-500 text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** 壓縮圖片到最大 1024px,並轉 base64 */
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
