import { createHash } from 'node:crypto';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type {
  ThrottlerGenerateKeyFunction,
  ThrottlerGetTrackerFunction,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';
import type { GlobalConfig } from '../config.type';

const FREE_TIER_THROTTLER_NAME = 'free-tier-daily';
const UNKNOWN_CLIENT_TRACKER = 'unknown-client';
const API_PATH_PREFIX = '/api/';
const CORS_PREFLIGHT_METHOD = 'OPTIONS';

type HeaderValue = string | string[] | undefined;

type ThrottlerRequestLike = {
  headers?: Record<string, HeaderValue>;
  ip?: string;
  method?: string;
  originalUrl?: string;
  url?: string;
  raw?: {
    socket?: {
      remoteAddress?: string;
    };
    url?: string;
  };
  socket?: {
    remoteAddress?: string;
  };
};

function getFirstHeaderValue(value: HeaderValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getForwardedClientIp(value: HeaderValue): string | undefined {
  return getFirstHeaderValue(value)
    ?.split(',')
    .map((ipAddress) => ipAddress.trim())
    .find(Boolean);
}

function getClientTracker(req: Record<string, unknown>, trustProxy: boolean): string {
  const request = req as ThrottlerRequestLike;
  const headers = request.headers ?? {};

  if (trustProxy) {
    return (
      getFirstHeaderValue(headers['cf-connecting-ip']) ??
      getForwardedClientIp(headers['x-forwarded-for']) ??
      getFirstHeaderValue(headers['x-real-ip']) ??
      request.ip ??
      request.socket?.remoteAddress ??
      request.raw?.socket?.remoteAddress ??
      UNKNOWN_CLIENT_TRACKER
    );
  }

  return (
    request.ip ??
    request.socket?.remoteAddress ??
    request.raw?.socket?.remoteAddress ??
    UNKNOWN_CLIENT_TRACKER
  );
}

function getRequestPath(context: ExecutionContext): string | undefined {
  const request = context.switchToHttp().getRequest<ThrottlerRequestLike>();

  return request.originalUrl ?? request.url ?? request.raw?.url;
}

function getRequestMethod(context: ExecutionContext): string | undefined {
  return context.switchToHttp().getRequest<ThrottlerRequestLike>().method;
}

function hashTracker(tracker: string): string {
  return createHash('sha256').update(tracker).digest('hex');
}

const generateFreeTierKey: ThrottlerGenerateKeyFunction = (_context, tracker, throttlerName) =>
  `public-api:${throttlerName}:${hashTracker(tracker)}`;

function shouldSkipFreeTierQuota(context: ExecutionContext): boolean {
  const method = getRequestMethod(context);
  const path = getRequestPath(context);

  if (method === CORS_PREFLIGHT_METHOD) {
    return true;
  }

  return !path?.startsWith(API_PATH_PREFIX);
}

export default function useThrottlerFactory(
  configService: ConfigService<GlobalConfig>,
): ThrottlerModuleOptions {
  const appConfig = configService.getOrThrow('app', { infer: true });
  const redisConfig = configService.getOrThrow('redis', { infer: true });
  const throttlerConfig = configService.getOrThrow('throttler', { infer: true });
  const getTracker: ThrottlerGetTrackerFunction = (req) =>
    getClientTracker(req, appConfig.trustProxy);
  const options: ThrottlerModuleOptions = {
    errorMessage:
      'You are out of free API requests for today. Please try again after your quota resets.',
    getTracker,
    generateKey: generateFreeTierKey,
    skipIf: shouldSkipFreeTierQuota,
    throttlers: [
      {
        name: FREE_TIER_THROTTLER_NAME,
        limit: throttlerConfig.freeTierDailyLimit,
        ttl: throttlerConfig.freeTierDailyTtlMs,
      },
    ],
  };

  if (!redisConfig.enabled) {
    return options;
  }

  return {
    ...options,
    storage: new ThrottlerStorageRedisService(redisConfig.url, {
      enableOfflineQueue: !redisConfig.required,
      lazyConnect: !redisConfig.required,
      maxRetriesPerRequest: redisConfig.required ? 3 : 1,
    }),
  };
}
