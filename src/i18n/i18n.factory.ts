import path from 'node:path';
import type { ConfigService } from '@nestjs/config';
import type { I18nOptions } from 'nestjs-i18n';
import type { GlobalConfig } from '../config/config.type';
import { Environment } from '../constants/app.constants';

export default function useI18nFactory(configService: ConfigService<GlobalConfig>): I18nOptions {
  const i18nConfig = configService.getOrThrow('i18n', { infer: true });
  const appConfig = configService.getOrThrow('app', { infer: true });
  const watchTranslations =
    appConfig.nodeEnv === Environment.Local || appConfig.nodeEnv === Environment.Development;

  return {
    fallbackLanguage: i18nConfig.fallbackLanguage,
    loaderOptions: {
      path: path.join(__dirname, 'messages'),
      watch: watchTranslations,
    },
    throwOnMissingKey: false,
  };
}
