import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type { ConfigService } from '@nestjs/config';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type { GlobalConfig } from '../config.type';

export default function useThrottlerFactory(
  configService: ConfigService<GlobalConfig>,
): ThrottlerModuleOptions {
  const redisConfig = configService.getOrThrow('redis', { infer: true });
  const throttlerConfig = configService.getOrThrow('throttler', { infer: true });
  const options: ThrottlerModuleOptions = {
    throttlers: [
      {
        limit: throttlerConfig.limit,
        ttl: throttlerConfig.ttlMs,
      },
    ],
  };

  if (!redisConfig.enabled) {
    return options;
  }

  return {
    ...options,
    storage: new ThrottlerStorageRedisService(redisConfig.url, {
      enableOfflineQueue: !redisConfig.required,
      lazyConnect: !redisConfig.required,
      maxRetriesPerRequest: redisConfig.required ? 3 : 1,
    }),
  };
}
