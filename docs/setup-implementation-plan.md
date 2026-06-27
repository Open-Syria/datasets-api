# Datasets API Setup Implementation Plan

This plan describes how to evolve the empty `datasets-api` NestJS app into the first production-ready OpenSyria read-only API foundation.

The plan is based on patterns observed in a mature sibling NestJS backend:

- Fastify adapter bootstrapping in `main.ts`
- Separate app setup in `app.setup.ts`
- Config-driven application setup
- Swagger/OpenAPI generation with Scalar API Reference
- Multiple OpenAPI documents from one base document
- `nestjs-zod` DTOs, validation, serialization, and OpenAPI cleanup
- Global exception filters and consistent response envelopes

The OpenSyria API should borrow the useful foundation while avoiding unrelated complexity such as auth, queues, uploads, billing, admin dashboards, or worker concerns. Redis and i18n are part of the foundation because the public API will need caching, lightweight rate limiting, localized response messages, and language-aware dataset behavior.

The API repository is public but maintainer-led. Community contribution should be directed mainly to dataset repositories, where contributors can fix data, add missing records, improve sources, and propose schema changes through a controlled review process.

## Goals

- Move the API from Express to Fastify.
- Add config-driven bootstrapping.
- Add global Zod request validation and response serialization.
- Add a small response and error envelope convention.
- Add OpenAPI 3.1 documentation.
- Add Scalar docs at `/docs`.
- Support multiple OpenAPI JSON documents from the beginning.
- Standardize response helpers, Swagger decorators, DTO naming, endpoint names, tags, summaries, and descriptions.
- Keep the app standalone, public, and read-only.
- Add Redis as shared infrastructure for caching, lightweight rate limiting, and future dataset release metadata.
- Add i18n for localized response messages and language negotiation.
- Preserve the existing pnpm, Biome, ESLint, Husky, commitlint, and supply-chain setup.

## Non-Goals

- No database yet.
- No Prisma yet.
- No auth.
- No admin API.
- No API key management.
- No subscription handling.
- No queues or workers.
- No uploads or multipart parsing.

## Implementation Status

The foundation pass is implemented:

- Fastify bootstrap and shared `setupApp`.
- Zod-validated app, Redis, cache, throttler, and i18n config.
- Structured logging with `nestjs-pino`.
- Redis client service, Redis-backed cache configuration, and Redis-backed throttler configuration.
- English and Arabic i18n message files.
- Global Zod validation, serialization, and exception filters.
- Local/test-safe graceful shutdown behavior.
- pnpm override for the Swagger transitive `js-yaml` advisory.
- Shared response helpers and DTO factories.
- Swagger/Scalar setup with multiple OpenAPI documents.
- Initial `/health` and `/api/v1/datasets` modules.
- E2E coverage for health, dataset discovery, i18n response messages, OpenAPI documents, Scalar docs, and Swagger UI.
- `/api/v1/releases` with initial release planning metadata.
- `/api/v1/geography/governorates` endpoint backed by the local release artifact reader when a verified `data-geography` release is present.
- Dataset loading model documented in [`dataset-loading.md`](./dataset-loading.md).
- Release manifest contract, local manifest loader, and in-memory dataset release registry.
- GitHub Release sync command for pinned manifests and artifacts.
- Local JSON artifact reader with SHA-256 and file-size verification.
- Reusable source attribution DTOs for public response payloads.
- First single-record detail endpoint pattern: `/api/v1/geography/governorates/:governorateId`.
- Query DTOs and filtering conventions for governorate lists.
- Health split into `/health/live`, `/health/ready`, and aggregate `/health`.
- Redis-backed cache use for verified local JSON artifacts.
- Standardized Swagger error examples.
- GitHub Actions CI, CodeQL, dependency review, Dependabot config, PR template, and issue templates.
- `CONTRIBUTING.md`.
- Dataset contribution policy for future data repositories.
- Dockerfile, `.dockerignore`, and deployment notes.

