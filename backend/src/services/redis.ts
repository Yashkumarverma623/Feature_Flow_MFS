import Redis from 'ioredis';
import { config } from '../config/env';

let isRedisConnected = false;

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 100, 2000);
  },
  lazyConnect: true,
});

redis.on('connect', () => {
  isRedisConnected = true;
  console.log('[Redis] Client connected successfully');
});

redis.on('error', (err) => {
  if (isRedisConnected) {
    console.warn('[Redis] Connection lost or error occurred. Switching to PostgreSQL fallback mode.', err.message);
  }
  isRedisConnected = false;
});

// Tier 1 (L1) In-Memory Micro-Cache for sub-millisecond evaluation speed
const l1Cache = new Map<string, { value: any; expiresAt: number }>();

export async function getCache<T>(key: string): Promise<T | null> {
  const now = Date.now();
  const cachedL1 = l1Cache.get(key);
  if (cachedL1 && cachedL1.expiresAt > now) {
    return cachedL1.value as T;
  }

  if (!isRedisConnected) return null;

  try {
    const data = await redis.get(key);
    if (data) {
      const parsed = JSON.parse(data);
      l1Cache.set(key, { value: parsed, expiresAt: now + 5000 });
      return parsed as T;
    }
    return null;
  } catch (error) {
    console.warn(`[Redis Cache GET Fail] Key: ${key}. Falling back to DB.`, error);
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds = 300): Promise<void> {
  l1Cache.set(key, { value, expiresAt: Date.now() + 5000 });

  if (!isRedisConnected) return;

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    console.warn(`[Redis Cache SET Fail] Key: ${key}.`, error);
  }
}

export async function deleteCache(keyPattern: string): Promise<void> {
  l1Cache.clear();

  if (!isRedisConnected) return;

  try {
    if (keyPattern.includes('*')) {
      const keys = await redis.keys(keyPattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      await redis.del(keyPattern);
    }
  } catch (error) {
    console.warn(`[Redis Cache DEL Fail] Pattern: ${keyPattern}.`, error);
  }
}

export function isRedisAvailable(): boolean {
  return isRedisConnected;
}

export async function initRedis() {
  try {
    await redis.connect();
  } catch (err: any) {
    console.warn('[Redis] Initial connection failed. Operating in PostgreSQL fallback mode.', err.message);
    isRedisConnected = false;
  }
}
