import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!REDIS_URL) return null;
  if (!client) {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });
    client.connect().catch((err) => {
      console.error('[Redis] Connection failed:', err.message);
      client = null;
    });
  }
  return client;
}

// Cooldown management
const COOLDOWN_PREFIX = 'ammp:cooldown:';
const COOLDOWN_DEFAULT_SECONDS = 60;

export async function setCooldown(providerId: string, seconds = COOLDOWN_DEFAULT_SECONDS): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.setex(`${COOLDOWN_PREFIX}${providerId}`, seconds, Date.now().toString());
}

export async function isOnCooldown(providerId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const exists = await redis.exists(`${COOLDOWN_PREFIX}${providerId}`);
  return exists === 1;
}

export async function getCooldownTTL(providerId: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  const ttl = await redis.ttl(`${COOLDOWN_PREFIX}${providerId}`);
  return Math.max(0, ttl);
}

export async function clearCooldown(providerId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`${COOLDOWN_PREFIX}${providerId}`);
}

// Cache helpers
const CACHE_PREFIX = 'ammp:cache:';

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(`${CACHE_PREFIX}${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.setex(`${CACHE_PREFIX}${key}`, ttlSeconds, JSON.stringify(value));
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`${CACHE_PREFIX}${key}`);
}