Next implementation phase:

- Add generated dataset artifact schema packages after the first data repository is created.
- Add more geography endpoints once `data-geography` publishes its first release shape.

## Target Dependencies

Install the minimum runtime dependencies for the foundation:

```bash
pnpm add @fastify/helmet @fastify/static @keyv/redis @nest-lab/throttler-storage-redis @nestjs/cache-manager @nestjs/config @nestjs/platform-fastify @nestjs/swagger @nestjs/throttler @scalar/nestjs-api-reference cache-manager dotenv fastify ioredis keyv nestjs-graceful-shutdown nestjs-i18n nestjs-pino nestjs-zod pino-http zod
```

After migrating the platform adapter:

```bash
pnpm remove @nestjs/platform-express
```

Notes:

- `@nestjs/platform-fastify` replaces `@nestjs/platform-express`.
- `@nestjs/swagger` generates the OpenAPI document.
- `@scalar/nestjs-api-reference` renders the modern API docs page.
- `@fastify/static` serves Swagger UI assets when using the Fastify adapter.
- `nestjs-zod` provides `createZodDto`, `ZodValidationPipe`, `ZodSerializerInterceptor`, `ZodResponse`, and `cleanupOpenApiDoc`.
- `@fastify/helmet` provides security headers.
- `@keyv/redis`, `keyv`, `cache-manager`, and `@nestjs/cache-manager` provide Redis-backed caching.
- `@nestjs/throttler` and `@nest-lab/throttler-storage-redis` provide Redis-backed rate limiting when public traffic needs it.
- `ioredis` provides explicit Redis client control where Keyv/throttler abstractions are not enough.
- `nestjs-i18n` provides localized response messages and language resolution.
- `nestjs-pino` gives structured request logging.
- `nestjs-graceful-shutdown` gives controlled shutdown behavior.
- pnpm supply-chain settings may block dependency build scripts. Review any blocked builds before adding packages to `allowBuilds`.

## Proposed File Layout

```text
src/
  main.ts
  app.module.ts
  app.setup.ts
  api/
    api.module.ts
    health/
      health.controller.ts
      health.dto.ts
      health.module.ts
      health.service.ts
    datasets/
      datasets.controller.ts
      datasets.dto.ts
      datasets.module.ts
      datasets.service.ts
  common/
    dto/
      api-response.dto.ts
      error.dto.ts
      pagination.dto.ts
    helpers/
      build-response.ts
      build-paginated-response.ts
    schemas/
      api-base-response.schema.ts
      error.schema.ts
      pagination.schema.ts
  config/
    load-env.ts
    config.type.ts
    app/
      app.config.ts
      app-config.type.ts
    cache/
      cache.config.ts
      cache-config.type.ts
    i18n/
      i18n.config.ts
      i18n-config.type.ts
    redis/
      redis.config.ts
      redis-config.type.ts
    throttler/
      throttler.config.ts
      throttler-config.type.ts
      throttler.factory.ts
  decorators/
    api-response.ts
    api-paginated-response.ts
    http-decorators.ts
  exception-filters/
    http-exception.filter.ts
    zod-validation-exception.filter.ts
  i18n/
    messages/
      ar/
        api.json
      en/
        api.json
    i18n.factory.ts
    translation-key.utils.ts
  shared/
    cache/
      cache.module.ts
      cache.service.ts
    redis/
      redis-connections.module.ts
      redis-connections.service.ts
  tools/
    logger/
      logger-factory.ts
    swagger/
      swagger.setup.ts
```

## Phase 1: Fastify Bootstrap

Update `main.ts` to create a `NestFastifyApplication`:

