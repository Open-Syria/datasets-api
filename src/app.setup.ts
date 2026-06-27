import fastifyHelmet from '@fastify/helmet';
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

const DEFAULT_ALLOWED_METHODS = 'GET,HEAD,OPTIONS';
const DEFAULT_ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With, X-Lang';
const DEFAULT_EXPOSED_HEADERS = 'X-Request-Id';

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
    const requestedMethod = request.headers['access-control-request-method'];

    reply.header(
      'Access-Control-Allow-Methods',
      requestedMethod ? `${requestedMethod}, OPTIONS` : DEFAULT_ALLOWED_METHODS,
    );
    reply.header('Access-Control-Allow-Headers', requestedHeaders ?? DEFAULT_ALLOWED_HEADERS);
    reply.status(204).send();
  });
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
    strictTransportSecurity: appConfig.isHttps,
    contentSecurityPolicy: getContentSecurityPolicy(appConfig),
  });

  setupCors(app, appConfig);

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
