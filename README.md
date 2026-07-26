# 🌿 Yoai

> 在細微處,陪你過好每一天。

Yoai 是一個 PWA (Progressive Web App) 形態的 AI 生活伴侶與健康管家。溫暖、貼心、像最懂妳的閨蜜一樣存在。

## ✨ 核心功能

- 💬 **情感陪伴對話** — 傾聽、陪伴、給予溫柔迴應
- 📷 **看圖管家** — 拍照自動識別發票、食物、冰箱內容
- 🏠 **家庭食物共享** — 食物記錄自動同步給全家人
- 🔒 **個人隱私保護** — 對話、記憶完全私密,只有本人能看
- 📅 _(預計)_ 荷爾蒙週期關懷
- 🧠 _(預計)_ 個人偏好記憶

## 🏗️ 技術棧

| 層 | 選型 |
|---|---|
| 前端 | Next.js 14 (App Router) + React 18 + TypeScript + Tailwind |
| 後端 | Next.js API Routes (Node.js runtime) |
| 數據庫 | Prisma ORM + SQLite (dev) / PostgreSQL (prod) |
| 認證 | NextAuth v5 (Auth.js) — 郵箱 + 密碼 |
| AI | 阿里雲通義千問 (Qwen3 對話 + Qwen2-VL 視覺) |
| 部署 | Vercel + Neon/Supabase (PostgreSQL) |
| PWA | Service Worker + Web App Manifest |

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變量

```bash
cp .env.example .env
# 編輯 .env,填入:
#   - DATABASE_URL (默認 SQLite 已可)
#   - AUTH_SECRET (用 `openssl rand -base64 32` 生成)
#   - DASHSCOPE_API_KEY (從阿里雲 DashScope 申請)
```

### 3. 初始化數據庫

```bash
npx prisma db push
```

### 4. 啟動開發服務器

```bash
npm run dev
# 訪問 http://localhost:3000
```

### 5. 生產構建

```bash
npm run build
npm start
```

## 📱 安裝成 App

Yoai 是 PWA,在手機瀏覽器首次訪問後:
- **iOS Safari**: 分享 → 加入主畫面
- **Android Chrome**: 選單 → 加到主畫面

之後就像 App 一樣從桌面打開,全屏體驗。

## 🔑 環境變量

| 變量 | 必填 | 說明 |
|---|---|---|
| `DATABASE_URL` | ✅ | Prisma 連接字符串 |
| `AUTH_SECRET` | ✅ | NextAuth 加密密鑰 |
| `AUTH_URL` | ✅ | 應用 URL (部署後改為真實域名) |
| `DASHSCOPE_API_KEY` | ✅ | 阿里雲通義千問 API Key |
| `DASHSCOPE_CHAT_MODEL` | ⬜ | 對話模型,默認 `qwen-plus` |
| `DASHSCOPE_VL_MODEL` | ⬜ | 視覺模型,默認 `qwen-vl-plus` |
| `DEFAULT_FAMILY_NAME` | ⬜ | 預設家庭群組名 |

## 🌐 部署到 Vercel

### 1. 連接 GitHub 倉庫

Vercel Dashboard → Add New → Project → Import Git Repository
選擇 GitHub → 安裝 GitHub App → 授權 `yoai-app` 倉庫

### 2. 配置環境變量

在 Vercel Project Settings → Environment Variables 填入所有必填項

### 3. 切換到 PostgreSQL

Vercel Postgres 或 Neon 創建數據庫,把 `DATABASE_URL` 改為 PostgreSQL 連接字符串

修改 `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // 改這裡
  url      = env("DATABASE_URL")
}
```

然後 `npx prisma db push` 推一次表結構

### 4. 部署

Vercel 會自動部署,後續 `git push` 自動更新。

## 👥 家庭共享

每個用戶註冊時自動建立(或加入)家庭群組:

- **首次註冊**: 自動建立新家庭,獲取邀請碼
- **家人加入**: 把邀請碼給家人,他們註冊時填入,自動加入

只有**食物記錄**同步到家庭群組,其他都是個人私密。

## 🎨 設計理念

Yoai 不追求功能堆疊,而追求**情感溫度**:
- 暖色調(米白、焦糖、淺咖) — 不刺眼,有呼吸感
- 圓角、留白 — 像朋友聊天,不是冰冷的工具
- 永遠先給情緒價值,再整理資料
- 像閨蜜,不是客服

## 📂 目錄結構

```
yoai/
├── app/                    # Next.js App Router
│   ├── (main)/            # 已登入路由組
│   │   ├── chat/          # 對話頁
│   │   ├── food/          # 食物記錄
│   │   └── family/        # 家庭管理
│   ├── api/               # API 路由
│   ├── login/             # 登入/註冊
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/            # React 組件
├── lib/                   # 業務邏輯
│   ├── auth.ts           # NextAuth 配置
│   ├── db.ts             # Prisma client
│   ├── dashscope.ts      # 通義千問 API
│   ├── family.ts         # 家庭群組工具
│   └── yoai-prompt.ts    # Yoai 人設 prompt
├── prisma/
│   └── schema.prisma     # 數據模型
├── public/
│   ├── icons/            # PWA 圖標
│   ├── manifest.webmanifest
│   └── sw.js             # Service Worker
├── scripts/
│   └── generate-icons.py # Icon 生成腳本
└── .env.example
```

## 💰 成本估算 (Vercel + Qwen)

| 服務 | 免費額度 | 個人/家庭使用 |
|---|---|---|
| Vercel Hosting | 100GB 帶寬/月 | 完全免費 |
| Vercel Postgres / Neon | 0.5GB 存儲 | 足夠 5-10 年 |
| 通義千問 qwen-plus | 新用戶贈送 | ¥0.004/千 tokens |
| 通義千問 qwen-vl-plus | 新用戶贈送 | ¥0.008/千 tokens |

**預估月成本**: 每天 50 條對話 + 10 張圖 = **不到 ¥5/月**

## 📜 License

Private project — 個人/家庭使用。
