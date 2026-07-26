import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yoai — 你的 AI 生活伴侶',
  description: '溫暖、貼心、永遠在身邊。Yoai 陪你過好每一天。',
  manifest: '/manifest.webmanifest',
  applicationName: 'Yoai',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Yoai',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#fdfaf6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        {/* PWA iOS 支援 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        {children}
        {/* 註冊 service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.warn('SW 註冊失敗:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
