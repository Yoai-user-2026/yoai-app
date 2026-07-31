import OpenAI from 'openai';
import 'dotenv/config';

const apiKey = process.env.DASHSCOPE_API_KEY;
const baseURL = process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';

console.log('Testing DashScope from yoai workspace...');
console.log('API key (first 15):', apiKey?.slice(0, 15));
console.log('Base URL:', baseURL);

const client = new OpenAI({ apiKey, baseURL });

try {
  const start = Date.now();
  const stream = await client.chat.completions.create({
    model: 'qwen-plus',
    messages: [{ role: 'user', content: '你好' }],
    stream: true,
    max_tokens: 50,
  });

  let full = '';
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      full += content;
      process.stdout.write(content);
    }
  }
  console.log(`\n✓ OK in ${Date.now() - start}ms`);
} catch (err) {
  console.error('✗ Error:', err.message);
  console.error('Status:', err.status);
  console.error('Code:', err.code);
}
