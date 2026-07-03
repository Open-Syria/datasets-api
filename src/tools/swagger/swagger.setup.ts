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

const API_DOCUMENT_TITLE = 'OpenSyria Datasets API';
const API_REFERENCE_TITLE = 'OpenSyria Datasets API Reference';
const API_DOCUMENT_DESCRIPTION =
  'Public read-only API for stable, versioned OpenSyria reference datasets. Released endpoints cover Syrian administrative geography and public university profiles, including release metadata, source attribution, university logos, and ranking snapshots.';
const API_REFERENCE_APPLICATION_NAME = 'OpenSyria';
const API_REFERENCE_FAVICON_PATH = '/favicon.ico';
const API_REFERENCE_SVG_ICON_PATH = '/favicon.svg';
const API_REFERENCE_APPLE_TOUCH_ICON_PATH = '/apple-touch-icon.png';
const API_REFERENCE_MANIFEST_PATH = '/site.webmanifest';
const API_REFERENCE_LIGHT_THEME_COLOR = '#f8f7ef';
const API_REFERENCE_DARK_THEME_COLOR = '#10160f';
const API_REFERENCE_CUSTOM_CSS = `
.light-mode {
  --scalar-font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --scalar-font-code: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  --scalar-color-1: oklch(0.24 0.022 135);
  --scalar-color-2: oklch(0.48 0.03 125);
  --scalar-color-3: color-mix(in oklab, oklch(0.48 0.03 125) 72%, transparent);
  --scalar-color-accent: oklch(0.48 0.11 172);
  --scalar-background-1: oklch(0.994 0.004 95);
  --scalar-background-2: oklch(0.968 0.018 106);
  --scalar-background-3: oklch(0.945 0.04 84);
  --scalar-background-accent: color-mix(in oklab, oklch(0.48 0.11 172) 12%, transparent);
  --scalar-border-color: oklch(0.89 0.02 112);
}

.dark-mode {
  --scalar-font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --scalar-font-code: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  --scalar-color-1: oklch(0.975 0.01 100);
  --scalar-color-2: oklch(0.78 0.03 108);
  --scalar-color-3: color-mix(in oklab, oklch(0.78 0.03 108) 68%, transparent);
  --scalar-color-accent: oklch(0.78 0.11 170);
  --scalar-background-1: oklch(0.19 0.015 142);
  --scalar-background-2: oklch(0.225 0.018 140);
  --scalar-background-3: oklch(0.28 0.02 134);
  --scalar-background-accent: color-mix(in oklab, oklch(0.78 0.11 170) 16%, transparent);
  --scalar-border-color: oklch(1 0 0 / 10%);
}

.light-mode .sidebar,
.dark-mode .sidebar {
  --scalar-sidebar-background-1: var(--scalar-background-1);
  --scalar-sidebar-border-color: var(--scalar-border-color);
  --scalar-sidebar-color-1: var(--scalar-color-1);
  --scalar-sidebar-color-2: var(--scalar-color-2);
  --scalar-sidebar-color-active: var(--scalar-color-1);
  --scalar-sidebar-item-hover-color: var(--scalar-color-1);
  --scalar-sidebar-item-hover-background: var(--scalar-background-2);
  --scalar-sidebar-item-active-background: var(--scalar-background-accent);
  --scalar-sidebar-search-background: var(--scalar-background-2);
  --scalar-sidebar-search-border-color: var(--scalar-border-color);
  --scalar-sidebar-search-color: var(--scalar-color-2);
}

.scalar-app {
  background: var(--scalar-background-1);
}
`;

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
  {
    name: 'Universities',
    description: 'Higher education institution profile endpoints.',
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
  {
    title: 'Universities API',
    description: 'Higher education institution profile endpoints.',
    path: '/openapi/universities.json',
    matchesPath: (path) => COMMON_PATHS.includes(path) || path.startsWith('/api/v1/universities'),
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

function getApiReferenceHeadMetadata(indent = '  ') {
  return [
    `<meta name="application-name" content="${API_REFERENCE_APPLICATION_NAME}">`,
    `<meta name="description" content="${API_DOCUMENT_DESCRIPTION}">`,
    `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${API_REFERENCE_LIGHT_THEME_COLOR}">`,
    `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${API_REFERENCE_DARK_THEME_COLOR}">`,
    `<link rel="icon" href="${API_REFERENCE_FAVICON_PATH}" sizes="any">`,
    `<link rel="icon" href="${API_REFERENCE_SVG_ICON_PATH}" type="image/svg+xml">`,
    `<link rel="apple-touch-icon" href="${API_REFERENCE_APPLE_TOUCH_ICON_PATH}">`,
    `<link rel="manifest" href="${API_REFERENCE_MANIFEST_PATH}">`,
  ]
    .map((tag) => `${indent}${tag}`)
    .join('\n');
}

function renderApiReferenceFallbackHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${getApiReferenceHeadMetadata()}
  <title>${API_REFERENCE_TITLE}</title>
</head>
<body></body>
</html>`;
}

function appendScalarHtmlChunk(chunks: string[], chunk: unknown) {
  if (chunk === null || chunk === undefined) {
    return;
  }

  if (typeof chunk === 'string') {
    chunks.push(chunk);
    return;
  }

  if (Buffer.isBuffer(chunk)) {
    chunks.push(chunk.toString('utf8'));
    return;
  }

  if (chunk instanceof Uint8Array) {
    chunks.push(Buffer.from(chunk).toString('utf8'));
    return;
  }

  chunks.push(String(chunk));
}

function renderScalarHandlerHtml(
  handler: (request: FastifyRequest, response: ServerResponse) => void,
  request: FastifyRequest,
) {
  const chunks: string[] = [];
  const response = {
    writeHead: () => undefined,
    write: (chunk: unknown) => {
      appendScalarHtmlChunk(chunks, chunk);
      return true;
    },
    end: (chunk?: unknown) => {
      appendScalarHtmlChunk(chunks, chunk);
    },
  } as unknown as ServerResponse;

  handler(request, response);

  return chunks.join('');
}

function injectApiReferenceHeadMetadata(html: string) {
  return html.replace('</head>', `${getApiReferenceHeadMetadata('    ')}\n  </head>`);
}

async function registerScalarRoute(app: NestFastifyApplication, appConfig: AppConfig) {
  const fastify = app.getHttpAdapter().getInstance();

  if (appConfig.nodeEnv === Environment.Test) {
    fastify.get('/docs', (_request, reply) => {
      reply.type('text/html').send(renderApiReferenceFallbackHtml());
    });
    return;
  }

  const { apiReference } = await import('@scalar/nestjs-api-reference');
  const handler = apiReference({
    title: API_REFERENCE_TITLE,
    pageTitle: API_REFERENCE_TITLE,
    theme: 'none',
    layout: 'modern',
    darkMode: true,
    hideDarkModeToggle: false,
    favicon: API_REFERENCE_FAVICON_PATH,
    customCss: API_REFERENCE_CUSTOM_CSS,
    withFastify: true,
    sources: [
      {
        title: API_DOCUMENT_TITLE,
        url: '/openapi.json',
        default: true,
      },
    ],
  }) as (request: FastifyRequest, response: ServerResponse) => void;

  fastify.get('/docs', (request, reply) => {
    const html = renderScalarHandlerHtml(handler, request);
    reply.type('text/html').send(injectApiReferenceHeadMetadata(html));
  });
}

export async function setupSwagger(app: NestFastifyApplication, appConfig: AppConfig) {
  const documentConfig = new DocumentBuilder()
    .setTitle(API_DOCUMENT_TITLE)
    .setDescription(API_DOCUMENT_DESCRIPTION)
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
    customfavIcon: API_REFERENCE_FAVICON_PATH,
    customSiteTitle: API_REFERENCE_TITLE,
  });
  await registerScalarRoute(app, appConfig);
}
