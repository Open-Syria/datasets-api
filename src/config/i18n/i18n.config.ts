import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { APP_LOCALES, DEFAULT_APP_LOCALE } from '../../constants/app.constants';
import type { I18nConfig } from './i18n-config.type';

const envSchema = z.object({
  APP_FALLBACK_LANGUAGE: z.enum(APP_LOCALES).optional().default(DEFAULT_APP_LOCALE),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Invalid i18n environment variables: ${JSON.stringify(z.treeifyError(result.error))}`,
    );
  }

  return result.data;
}

export function getConfig(): I18nConfig {
  const env = parseEnv();

  return {
    fallbackLanguage: env.APP_FALLBACK_LANGUAGE,
  };
}

export default registerAs<I18nConfig>('i18n', getConfig);
