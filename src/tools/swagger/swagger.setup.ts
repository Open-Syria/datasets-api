import type { ServerResponse } from 'node:http';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import type { AppConfig } from '../../config/app/app-config.type';
import { Environment } from '../../constants/app.constants';

type OpenApiSource = {
  title: string;
  description: string;
  path: string;
  matchesPath: (path: string) => boolean;
};

type OpenApiParameter = {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
};

type OpenApiOperation = {
  tags?: unknown;
  parameters?: OpenApiParameter[];
};

const OPENAPI_TAGS = [
  {
    name: 'Health',
    description: 'Operational health endpoint.',
  },
  {
    name: 'Dataset Discovery',
    description: 'Dataset metadata and release discovery.',
  },
  {
    name: 'Releases',
    description: 'Released dataset bundle metadata.',
  },
  {
    name: 'Geography',
    description: 'Administrative geography endpoints.',
  },
] as const;

const COMMON_PATHS = ['/health', '/health/live', '/health/ready'];

const LOCALE_HEADER_PARAMETER = {
  name: 'X-Lang',
  in: 'header',
  required: false,
  description:
    'Preferred locale for response messages. Supported values are en and ar. Multilingual data fields are still returned as locale-keyed objects.',
  schema: {
    type: 'string',
    enum: ['en', 'ar'],
    default: 'en',
  },
} as const satisfies OpenApiParameter;

const FILTERED_OPENAPI_SOURCES: OpenApiSource[] = [
  {
    title: 'Core API',
    description: 'Core metadata, health, releases, and dataset discovery endpoints.',
    path: '/openapi/core.json',
    matchesPath: (path) =>
      COMMON_PATHS.includes(path) || path === '/api/v1/datasets' || path === '/api/v1/releases',
  },
  {
    title: 'Geography API',
    description: 'Administrative geography endpoints.',
    path: '/openapi/geography.json',
    matchesPath: (path) => COMMON_PATHS.includes(path) || path.startsWith('/api/v1/geography/'),
  },
];

function cloneOpenApiDocument(document: OpenAPIObject): OpenAPIObject {
  return structuredClone(document);
}

function getOperationTags(operation: unknown): string[] {
  if (!operation || typeof operation !== 'object' || !('tags' in operation)) {
    return [];
  }

  const { tags } = operation as OpenApiOperation;

  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter((tag): tag is string => typeof tag === 'string');
}

function isOpenApiOperation(value: unknown): value is OpenApiOperation {
  return typeof value === 'object' && value !== null;
}

function addLocaleHeaderParameter(document: OpenAPIObject): OpenAPIObject {
  const updatedDocument = cloneOpenApiDocument(document);

  for (const pathItem of Object.values(updatedDocument.paths)) {
    if (!pathItem) {
      continue;
    }

    for (const operation of Object.values(pathItem)) {
      if (!isOpenApiOperation(operation)) {
        continue;
      }

      const parameters = operation.parameters ?? [];
      const hasLocaleHeader = parameters.some(
        (parameter) =>
          parameter.in === LOCALE_HEADER_PARAMETER.in &&
          parameter.name.toLowerCase() === LOCALE_HEADER_PARAMETER.name.toLowerCase(),
      );

      if (!hasLocaleHeader) {
        operation.parameters = [LOCALE_HEADER_PARAMETER, ...parameters];
      }
    }
  }

  return updatedDocument;
}

function getUsedOpenApiTags(paths: OpenAPIObject['paths']): Set<string> {
  const tags = new Set<string>();

  for (const pathItem of Object.values(paths)) {
    if (!pathItem) {
      continue;
    }

    for (const operation of Object.values(pathItem)) {
      for (const tag of getOperationTags(operation)) {
        tags.add(tag);
      }
    }
  }

  return tags;
}

function filterOpenApiDocument(document: OpenAPIObject, source: OpenApiSource): OpenAPIObject {
  const filteredDocument = cloneOpenApiDocument(document);
  const paths = Object.fromEntries(
    Object.entries(document.paths).filter(([path]) => source.matchesPath(path)),
  );
  const usedTags = getUsedOpenApiTags(paths);

  filteredDocument.info = {
    ...filteredDocument.info,
    title: `OpenSyria ${source.title}`,
    description: source.description,
  };
  filteredDocument.paths = paths;
  filteredDocument.tags = filteredDocument.tags?.filter((tag) => usedTags.has(tag.name));

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
    sources: [
      {
        title: 'OpenSyria Datasets API',
        url: '/openapi.json',
        default: true,
      },
    ],
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
    .addServer(appConfig.url);

  for (const tag of OPENAPI_TAGS) {
    documentConfig.addTag(tag.name, tag.description);
  }

  const baseDocument = addLocaleHeaderParameter(
    cleanupOpenApiDoc(
      SwaggerModule.createDocument(app, documentConfig.build(), {
        autoTagControllers: false,
        operationIdFactory: (_controllerKey, methodKey) => methodKey,
      }),
      { version: '3.1' },
    ),
  );

  registerOpenApiRoute(app, '/openapi.json', baseDocument);

  for (const source of FILTERED_OPENAPI_SOURCES) {
    const document = filterOpenApiDocument(baseDocument, source);
    registerOpenApiRoute(app, source.path, document);
  }

  SwaggerModule.setup('swagger-ui', app, baseDocument, {
    raw: false,
    jsonDocumentUrl: '/openapi.json',
  });
  await registerScalarRoute(app, appConfig);
}
