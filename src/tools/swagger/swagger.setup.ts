import type { ServerResponse } from 'node:http';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import type { AppConfig } from '../../config/app/app-config.type';
import { Environment } from '../../constants/app.constants';

type OpenApiSource = {
  audience: 'core' | 'geography' | 'education';
  title: string;
  description: string;
  path: string;
  matchesPath: (path: string) => boolean;
};

const COMMON_PATHS = ['/health'];

const OPENAPI_SOURCES: OpenApiSource[] = [
  {
    audience: 'core',
    title: 'Core API',
    description: 'Core metadata, health, releases, and dataset discovery endpoints.',
    path: '/openapi/core.json',
    matchesPath: (path) =>
      COMMON_PATHS.includes(path) || path === '/api/v1/datasets' || path === '/api/v1/releases',
  },
  {
    audience: 'geography',
    title: 'Geography API',
    description: 'Administrative geography endpoints.',
    path: '/openapi/geography.json',
    matchesPath: (path) => COMMON_PATHS.includes(path) || path.startsWith('/api/v1/geography/'),
  },
  {
    audience: 'education',
    title: 'Education API',
    description: 'University and higher education endpoints.',
    path: '/openapi/education.json',
    matchesPath: (path) => COMMON_PATHS.includes(path) || path.startsWith('/api/v1/universities'),
  },
];

function cloneOpenApiDocument(document: OpenAPIObject): OpenAPIObject {
  return structuredClone(document);
}

function filterOpenApiDocument(document: OpenAPIObject, source: OpenApiSource): OpenAPIObject {
  const filteredDocument = cloneOpenApiDocument(document);

  filteredDocument.info = {
    ...filteredDocument.info,
    title: `OpenSyria ${source.title}`,
    description: source.description,
  };
  filteredDocument.paths = Object.fromEntries(
    Object.entries(document.paths).filter(([path]) => source.matchesPath(path)),
  );

  return filteredDocument;
}

function registerOpenApiRoute(app: NestFastifyApplication, path: string, document: OpenAPIObject) {
  const fastify = app.getHttpAdapter().getInstance();

  fastify.get(path, (_request, reply) => {
    reply.type('application/json').send(document);
  });
}

async function registerScalarRoute(app: NestFastifyApplication, appConfig: AppConfig) {
  const fastify = app.getHttpAdapter().getInstance();

  if (appConfig.nodeEnv === Environment.Test) {
    fastify.get('/docs', (_request, reply) => {
      reply.type('text/html').send('<!doctype html><title>OpenSyria API Reference</title>');
    });
    return;
  }

  const { apiReference } = await import('@scalar/nestjs-api-reference');
  const handler = apiReference({
    title: `${appConfig.name} API Reference`,
    pageTitle: `${appConfig.name} API Reference`,
    withFastify: true,
    sources: OPENAPI_SOURCES.map((source, index) => ({
      title: source.title,
      url: source.path,
      default: index === 0,
    })),
  }) as (request: FastifyRequest, response: ServerResponse) => void;

  fastify.get('/docs', (request, reply) => {
    reply.hijack();
    handler(request, reply.raw);
  });
}

export async function setupSwagger(app: NestFastifyApplication, appConfig: AppConfig) {
  const documentConfig = new DocumentBuilder()
    .setTitle('OpenSyria Datasets API')
    .setDescription('Read-only public API for released OpenSyria datasets.')
    .setVersion('0.0.1')
    .setOpenAPIVersion('3.1.0')
    .addServer(appConfig.url)
    .addTag('Health', 'Operational health endpoint.')
    .addTag('Dataset Discovery', 'Dataset metadata and release discovery.')
    .addTag('Geography', 'Administrative geography endpoints.')
    .addTag('Universities', 'University and higher education endpoints.')
    .addTag('Transport', 'Civil transport node endpoints.')
    .addTag('Heritage', 'Cultural and heritage endpoints.')
    .addTag('Telecom', 'Telecom dialing metadata endpoints.')
    .build();

  const baseDocument = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, documentConfig, {
      operationIdFactory: (_controllerKey, methodKey) => methodKey,
    }),
    { version: '3.1' },
  );
  const documents = new Map<OpenApiSource['audience'], OpenAPIObject>();

  for (const source of OPENAPI_SOURCES) {
    const document = filterOpenApiDocument(baseDocument, source);
    documents.set(source.audience, document);
    registerOpenApiRoute(app, source.path, document);
  }

  registerOpenApiRoute(app, '/openapi.json', documents.get('core') ?? baseDocument);

  SwaggerModule.setup('swagger-ui', app, baseDocument, {
    raw: false,
    jsonDocumentUrl: '/openapi.json',
    swaggerOptions: {
      urls: OPENAPI_SOURCES.map((source) => ({
        name: source.title,
        url: source.path,
      })),
    },
  });
  await registerScalarRoute(app, appConfig);
}
