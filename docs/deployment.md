# Deployment

`datasets-api` is a standalone NestJS service. It serves a public read-only API and should be deployed separately from the OpenSyria website and any future admin or subscription backend.

## Runtime Requirements

- Node.js 24 or the provided Docker image
- pnpm 11 for local builds
- Redis when `REDIS_ENABLED=true`
- Synced dataset release artifacts when public dataset endpoints should serve real records

## Required Runtime Commands

Build:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

Start:

```bash
pnpm run start:prod
```

Sync pinned dataset releases before starting the app:

```bash
DATASETS_RELEASE_SOURCES="Open-Syria/data-geography@v0.1.0" pnpm run datasets:sync
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

## Health Checks

- `GET /health/live` checks that the process is alive.
- `GET /health/ready` checks runtime dependencies and release readiness.
- `GET /health` returns the aggregate public health payload.

## Production Notes

- Keep `APP_DOCS_ENABLED=true` only if public API documentation should be exposed by that environment.
- Set `APP_CORS_ORIGINS` to the exact frontend origins that should call the API from browsers.
- Set `REDIS_REQUIRED=true` only when the deployment must fail closed if Redis is unavailable.
- Keep `DATASETS_REQUIRE_RELEASES=true` for environments that must not boot without synced dataset manifests.
- Do not bake private tokens into the Docker image. Use runtime environment variables such as `GITHUB_TOKEN` only during controlled sync steps.

