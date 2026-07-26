// Token 估算 — 粗略但足夠用於 dashboard 統計
// 規則:
//   - 中文字符 ≈ 1.5 tokens(中文字符 + 半個英文 word)
//   - 英文單詞 ≈ 1.3 tokens(BPE 平均)
//   - 標點/數字 ≈ 0.5 tokens

const CN_CHAR_TOKEN = 1.5;
const EN_WORD_TOKEN = 1.3;
const PUNCT_TOKEN = 0.5;

export function estimateTokens(text: string): number {
  if (!text) return 0;

  let cnCount = 0;
  let enCount = 0;
  let punctCount = 0;

  // 拆詞:中文(連續中文)算字符,英文(空格分隔)算單詞,其他算標點
  const enWords = text.match(/[a-zA-Z]+/g);
  if (enWords) enCount = enWords.length;

  const cnChars = text.match(/[\u4e00-\u9fa5]/g);
  if (cnChars) cnCount = cnChars.length;

  // 標點和數字
  const puncts = text.match(/[\s\d\W_]+/g);
  if (puncts) punctCount = puncts.join('').length;

  return Math.ceil(cnCount * CN_CHAR_TOKEN + enCount * EN_WORD_TOKEN + punctCount * PUNCT_TOKEN);
}

/**
 * 估算 messages 數組的 total tokens
 */
export function estimateMessagesTokens(
  messages: Array<{ role: string; content: string }>,
): { prompt: number; completion: number } {
  let prompt = 0;
  // 系統消息的固定開銷(角色標記等)大約 +4
  prompt += 4;

  for (const m of messages) {
    prompt += 4; // 每條消息的角色標記
    prompt += estimateTokens(m.content);
  }
  return { prompt, completion: 0 };
}
