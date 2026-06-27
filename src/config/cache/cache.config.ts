import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import type { CacheConfig } from './cache-config.type';

const envSchema = z.object({
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().optional().default(300),
  CACHE_MAX_ITEMS: z.coerce.number().int().positive().optional().default(1000),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Invalid cache environment variables: ${JSON.stringify(z.treeifyError(result.error))}`,
    );
  }

  return result.data;
}

export function getConfig(): CacheConfig {
  const env = parseEnv();

  return {
    maxItems: env.CACHE_MAX_ITEMS,
    ttlMs: env.CACHE_TTL_SECONDS * 1000,
  };
}

export default registerAs<CacheConfig>('cache', getConfig);
