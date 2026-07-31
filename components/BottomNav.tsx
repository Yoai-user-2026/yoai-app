'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, ShoppingBasket, Users, HeartPulse } from 'lucide-react';

const items = [
  { href: '/chat', icon: Sparkles, label: 'Yoai' },
  { href: '/food', icon: ShoppingBasket, label: '食庫' },
  { href: '/family', icon: Users, label: '我們' },
  { href: '/health', icon: HeartPulse, label: '健康' },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-cream-200 safe-area-bottom">
      <div className="max-w-md mx-auto flex justify-around py-2">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all ${
                active ? 'text-cocoa-600' : 'text-cocoa-400'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
