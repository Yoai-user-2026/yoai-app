# 🌅 早上 checklist (5 分鐘)

## 做了什麼

1. ✅ 加了 `vercel.json`,Vercel 部署到 **hkg1 (香港機房)**
2. ✅ Push 到 main,Vercel 自動重新 build
3. ✅ 準備好 Neon 資料遷移腳本

## 你要做的事 (照順序)

### ① 打開 Neon 後台 (1 分鐘)
- 網址: https://console.neon.tech/
- 用你註冊的帳號登入

### ② 確認你現有 DB 的 region (30 秒)
- 點進你的 yoai 專案
- 看右上角 Project Info 裡的 Region
- 如果是 **AWS US East (Ohio) 或 US East (N. Virginia)** → 我們要搬
- 截圖發給我,讓我確認現在確實是美國

### ③ 在新加坡建新的 Neon 專案 (3 分鐘)
- 點左上角你的頭像 → **Create Project**
- Project name: 隨便取,例如 `yoai-sg`
- Region/AWS Region: 選 **Asia Pacific (Singapore)** ← **重要!**
- Postgres version: 最新預設就好
- 點 Create Project

### ④ 複製連線字串 (30 秒)
- 專案建好後,在 Dashboard 會看到連線字串
- 找那個有 `?sslmode=require` 的 **Pooled connection** (給 Vercel 用)
- 還有 **Direct connection** (給 Prisma migrate 用)
- 兩個都複製下來,貼到這個對話給我

### ⑤ 跟我說「繼續」
- 我接手:
  - 在新 DB 上跑 prisma db push (建表)
  - 跑遷移腳本,把 9 條食物 + 22 條對話都搬過去
  - 更新 Vercel 環境變數
  - 驗證一切正常
- 大概 5-10 分鐘搞完

## 完成標準

- 從香港打開 https://yoai-app.vercel.app
- 頁面載入明顯比之前快
- 你的帳號、9 條食物、22 條對話都還在
- 朋友也能正常打開 (HK 朋友)

## 還沒做的

- ❌ 內地用戶訪問問題 (要等方案 B 阿里雲,先不做)
- ❌ Vercel 自動更新提示 (PWA 快取問題,以後再說)
- ❌ 其他功能迭代

睡個好覺,明早見 🌙
