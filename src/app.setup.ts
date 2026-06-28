import path from 'node:path';
import fastifyHelmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import { RequestMethod, VersioningType } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { setupGracefulShutdown } from 'nestjs-graceful-shutdown';
import type { AppConfig } from './config/app/app-config.type';
import { isOriginAllowedByPatterns } from './config/app/origin.utils';
import type { GlobalConfig } from './config/config.type';
import { Environment } from './constants/app.constants';
import { setupSwagger } from './tools/swagger/swagger.setup';

const ALLOWED_CORS_METHODS = ['GET', 'HEAD', 'OPTIONS'] as const;
const ALLOWED_CORS_HEADERS = ['content-type', 'authorization', 'x-requested-with', 'x-lang'];
const DEFAULT_ALLOWED_METHODS = ALLOWED_CORS_METHODS.join(', ');
const DEFAULT_ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With, X-Lang';
const DEFAULT_EXPOSED_HEADERS = 'X-Request-Id';
const CORS_PREFLIGHT_MAX_AGE_SECONDS = 600;
const PUBLIC_ASSETS_DIRECTORY = path.join(process.cwd(), 'public');
const PUBLIC_ASSET_ROUTES = [
  'apple-touch-icon.png',
  'favicon-96x96.png',
  'favicon.ico',
  'favicon.svg',
  'robots.txt',
  'site.webmanifest',
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
] as const;

function appendVaryHeader(reply: FastifyReply, value: string) {
  const currentValue = reply.getHeader('Vary');

  if (typeof currentValue !== 'string' || currentValue.length === 0) {
    reply.header('Vary', value);
    return;
  }

  const existingValues = currentValue.split(',').map((item) => item.trim().toLowerCase());

  if (!existingValues.includes(value.toLowerCase())) {
    reply.header('Vary', `${currentValue}, ${value}`);
  }
}

function getCorsResponseOrigin(origin: string, appConfig: AppConfig): string | false {
  if (appConfig.corsOrigin === false) {
    return false;
  }

  if (appConfig.corsOrigin === true) {
    return origin;
  }

  if (appConfig.corsOrigin === '*') {
    return appConfig.corsCredentials ? origin : '*';
  }

  return isOriginAllowedByPatterns(origin, appConfig.corsOrigin) ? origin : false;
}

function getFirstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getRequestedCorsHeaders(value: string | string[] | undefined): string[] {
  const headerValue = getFirstHeaderValue(value);

  if (!headerValue) {
    return [];
  }

  return headerValue
    .split(',')
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedCorsMethod(method: string | undefined) {
  if (!method) {
    return true;
  }

  return ALLOWED_CORS_METHODS.includes(
    method.toUpperCase() as (typeof ALLOWED_CORS_METHODS)[number],
  );
}

function getDisallowedCorsHeaders(value: string | string[] | undefined) {
  return getRequestedCorsHeaders(value).filter((header) => !ALLOWED_CORS_HEADERS.includes(header));
}

function setupCors(app: NestFastifyApplication, appConfig: AppConfig) {
  const fastify = app.getHttpAdapter().getInstance();

  fastify.addHook('onRequest', (request: FastifyRequest, reply: FastifyReply, done) => {
    const origin = request.headers.origin;
    const responseOrigin = origin ? getCorsResponseOrigin(origin, appConfig) : false;

    if (origin && responseOrigin) {
      reply.header('Access-Control-Allow-Origin', responseOrigin);
      appendVaryHeader(reply, 'Origin');

      if (appConfig.corsCredentials && responseOrigin !== '*') {
        reply.header('Access-Control-Allow-Credentials', 'true');
      }

      reply.header('Access-Control-Expose-Headers', DEFAULT_EXPOSED_HEADERS);
    }

    if (request.method !== 'OPTIONS') {
      done();
      return;
    }

    if (origin && !responseOrigin) {
      reply.status(403).send();
      return;
    }

    const requestedHeaders = request.headers['access-control-request-headers'];
    const requestedMethod = getFirstHeaderValue(request.headers['access-control-request-method']);
    const disallowedHeaders = getDisallowedCorsHeaders(requestedHeaders);

    if (!isAllowedCorsMethod(requestedMethod) || disallowedHeaders.length > 0) {
      reply.header('Allow', DEFAULT_ALLOWED_METHODS);
      reply.status(403).send();
      return;
    }

    reply.header('Access-Control-Allow-Methods', DEFAULT_ALLOWED_METHODS);
    reply.header('Access-Control-Allow-Headers', DEFAULT_ALLOWED_HEADERS);
    reply.header('Access-Control-Max-Age', CORS_PREFLIGHT_MAX_AGE_SECONDS.toString());
    reply.status(204).send();
  });
}

function setupCrawlerHeaders(app: NestFastifyApplication) {
  const fastify = app.getHttpAdapter().getInstance();

  fastify.addHook('onRequest', (_request: FastifyRequest, reply: FastifyReply, done) => {
    reply.header('X-Robots-Tag', 'noindex, nofollow');
    done();
  });
}

async function setupPublicAssets(app: NestFastifyApplication) {
  const fastify = app.getHttpAdapter().getInstance();

  await app.register(fastifyStatic, {
    root: PUBLIC_ASSETS_DIRECTORY,
    prefix: '/assets/',
  });

  for (const assetRoute of PUBLIC_ASSET_ROUTES) {
    fastify.get(`/${assetRoute}`, (_request, reply) => {
      reply.sendFile(assetRoute);
    });
  }
}

function getContentSecurityPolicy(appConfig: AppConfig) {
  const baseDirectives = {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: appConfig.isHttps ? [] : null,
  };

  if (!appConfig.docsEnabled) {
    return {
      directives: baseDirectives,
    };
  }

  return {
    directives: {
      ...baseDirectives,
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'cdn.jsdelivr.net',
        'fonts.googleapis.com',
        'unpkg.com',
      ],
      fontSrc: ["'self'", 'data:', 'fonts.gstatic.com', 'fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'cdn.jsdelivr.net', 'unpkg.com'],
      connectSrc: ["'self'", appConfig.url, 'localhost:*', 'http://localhost:*'],
    },
  };
}

export async function setupApp(
  app: NestFastifyApplication,
  configService: ConfigService<GlobalConfig>,
) {
  const appConfig = configService.getOrThrow('app', { infer: true });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: getContentSecurityPolicy(appConfig),
    referrerPolicy: {
      policy: 'no-referrer',
    },
    strictTransportSecurity: appConfig.isHttps
      ? {
          maxAge: 31_536_000,
          includeSubDomains: true,
          preload: false,
        }
      : false,
    xContentTypeOptions: true,
    xDnsPrefetchControl: {
      allow: false,
    },
    xDownloadOptions: true,
    xFrameOptions: {
      action: 'deny',
    },
    xPermittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },
    xPoweredBy: false,
    xXssProtection: false,
  });

  setupCors(app, appConfig);
  setupCrawlerHeaders(app);
  await setupPublicAssets(app);

  app.setGlobalPrefix(appConfig.apiPrefix, {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig.apiVersion,
  });

  if (appConfig.docsEnabled) {
    await setupSwagger(app, appConfig);
  }

  if (appConfig.nodeEnv === Environment.Test) {
    app.enableShutdownHooks();
    return;
  }

  setupGracefulShutdown({ app });
}
