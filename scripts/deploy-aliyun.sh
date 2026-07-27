#!/bin/bash
# 阿里雲 FC 部署腳本
# 用法:
#   1. 設定環境變數 (AccessKey 等)
#   2. ./scripts/deploy-aliyun.sh
#   3. 部署完成後會印出訪問網址

set -e

echo "🚀 開始部署 Yoai 到阿里雲 FC cn-hongkong"
echo ""

# === 0. 環境變數檢查 ===
if [ -z "$ALIBABA_CLOUD_ACCESS_KEY_ID" ] || [ -z "$ALIBABA_CLOUD_ACCESS_KEY_SECRET" ]; then
  echo "❌ 缺少環境變數,請設定:"
  echo "   export ALIBABA_CLOUD_ACCESS_KEY_ID=<your-key-id>"
  echo "   export ALIBABA_CLOUD_ACCESS_KEY_SECRET=<your-key-secret>"
  echo ""
  echo "   其他必要的環境變數 (從 Vercel 或本地 .env 複製):"
  echo "   - AUTH_SECRET"
  echo "   - DATABASE_URL"
  echo "   - DATABASE_URL_UNPOOLED"
  echo "   - DASHSCOPE_API_KEY"
  echo "   - DASHSCOPE_BASE_URL (可選)"
  exit 1
fi

if [ -z "$DATABASE_URL" ] || [ -z "$DASHSCOPE_API_KEY" ]; then
  echo "❌ 缺少 DATABASE_URL 或 DASHSCOPE_API_KEY 環境變數"
  exit 1
fi

# === 1. 確認 Serverless Devs 已安裝 ===
if ! command -v s &> /dev/null; then
  echo "📦 安裝 Serverless Devs..."
  npm install -g @serverless-devs/s
fi

# === 2. Build Next.js (standalone) ===
echo "🔨 Building Next.js standalone..."
npm run build
echo "✅ Build 完成"
echo ""

# === 3. 複製 static + public 到 standalone ===
echo "📦 打包 standalone 應用..."
if [ ! -d ".next/standalone" ]; then
  echo "❌ .next/standalone 不存在,build 可能失敗"
  exit 1
fi

# 複製 Next.js static assets
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
# 複製 public 資料夾
cp -r public .next/standalone/public 2>/dev/null || true
# 複製 fc-handler.js
cp fc-handler.js .next/standalone/fc-handler.js
echo "✅ 打包完成"
echo ""

# === 4. 部署 ===
echo "🚀 部署到阿里雲 FC..."
echo "   Region: cn-hongkong"
echo "   Runtime: nodejs20"
echo ""

cd .next/standalone
# 把 fc-handler.js 改為 package.json 的 main (s.yaml 會讀)
# 註: s.yaml 設定 handler 為 index.handler,所以我們建一個 index.js 引用 fc-handler
cat > index.js <<'EOF'
const { handler } = require('./fc-handler');
exports.handler = handler;
EOF

s deploy
echo ""
echo "🎉 部署完成!"
echo "📝 記下你得到的訪問網址,跟朋友分享"
