import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { APP_LOG_LEVELS, Environment } from '../../constants/app.constants';
import type { AppConfig, AppCorsOrigin } from './app-config.type';
import { expandOriginPatterns, normalizeOrigin } from './origin.utils';

const booleanEnvSchema = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const portEnvSchema = z.coerce.number().int().min(1).max(65_535);

const envSchema = z.object({
  NODE_ENV: z.enum(Environment).optional().default(Environment.Development),
  APP_NAME: z.string().min(1).optional().default('opensyria-datasets-api'),
  APP_PORT: portEnvSchema.optional(),
  PORT: portEnvSchema.optional(),
  APP_URL: z.url().optional(),
  APP_API_PREFIX: z.string().min(1).optional().default('api'),
  APP_API_VERSION: z.string().min(1).optional().default('1'),
  APP_CORS_ORIGIN: z.string().optional().default('*'),
  APP_CORS_CREDENTIALS: booleanEnvSchema.optional(),
  APP_DOCS_ENABLED: booleanEnvSchema.optional(),
  APP_DEBUG: booleanEnvSchema.optional(),
  APP_LOG_LEVEL: z.enum(APP_LOG_LEVELS).optional(),
  APP_LOG_PRETTY: booleanEnvSchema.optional(),
  APP_TRUST_PROXY: booleanEnvSchema.optional(),
  IS_HTTPS: booleanEnvSchema.optional(),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Invalid API environment variables: ${JSON.stringify(z.treeifyError(result.error))}`,
    );
  }

  return result.data;
}

function getCorsOrigin(corsOrigin?: string): AppCorsOrigin {
  if (!corsOrigin || corsOrigin === 'false') {
    return false;
  }

  if (corsOrigin === 'true') {
    return true;
  }

  if (corsOrigin === '*') {
    return '*';
  }

  const origins = corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const invalidOrigins = origins.filter((origin) => !normalizeOrigin(origin));

  if (invalidOrigins.length > 0) {
    throw new Error(`Invalid APP_CORS_ORIGIN value(s): ${invalidOrigins.join(', ')}`);
  }

  return origins.length > 0 ? expandOriginPatterns(origins) : false;
}

function getCorsCredentials(corsOrigin: AppCorsOrigin, explicitValue?: boolean) {
  if (typeof explicitValue === 'boolean') {
    return explicitValue;
  }

  return corsOrigin !== false && corsOrigin !== '*';
}

export function getConfig(): AppConfig {
  const env = parseEnv();
  const port = env.APP_PORT ?? env.PORT ?? 3000;
  const corsOrigin = getCorsOrigin(env.APP_CORS_ORIGIN);
  const isLocalLike =
    env.NODE_ENV === Environment.Local || env.NODE_ENV === Environment.Development;
  const isTest = env.NODE_ENV === Environment.Test;

  return {
    name: env.APP_NAME,
    nodeEnv: env.NODE_ENV,
    port,
    url: env.APP_URL ?? `http://localhost:${port}`,
    apiPrefix: env.APP_API_PREFIX,
    apiVersion: env.APP_API_VERSION,
    isHttps: env.IS_HTTPS ?? false,
    trustProxy: env.APP_TRUST_PROXY ?? env.IS_HTTPS ?? false,
    corsOrigin,
    corsCredentials: getCorsCredentials(corsOrigin, env.APP_CORS_CREDENTIALS),
    docsEnabled: env.APP_DOCS_ENABLED ?? (!isTest && env.NODE_ENV !== Environment.Production),
    debug: env.APP_DEBUG ?? false,
    logLevel: env.APP_LOG_LEVEL ?? (isTest ? 'silent' : isLocalLike ? 'debug' : 'info'),
    logPretty: env.APP_LOG_PRETTY ?? isLocalLike,
  };
}

export default registerAs<AppConfig>('app', getConfig);
