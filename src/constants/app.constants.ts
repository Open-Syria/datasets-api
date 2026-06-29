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
export const PAGE_LIMIT_OPTIONS = ['ten', 'thirty_five', 'fifty'] as const;
export type PageLimitOption = (typeof PAGE_LIMIT_OPTIONS)[number];
export const PAGE_LIMIT_VALUES = {
  ten: 10,
  thirty_five: 35,
  fifty: 50,
} as const satisfies Record<PageLimitOption, number>;
export const DEFAULT_PAGE_LIMIT_OPTION = 'ten' satisfies PageLimitOption;
export const DEFAULT_PAGE_LIMIT = PAGE_LIMIT_VALUES[DEFAULT_PAGE_LIMIT_OPTION];
export const MAX_PAGE_LIMIT = PAGE_LIMIT_VALUES.fifty;

export const SORT_ORDER_OPTIONS = ['asc', 'desc'] as const;
export type SortOrderOption = (typeof SORT_ORDER_OPTIONS)[number];
export const SORT_ORDER_VALUES = {
  asc: 'asc',
  desc: 'desc',
} as const satisfies Record<SortOrderOption, string>;
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];
export const DEFAULT_SORT_ORDER_OPTION = 'asc' satisfies SortOrderOption;
export const DEFAULT_SORT_ORDER = SORT_ORDER_VALUES[DEFAULT_SORT_ORDER_OPTION];

export const RECORD_SOURCE_STATUSES = [
  'pending_release',
  'seed',
  'released',
  'deprecated',
] as const;
export type RecordSourceStatus = (typeof RECORD_SOURCE_STATUSES)[number];
export const RECORD_SOURCE_STATUS_OPTIONS = [
  'pending_release',
  'seed',
  'released',
  'deprecated',
] as const;
export type RecordSourceStatusOption = (typeof RECORD_SOURCE_STATUS_OPTIONS)[number];
export const RECORD_SOURCE_STATUS_VALUES = {
  pending_release: 'pending_release',
  seed: 'seed',
  released: 'released',
  deprecated: 'deprecated',
} as const satisfies Record<RecordSourceStatusOption, RecordSourceStatus>;

export const loggingRedactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.code',
  'req.body.email',
  'req.body.password',
];
