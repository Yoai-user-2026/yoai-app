/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA 用 — 允許 service worker
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ];
  },
  images: {
    // DashScope 回傳的圖片可能來自 OSS,允許相關域名
    remotePatterns: [
      { protocol: 'https', hostname: 'dashscope.aliyuncs.com' },
      { protocol: 'https', hostname: '**.aliyuncs.com' },
    ],
  },
};

export default nextConfig;
