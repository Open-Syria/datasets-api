import { createKeyvNonBlocking } from '@keyv/redis';
import type { CacheModuleOptions } from '@nestjs/cache-manager';
import type { ConfigService } from '@nestjs/config';
import type { GlobalConfig } from '../config.type';

export default function useCacheFactory(
  configService: ConfigService<GlobalConfig>,
): CacheModuleOptions {
  const cacheConfig = configService.getOrThrow('cache', { infer: true });
  const redisConfig = configService.getOrThrow('redis', { infer: true });

  if (!redisConfig.enabled) {
    return {
      ttl: cacheConfig.ttlMs,
    };
  }

  const redisStore = createKeyvNonBlocking(redisConfig.url, {
    namespace: 'opensyria:datasets-api:cache',
    throwOnConnectError: redisConfig.required,
    throwOnErrors: false,
  });

  redisStore.on('error', () => undefined);

  return {
    ttl: cacheConfig.ttlMs,
    nonBlocking: !redisConfig.required,
    stores: [redisStore],
  };
}
