'use client';

import { useState } from 'react';
import { Link2, Copy, Check, Plus, X } from 'lucide-react';

interface InviteGeneratorProps {
  inviteCode: string;
}

const SAVED_LINKS_KEY = 'yoai_saved_invite_links';

export function InviteGenerator({ inviteCode }: InviteGeneratorProps) {
  const [source, setSource] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [savedLinks, setSavedLinks] = useState<Array<{ name: string; source: string; createdAt: string }>>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SAVED_LINKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yoai-app.vercel.app';

  const buildLink = (sourceName: string) => {
    const params = new URLSearchParams();
    if (sourceName) params.set('source', sourceName);
    params.set('invite', inviteCode);
    return `${baseUrl}/login?${params.toString()}`;
  };

  const handleGenerate = () => {
    if (!source.trim()) return;
    const name = source.trim();
    const link = buildLink(name);
    copyToClipboard(link, name);

    // 儲存到 localStorage
    const newLinks = [
      { name, source: name, createdAt: new Date().toISOString() },
      ...savedLinks.filter((l) => l.source !== name),
    ].slice(0, 10);
    setSavedLinks(newLinks);
    localStorage.setItem(SAVED_LINKS_KEY, JSON.stringify(newLinks));
    setSource('');
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const removeLink = (name: string) => {
    const newLinks = savedLinks.filter((l) => l.source !== name);
    setSavedLinks(newLinks);
    localStorage.setItem(SAVED_LINKS_KEY, JSON.stringify(newLinks));
  };

  return (
    <section className="bg-white rounded-2xl p-4 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={18} className="text-cocoa-500" />
        <h3 className="text-sm font-medium text-cocoa-600">邀請連結生成器</h3>
      </div>

      <p className="text-xs text-cocoa-400 mb-3">
        為每個朋友取個名字(用來追蹤誰從哪來),自動生成獨立連結
      </p>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="例:小美 / ray / 老同事"
          className="flex-1 px-3 py-2 bg-cream-50 rounded-xl outline-none text-sm text-cocoa-600 placeholder-cocoa-400/60 focus:ring-2 focus:ring-cocoa-400/30"
        />
        <button
          onClick={handleGenerate}
          disabled={!source.trim()}
          className="px-3 py-2 bg-cocoa-500 text-white rounded-xl text-sm font-medium active:scale-95 transition-transform disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* 已生成的連結 */}
      {savedLinks.length > 0 && (
        <div className="space-y-2 mt-3">
          <p className="text-xs text-cocoa-500 font-medium">最近生成的連結</p>
          {savedLinks.map((link) => {
            const fullLink = buildLink(link.source);
            const isCopied = copied === link.source;
            return (
              <div
                key={link.source}
                className="flex items-center gap-2 bg-cream-50 rounded-xl px-3 py-2"
              >
                <span className="text-xs text-cocoa-500 font-medium min-w-0 flex-shrink-0 max-w-[80px] truncate">
                  {link.name}
                </span>
                <span className="text-[10px] text-cocoa-400 truncate flex-1 min-w-0">
                  {fullLink.replace(/^https?:\/\//, '')}
                </span>
                <button
                  onClick={() => copyToClipboard(fullLink, link.source)}
                  className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                    isCopied
                      ? 'bg-sage-400/20 text-sage-500'
                      : 'text-cocoa-400 hover:bg-cocoa-500/10'
                  }`}
                  aria-label="複製"
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button
                  onClick={() => removeLink(link.source)}
                  className="p-1.5 text-cocoa-300 hover:text-rose-400 flex-shrink-0"
                  aria-label="移除"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
