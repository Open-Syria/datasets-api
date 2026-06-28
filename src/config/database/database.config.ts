import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { Environment } from '../../constants/app.constants';
import type { DatabaseConfig } from './database-config.type';

const booleanEnvSchema = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(Environment).optional().default(Environment.Development),
  DATABASE_URL: z.string().min(1).optional(),
  DATABASE_ENABLED: booleanEnvSchema.optional(),
  DATABASE_REQUIRED: booleanEnvSchema.optional(),
  DATABASE_LOG_QUERIES: booleanEnvSchema.optional(),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Invalid database environment variables: ${JSON.stringify(z.treeifyError(result.error))}`,
    );
  }

  return result.data;
}

export function getConfig(): DatabaseConfig {
  const env = parseEnv();
  const isRequiredByDefault =
    env.NODE_ENV === Environment.Production || env.NODE_ENV === Environment.Staging;
  const required = env.DATABASE_REQUIRED ?? isRequiredByDefault;
  const enabled = env.DATABASE_ENABLED ?? (Boolean(env.DATABASE_URL) || required);

  if (enabled && !env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when the database read model is enabled.');
  }

  return {
    enabled,
    required,
    url: env.DATABASE_URL ?? null,
    logQueries: env.DATABASE_LOG_QUERIES ?? false,
  };
}

export default registerAs<DatabaseConfig>('database', getConfig);