```ts
import './config/load-env';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { getConfig as getAppConfig } from './config/app/app.config';
import type { GlobalConfig } from './config/config.type';

async function bootstrap() {
  const appConfig = getAppConfig();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: appConfig.trustProxy,
    }),
    {
      bufferLogs: true,
    },
  );

  const configService = app.get(ConfigService<GlobalConfig>);
  const logger = app.get(Logger);

  app.useLogger(logger);
  await setupApp(app, configService);

  await app.listen({ port: appConfig.port, host: '0.0.0.0' });

  logger.log(`Server running at ${await app.getUrl()}`);
}

void bootstrap();
```

OpenSyria should not copy `bodyParser: false` unless a future integration specifically needs raw request control.

## Phase 2: App Setup

Create `app.setup.ts` for operational setup outside `main.ts`.

Responsibilities:

- Register `@fastify/helmet`.
- Configure CORS from app config.
- Set global prefix, likely `api`.
- Enable URI versioning with default version `1`.
- Exclude `/health` from the global prefix.
- Conditionally set up docs when `APP_DOCS_ENABLED` is true.
- Enable graceful shutdown.

Recommended public routes after prefix/versioning:

```text
GET /health
GET /api/v1/datasets
GET /api/v1/releases
GET /api/v1/geography/governorates
GET /api/v1/universities
```

Docs routes:

```text
GET /docs
GET /swagger-ui
GET /openapi.json
GET /openapi/core.json
GET /openapi/geography.json
GET /openapi/education.json
```

## Phase 3: Config Foundation

Use `@nestjs/config` with Zod-validated environment parsing.

Initial environment variables:

```text
NODE_ENV=development
APP_NAME=opensyria-datasets-api
APP_PORT=3000
PORT=
APP_URL=http://localhost:3000
APP_API_PREFIX=api
APP_API_VERSION=1
APP_CORS_ORIGIN=*
APP_DOCS_ENABLED=true
APP_LOG_LEVEL=debug
APP_LOG_PRETTY=true
APP_TRUST_PROXY=false
IS_HTTPS=false
APP_FALLBACK_LANGUAGE=en
REDIS_URL=redis://localhost:6379
REDIS_REQUIRED=false
CACHE_TTL_SECONDS=300
CACHE_MAX_ITEMS=1000
THROTTLE_TTL_SECONDS=60
THROTTLE_LIMIT=120
```

Config rules:

- Prefer `APP_PORT`, fall back to `PORT`, then `3000`.
- Enable docs by default outside production and test.
- Keep CORS simple while the API is public and read-only.
- Add stricter origin patterns later if browser credentials or private routes ever exist.
- Use Redis config from `REDIS_URL`; support relaxing Redis only in local/test.
- Resolve response language from `?lang=`, `x-lang`, then `Accept-Language`.
- Support Arabic and English from the first public implementation.

## Phase 4: AppModule Composition

`AppModule` should stay much smaller than the reference backend.

Initial imports:

- `ConfigModule.forRoot`
- `GracefulShutdownModule.forRoot`
- `I18nModule.forRootAsync`
- `LoggerModule.forRootAsync`
- `CacheModule`
- `RedisConnectionsModule`
- `ThrottlerModule.forRootAsync`
- `ApiModule`

Initial global providers:

- `APP_PIPE` with `ZodValidationPipe`
- `APP_INTERCEPTOR` with `ZodSerializerInterceptor`
- `APP_FILTER` with `GlobalHttpExceptionFilter`
- `APP_FILTER` with `ZodValidationExceptionFilter`

Do not add BullMQ, AWS, uploads, auth, or admin modules.

Redis usage should stay small and infrastructure-focused:

- cache expensive or frequently requested dataset metadata,
- store rate-limit counters,
- support future dataset release manifests,
- report Redis status in `/health`.

i18n usage should also stay focused:

- localize response `message` values,
- localize validation/error messages where practical,
- avoid translating canonical dataset names unless the data record itself contains localized fields.

## Phase 5: Zod DTO and Response Convention

Use `nestjs-zod` as the single DTO pattern.

The detailed standards for DTO naming, response helpers, Swagger decorators, endpoint tags, summaries, descriptions, and review checklists live in [`api-standards.md`](./api-standards.md). Treat that document as the implementation contract for every controller.

