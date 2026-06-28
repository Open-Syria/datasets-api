# Deployment

`datasets-api` is a standalone NestJS service. It serves a public read-only API and should be deployed separately from the OpenSyria website and any future admin or subscription backend.

## Runtime Requirements

- Node.js 24 or the provided Docker image
- pnpm 11 for local builds
- Redis when `REDIS_ENABLED=true`
- Synced dataset release artifacts when public dataset endpoints should serve real records
- PostgreSQL/PostGIS when `DATABASE_ENABLED=true`

## Release Commands

Run these from a full checkout or CI release job with dev dependencies installed:

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm run db:migrate:deploy
DATASETS_RELEASE_SOURCES="Open-Syria/data-geography@v0.1.0" pnpm run datasets:sync
DATASETS_RELEASE_SOURCES="Open-Syria/data-geography@v0.1.0" DATABASE_ENABLED=true pnpm run read-model:import:geography
```

The import step must finish before a production instance is marked ready.

For local or CI verification against PostgreSQL:

```bash
DATABASE_URL="postgresql://opensyria:opensyria@localhost:5432/opensyria_datasets?schema=public" pnpm run test:integration:db
```

## Runtime Commands

Start an already-built app:

```bash
pnpm run start:prod
```

If the Docker/runtime image is used for release sync or read-model import, use the production scripts. They run compiled `dist` files and do not rebuild the app:

```bash
DATASETS_RELEASE_SOURCES="Open-Syria/data-geography@v0.1.0" pnpm run datasets:sync:prod
DATABASE_ENABLED=true pnpm run read-model:import:geography:prod
```

## Docker

Build:

```bash
docker build -t opensyria/datasets-api .
```

Run without Redis:

```bash
docker run --rm -p 3000:3000 --env-file .env opensyria/datasets-api
```

Mount synced release artifacts:

```bash
docker run --rm -p 3000:3000 --env-file .env -v "$(pwd)/data/releases:/app/data/releases:ro" opensyria/datasets-api
```

Run a one-off import job from the built image after migrations have already been applied:

```bash
docker run --rm --env-file .env -v "$(pwd)/data/releases:/app/data/releases:ro" opensyria/datasets-api pnpm run read-model:import:geography:prod
```

Run a one-off sync job into a writable release volume:

```bash
docker run --rm --env-file .env -v "$(pwd)/data/releases:/app/data/releases" opensyria/datasets-api pnpm run datasets:sync:prod
```

## Health Checks

- `GET /health/live` checks that the process is alive.
- `GET /health/ready` checks runtime dependencies and release readiness.
- `GET /health` returns the aggregate public health payload.

`/health/ready` returns HTTP 503 when a required dependency is unavailable. Optional dependencies may still mark the body as `degraded` without failing the readiness probe.

## Production Notes

- Keep `APP_DOCS_ENABLED=true` only if public API documentation should be exposed by that environment.
- Set `APP_CORS_ORIGIN` to the exact frontend origins that should call the API from browsers.
- Set `REDIS_REQUIRED=true` when the deployment must fail closed if Redis is unavailable.
- Set `DATABASE_ENABLED=true` and `DATABASE_REQUIRED=true` when endpoints should serve from the database read model.
- Keep `DATASETS_REQUIRE_RELEASES=true` for environments that must not boot without synced dataset manifests.
- Do not bake private tokens into the Docker image. Use runtime environment variables such as `GITHUB_TOKEN` only during controlled sync steps.
