import type { Cache } from 'cache-manager';
import { PublicDataCacheService } from './public-data-cache.service';

function createCacheManager() {
  const cache = new Map<string, unknown>();

  return {
    get: jest.fn((key: string) => Promise.resolve(cache.get(key))),
    set: jest.fn((key: string, value: unknown) => {
      cache.set(key, value);
      return Promise.resolve(value);
    }),
    clear: jest.fn(() => {
      cache.clear();
      return Promise.resolve(true);
    }),
  } as unknown as Cache;
}

describe('PublicDataCacheService', () => {
  it('reuses cached values for stable payloads regardless of object key order', async () => {
    const cacheManager = createCacheManager();
    const service = new PublicDataCacheService(cacheManager);
    const loadFirst = jest.fn(() => Promise.resolve({ count: 1 }));
    const loadSecond = jest.fn(() => Promise.resolve({ count: 2 }));

    const first = await service.getOrSet('datasets:list', { b: 2, a: 1 }, loadFirst);
    const second = await service.getOrSet('datasets:list', { a: 1, b: 2 }, loadSecond);

    expect(first).toEqual({ count: 1 });
    expect(second).toEqual({ count: 1 });
    expect(loadFirst).toHaveBeenCalledTimes(1);
    expect(loadSecond).not.toHaveBeenCalled();
    expect(cacheManager.set).toHaveBeenCalledTimes(1);
  });

  it('clears the configured cache store', async () => {
    const cacheManager = createCacheManager();
    const service = new PublicDataCacheService(cacheManager);

    await service.clearAll();

    expect(cacheManager.clear).toHaveBeenCalledTimes(1);
  });
});