Example DTO style:

```ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const datasetSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  repository: z.string(),
  status: z.enum(['planned', 'seed', 'released', 'deprecated']),
});

export class DatasetSummaryDto extends createZodDto(datasetSummarySchema) {}
```

Use response envelopes from day one:

```ts
{
  success: true,
  status: 200,
  message: 'Datasets returned',
  data: [],
  meta: {
    count: 0
  },
  timestamp: '2026-06-27T00:00:00.000Z'
}
```

Recommended common schemas:

- `apiBaseResponseSchema`
- `errorSchema`
- `offsetPaginationSchema`
- `datasetVersionSchema`
- `sourceAttributionSchema`

Keep cursor pagination out until an endpoint needs it.

Required helper and DTO factory files:

```text
common/helpers/build-response.ts
common/helpers/build-offset-paginated-response.ts
common/dto/api-base-response.dto.ts
common/dto/api-response.dto.ts
common/dto/error.dto.ts
common/dto/offset-pagination/offset-paginated-response.dto.ts
decorators/api-response.ts
decorators/api-paginated-response.ts
decorators/http-decorators.ts
```

These helpers should be implemented before adding domain endpoints, so every response and OpenAPI entry is generated through the same path.

## Phase 6: Swagger and Scalar

Create `src/tools/swagger/swagger.setup.ts`.

Documentation should be generated from controller decorators and Zod DTOs. Do not maintain manual endpoint schema docs outside OpenAPI.

Use this pattern:

1. Build a base OpenAPI config with `DocumentBuilder`.
2. Create one base document using `SwaggerModule.createDocument`.
3. Pass it through `cleanupOpenApiDoc`.
4. Derive multiple documents by filtering paths.
5. Register each OpenAPI JSON route manually through the Fastify instance.
6. Register Swagger UI as a fallback.
7. Register Scalar at `/docs`.

Initial OpenAPI sources:

```ts
type OpenApiAudience = 'core' | 'geography' | 'education';

const OPENAPI_SOURCES = [
  {
    audience: 'core',
    description: 'Core metadata, health, releases, and dataset discovery endpoints',
    path: '/openapi/core.json',
    title: 'Core API',
  },
  {
    audience: 'geography',
    description: 'Administrative geography endpoints',
    path: '/openapi/geography.json',
    title: 'Geography API',
  },
  {
    audience: 'education',
    description: 'University and higher education endpoints',
    path: '/openapi/education.json',
    title: 'Education API',
  },
] as const;
```

Future sources:

- `transport`
- `heritage`
- `telecom`

Filtering strategy:

- Always include `/health`.
- Always include `/api/v1/datasets` and `/api/v1/releases` in the `core` document.
- Route category documents by the first domain path segment:
  - `/api/v1/geography/*` -> `geography`
  - `/api/v1/universities/*` -> `education`
  - `/api/v1/transport/*` -> `transport`
  - `/api/v1/heritage/*` -> `heritage`
  - `/api/v1/telecom/*` -> `telecom`

Scalar setup:

```ts
app.use(
  '/docs',
  apiReference({
    title: `${appConfig.name} API Reference`,
    sources: OPENAPI_SOURCES.map((source, index) => ({
      url: source.path,
      title: source.title,
      default: index === 0,
    })),
    proxyUrl: '',
    withFastify: true,
  }),
);
```

Swagger UI fallback:

```text
/swagger-ui
```

Legacy/default OpenAPI JSON:

```text
/openapi.json
```

This should point to the `core` document at first, or to an aggregate document if consumers expect one complete schema.

## Phase 7: Decorator Helpers

Add small helpers inspired by the reference backend:

- `ApiPublic`
- `ApiResponse`
- `ApiPaginatedResponse`

For OpenSyria, avoid `ApiProtected` until auth exists.

The decorator helper should:

- Set operation tags and summaries.
- Register success response schemas through `ZodResponse`.
- Register standard error response DTOs.
- Keep controller methods visually small.

