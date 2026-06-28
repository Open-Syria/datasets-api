import { createHash } from 'node:crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';

const PUBLIC_DATA_CACHE_PREFIX = 'public-data:v1';

function normalizeCacheKeyValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeCacheKeyValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, item]) => [key, normalizeCacheKeyValue(item)]),
  );
}

function hashCacheKeyPayload(payload: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(normalizeCacheKeyValue(payload)))
    .digest('hex');
}

function formatCacheError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class PublicDataCacheService {
  private readonly logger = new Logger(PublicDataCacheService.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async getOrSet<TValue>(
    scope: string,
    payload: unknown,
    loader: () => Promise<TValue> | TValue,
  ): Promise<TValue> {
    const key = this.buildKey(scope, payload);

    try {
      const cachedValue = await this.cacheManager.get<TValue>(key);

      if (cachedValue !== undefined) {
        return cachedValue;
      }
    } catch (error) {
      this.logger.warn(`Cache read failed for ${scope}: ${formatCacheError(error)}`);
    }

    const value = await loader();

    if (value === undefined) {
      return value;
    }

    try {
      await this.cacheManager.set(key, value);
    } catch (error) {
      this.logger.warn(`Cache write failed for ${scope}: ${formatCacheError(error)}`);
    }

    return value;
  }

  async clearAll(): Promise<void> {
    try {
      await this.cacheManager.clear();
    } catch (error) {
      this.logger.warn(`Cache clear failed: ${formatCacheError(error)}`);
    }
  }

  private buildKey(scope: string, payload: unknown) {
    return `${PUBLIC_DATA_CACHE_PREFIX}:${scope}:${hashCacheKeyPayload(payload)}`;
  }
}
