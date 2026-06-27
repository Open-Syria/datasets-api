import type { AppConfig } from './app/app-config.type';
import type { CacheConfig } from './cache/cache-config.type';
import type { DatasetsConfig } from './datasets/datasets-config.type';
import type { I18nConfig } from './i18n/i18n-config.type';
import type { RedisConfig } from './redis/redis-config.type';
import type { ThrottlerConfig } from './throttler/throttler-config.type';

export type GlobalConfig = {
  app: AppConfig;
  cache: CacheConfig;
  datasets: DatasetsConfig;
  i18n: I18nConfig;
  redis: RedisConfig;
  throttler: ThrottlerConfig;
};
