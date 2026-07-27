'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

const LANGUAGES = [
  { code: 'zh-CN', label: '普通話', flag: '🌐' },
  { code: 'zh-HK', label: '粵語', flag: '🌐' },
  { code: 'en-US', label: 'English', flag: '🌐' },
];

/**
 * 語音輸入元件 — 用瀏覽器內建 Web Speech API
 * 支援普通話 / 粵語 / 英文,免費、無需 API key
 *
 * 用法:
 *   <VoiceInput onTranscript={(text) => setInput(text)} />
 *
 * 瀏覽器相容性:
 *   ✅ Chrome (Android + Desktop) - 用 Google Speech
 *   ✅ Safari (iOS + macOS) - 用 Apple Dictation
 *   ❌ 舊版瀏覽器 - 不顯示按鈕
 */
export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [lang, setLang] = useState('zh-CN');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // 檢查瀏覽器支援
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setIsSupported(false);
    }
  }, []);

  // 卸載時停止錄音
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const startListening = () => {
    setError(null);
    setInterim('');

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError('這個瀏覽器不支援語音輸入,試 Chrome 或 Safari');
      return;
    }

    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) setInterim(interimTranscript);
      if (finalTranscript) {
        onTranscript(finalTranscript);
        setInterim('');
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[voice] error:', event.error);
      if (event.error === 'no-speech') {
        setError('沒聽到聲音,再試一次?');
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('請到瀏覽器設定允許麥克風權限');
      } else if (event.error === 'network') {
        setError('網路不順,語音需要網路才能用');
      } else {
        setError('語音識別出錯了,換文字輸入吧');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error('[voice] start failed:', e);
      setError('無法啟動語音識別');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // 長按處理 (長按 500ms 切換語言選單)
  const handlePressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowLangPicker(true);
    }, 500);
  };
  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  if (!isSupported) return null;

  const currentLang = LANGUAGES.find((l) => l.code === lang);

  return (
    <div className="relative">
      {/* 聆聽中的即時轉譯 bubble */}
      {isListening && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-white/95 backdrop-blur rounded-2xl p-3 shadow-lg border border-cream-200 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span
                className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
                style={{ animationDelay: '0.2s' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
            <span className="text-xs text-cocoa-500">聆聽中 ({currentLang?.label})</span>
          </div>
          <div className="text-sm text-cocoa-600 min-h-[20px] break-words">
            {interim || <span className="text-cocoa-300">說話中...</span>}
          </div>
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-red-50 border border-red-200 rounded-xl p-2 text-xs text-red-600 whitespace-nowrap">
          {error}
        </div>
      )}

      {/* 語言選擇器 */}
      {showLangPicker && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowLangPicker(false)}
          />
          <div className="absolute bottom-full mb-2 right-0 bg-white/95 backdrop-blur rounded-2xl p-2 shadow-lg border border-cream-200 min-w-[140px] z-20">
            <p className="text-[10px] text-cocoa-400 px-2 py-1">選擇語言</p>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setShowLangPicker(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 ${
                  lang === l.code
                    ? 'bg-cocoa-100 text-cocoa-700'
                    : 'text-cocoa-600 hover:bg-cream-50'
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
                {lang === l.code && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {/* 主按鈕 */}
      <button
        onClick={toggleListening}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        disabled={disabled}
        className={`w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-all ${
          isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
            : 'bg-cream-100 text-cocoa-500'
        } ${disabled ? 'opacity-50' : ''}`}
        title="點擊開始/停止,長按切換語言"
        aria-label="語音輸入"
      >
        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
      </button>
    </div>
  );
}
