import { createHash, randomBytes, randomUUID } from 'crypto';

export function generateToken(prefix: string = 'tk'): string {
  const bytes = randomBytes(32);
  return `${prefix}_${bytes.toString('hex')}`;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateDeviceId(): string {
  return `dev_${randomUUID()}`;
}

export function generateTenantId(): string {
  return `tn_${randomUUID()}`;
}
