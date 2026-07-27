/**
 * 阿里雲 FC Custom Handler — 將 Next.js 包裝成函數計算可呼叫的形式
 *
 * 用法:
 *   1. next.config.mjs 設為 output: 'standalone'
 *   2. npm run build 產生 .next/standalone
 *   3. cp -r .next/static .next/standalone/.next/static
 *   4. cp -r public .next/standalone/public
 *   5. cd .next/standalone && zip -r ../../fc-deploy.zip .
 *   6. s deploy  (透過 s.yaml)
 *
 * Handler 邏輯:
 *   - FC 觸發 (req, res, context)
 *   - 將請求轉給 Next.js server
 *   - 支援 SSE 串流 (chat 用)
 */

const path = require('path');
const { parse } = require('url');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const dir = process.env.NEXTJS_DIR || path.join(__dirname);

let app;
let handle;
let preparePromise;

async function prepare() {
  if (!preparePromise) {
    preparePromise = (async () => {
      app = next({ dev, dir, conf: {} });
      handle = app.getRequestHandler();
      await app.prepare();
    })();
  }
  return preparePromise;
}

/**
 * FC HTTP 觸發器入口
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {object} context — FC 提供的 context
 */
exports.handler = async (req, res, context) => {
  try {
    await prepare();

    // FC 會把 raw body 放在 context 中,需要讀取出來
    // 但 Next.js 內部會自己處理 body,所以這裡直接轉發

    // 解析 URL
    const parsedUrl = parse(req.url, true);

    // 設定 SSE 必要 header (如果需要的話)
    // Next.js 的 streamChat 會自己處理

    // 將請求交給 Next.js
    return handle(req, res, parsedUrl);
  } catch (err) {
    console.error('[fc-handler] error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Internal Server Error');
    }
  }
};

// 給本地測試用
if (require.main === module) {
  const http = require('http');
  prepare().then(() => {
    http.createServer((req, res) => exports.handler(req, res, {})).listen(port, () => {
      console.log(`Yoai 跑在 http://localhost:${port}`);
    });
  });
}
