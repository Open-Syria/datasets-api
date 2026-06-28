export enum Environment {
  Local = 'local',
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

export const APP_LOCALES = ['en', 'ar'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];
export const DEFAULT_APP_LOCALE = 'en' satisfies AppLocale;

export const APP_LOG_LEVELS = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent',
] as const;
export type AppLogLevel = (typeof APP_LOG_LEVELS)[number];

export const DEFAULT_CURRENT_PAGE = 1;
export const PAGE_LIMIT_OPTIONS = ['TEN', 'THIRTY_FIVE', 'FIFTY'] as const;
export type PageLimitOption = (typeof PAGE_LIMIT_OPTIONS)[number];
export const PAGE_LIMIT_VALUES = {
  TEN: 10,
  THIRTY_FIVE: 35,
  FIFTY: 50,
} as const satisfies Record<PageLimitOption, number>;
export const DEFAULT_PAGE_LIMIT_OPTION = 'TEN' satisfies PageLimitOption;
export const DEFAULT_PAGE_LIMIT = PAGE_LIMIT_VALUES[DEFAULT_PAGE_LIMIT_OPTION];
export const MAX_PAGE_LIMIT = PAGE_LIMIT_VALUES.FIFTY;

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];
export const DEFAULT_SORT_ORDER = 'asc' satisfies SortOrder;

export const loggingRedactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.code',
  'req.body.email',
  'req.body.password',
];
