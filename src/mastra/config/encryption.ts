import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getMasterKey(): Buffer {
  const key = process.env.AMMP_MASTER_KEY;
  if (!key) throw new Error('AMMP_MASTER_KEY env var is required');
  const buf = Buffer.from(key, 'hex');
  if (buf.length !== KEY_LENGTH) throw new Error('AMMP_MASTER_KEY must be 64 hex chars (256 bits)');
  return buf;
}

export function encryptApiKey(plaintext: string): { encrypted: string; iv: string; tag: string } {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptApiKey(encrypted: string, iv: string, tag: string): string {
  const key = getMasterKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}
