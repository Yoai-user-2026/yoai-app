// 健康資料加密 — AES-256-GCM
// 設計:每用戶一把 derived key,從 AUTH_SECRET + userId 派生
// 即使 DB 整個被偷,沒有 AUTH_SECRET 也解密不了
//
// 注意:這是 MVP 等級的加密。production 應該:
// 1. 用 AWS KMS / Aliyun KMS 管理 master key
// 2. 為每個用戶存獨立的 data encryption key (DEK)
// 3. rotate keys 定期換
//
// 目前選擇:用 AUTH_SECRET 派生,簡單但安全
// (AUTH_SECRET 一旦洩漏,需要把所有用戶 health data 重新加密)

import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM 標準 IV 長度

function getMasterKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('[health-encrypt] AUTH_SECRET is not set');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * 為特定用戶派生一把獨立 key
 * 這樣即使將來要 rotate 一個用戶的 key(例如用戶要求刪除),不會影響其他人
 */
function getUserKey(userId: string): Buffer {
  const master = getMasterKey();
  // HMAC(master, userId) → 32 bytes
  return crypto.createHmac('sha256', master).update(`health:${userId}`).digest();
}

export interface EncryptedField {
  ciphertext: string; // base64
  iv: string;         // base64
  authTag: string;    // base64
}

/**
 * 加密任意 JSON 資料
 */
export function encryptHealthField(userId: string, data: unknown): EncryptedField {
  const key = getUserKey(userId);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const plaintext = JSON.stringify(data);
  const ciphertextBuf = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertextBuf.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * 解密
 */
export function decryptHealthField<T = unknown>(userId: string, field: EncryptedField): T {
  const key = getUserKey(userId);
  const iv = Buffer.from(field.iv, 'base64');
  const authTag = Buffer.from(field.authTag, 'base64');
  const ciphertext = Buffer.from(field.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext) as T;
}
