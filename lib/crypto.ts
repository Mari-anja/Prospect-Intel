// AES-256-GCM symmetric encryption for user-provided API keys.
// The master key is held in env (KEY_ENCRYPTION_MASTER_KEY). Never logged,
// never returned to the browser. Compromise of the DB alone does not leak keys.
//
// Encoding: base64(iv) + ':' + base64(ciphertext) + ':' + base64(authTag)
// IV is a random 12 bytes per encryption (spec-compliant GCM).

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function getMasterKey(): Buffer {
  const raw = process.env.KEY_ENCRYPTION_MASTER_KEY;
  if (!raw) throw new Error('KEY_ENCRYPTION_MASTER_KEY not set');
  // Accept base64 (32 bytes = 44 chars including padding) or hex (64 chars).
  let key: Buffer;
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    key = Buffer.from(raw, 'hex');
  } else {
    key = Buffer.from(raw, 'base64');
  }
  if (key.length !== 32) {
    throw new Error(`KEY_ENCRYPTION_MASTER_KEY must decode to 32 bytes, got ${key.length}`);
  }
  return key;
}

export function encryptSecret(plain: string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), ct.toString('base64'), tag.toString('base64')].join(':');
}

export function decryptSecret(blob: string): string {
  const key = getMasterKey();
  const [ivB64, ctB64, tagB64] = blob.split(':');
  if (!ivB64 || !ctB64 || !tagB64) throw new Error('malformed encrypted blob');
  const iv = Buffer.from(ivB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

// Mask for display in UI (never decrypt for display; show a placeholder).
export function maskedKey(provider: string): string {
  return `${provider}_••••••••••••••••`;
}