Example target controller style:

```ts
@Controller('datasets')
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Get()
  @ApiPublic({
    type: DatasetSummaryListDto,
    tags: ['Datasets'],
    summary: 'List available OpenSyria datasets',
  })
  getDatasets() {
    return this.datasetsService.getDatasets();
  }
}
```

## Phase 8: First Endpoint Modules

Create only two endpoint modules at first:

```text
health
datasets
```

Health endpoint:

- Path: `/health`
- Version neutral
- Not under `/api`
- No database checks yet
- Include Redis status and latency
- Returns app name, environment, uptime, and status

Datasets endpoint:

- Path: `/api/v1/datasets`
- Returns planned dataset metadata
- Static data is acceptable until data repo releases exist

## Phase 9: Tests and CI

Update tests for Fastify:

- E2E bootstraps `NestFastifyApplication`.
- Test `/health`.
- Test `/health` when Redis is unavailable if Redis is optional in test mode.
- Test `/api/v1/datasets`.
- Test response language selection through `?lang=ar`, `x-lang`, and `Accept-Language`.
- Test `/openapi.json` when docs are enabled.
- Test `/docs` only enough to confirm route availability.

Validation command remains:

```bash
pnpm run validate
```

CI should continue using:

```bash
pnpm install --frozen-lockfile
pnpm run validate
```

## Phase 10: Acceptance Criteria

The setup is complete when:

- `pnpm run validate` passes.
- The app boots with Fastify.
- `@nestjs/platform-express` is removed.
- `/health` returns a version-neutral health response with Redis status.
- `/api/v1/datasets` returns a Zod-serialized response.
- Response messages are localizable through `nestjs-i18n`.
- Redis-backed cache and throttler modules are configured.
- `/openapi.json` returns cleaned OpenAPI JSON.
- `/openapi/core.json` returns the core document.
- `/openapi/geography.json` returns only common and geography paths.
- `/openapi/education.json` returns only common and education paths.
- `/docs` renders Scalar with multiple document sources.
- `/swagger-ui` remains available as a fallback.
- Zod validation failures return the shared error envelope.
- Response helpers and Swagger decorators from `api-standards.md` are implemented.
- Endpoint tags, summaries, descriptions, DTO names, and response schemas follow `api-standards.md`.
- The README documents the new routes and setup commands.

## Deferred Decisions

### Data Loading

Start with in-memory/static metadata. The first real loader should read pinned, versioned release artifacts from the dataset repositories. See [`dataset-loading.md`](./dataset-loading.md).

### Redis Strictness

Decide whether Redis is required in every environment or optional in local/test. Recommended behavior:

- production/staging: fail fast if Redis is unavailable,
- development: warn but allow app boot if `REDIS_REQUIRED=false`,
- test: use an in-memory substitute or disable Redis-backed checks.

### Throttling Defaults

Use conservative public defaults at first. Increase or disable throttling only after observing real API traffic.

### Authentication

Do not add auth to `datasets-api`. API keys/subscriptions should belong to a future private platform backend or gateway layer.

### Dataset Language Semantics

`nestjs-i18n` should localize API response messages, not invent dataset translations. Dataset records should expose their own language-aware fields, such as `name.ar`, `name.en`, `aliases`, and `transliterations`.

## Reference Notes

- `nestjs-zod` documents `createZodDto`, `ZodValidationPipe`, `ZodSerializerInterceptor`, `ZodResponse`, and `cleanupOpenApiDoc`: <https://github.com/BenLorantfy/nestjs-zod>
- Scalar's NestJS adapter supports `apiReference` and requires `withFastify: true` when Nest uses the Fastify adapter: <https://scalar.com/products/api-references/integrations/nestjs>
- The reference backend uses path filtering to derive audience-specific OpenAPI documents. OpenSyria should reuse that concept, but with dataset-domain documents instead of admin/mobile/website audiences.
