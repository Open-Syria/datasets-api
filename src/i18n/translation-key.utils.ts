import type { I18nContext } from 'nestjs-i18n';

export function translateApiMessage(i18n: I18nContext | undefined, key: string, fallback: string) {
  if (!i18n) {
    return fallback;
  }

  const translated = i18n.t(key, { defaultValue: fallback });

  return typeof translated === 'string' ? translated : fallback;
}
