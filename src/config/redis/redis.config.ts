import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { Environment } from '../../constants/app.constants';
import type { RedisConfig } from './redis-config.type';

const booleanEnvSchema = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(Environment).optional().default(Environment.Development),
  REDIS_URL: z.string().min(1).optional().default('redis://localhost:6379'),
  REDIS_REQUIRED: booleanEnvSchema.optional(),
  REDIS_ENABLED: booleanEnvSchema.optional(),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Invalid Redis environment variables: ${JSON.stringify(z.treeifyError(result.error))}`,
    );
  }

  return result.data;
}

export function getConfig(): RedisConfig {
  const env = parseEnv();
  const isRequiredByDefault =
    env.NODE_ENV === Environment.Production || env.NODE_ENV === Environment.Staging;

  return {
    enabled: env.REDIS_ENABLED ?? env.NODE_ENV !== Environment.Test,
    required: env.REDIS_REQUIRED ?? isRequiredByDefault,
    url: env.REDIS_URL,
  };
}

export default registerAs<RedisConfig>('redis', getConfig);
