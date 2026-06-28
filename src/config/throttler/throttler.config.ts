import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import type { ThrottlerConfig } from './throttler-config.type';

const envSchema = z.object({
  THROTTLE_FREE_TIER_DAILY_LIMIT: z.coerce.number().int().positive().optional().default(500),
  THROTTLE_FREE_TIER_DAILY_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(86_400),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Invalid throttler environment variables: ${JSON.stringify(z.treeifyError(result.error))}`,
    );
  }

  return result.data;
}

export function getConfig(): ThrottlerConfig {
  const env = parseEnv();

  return {
    freeTierDailyLimit: env.THROTTLE_FREE_TIER_DAILY_LIMIT,
    freeTierDailyTtlMs: env.THROTTLE_FREE_TIER_DAILY_TTL_SECONDS * 1000,
  };
}

export default registerAs<ThrottlerConfig>('throttler', getConfig);
