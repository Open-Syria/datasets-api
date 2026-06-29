# Deployment

`datasets-api` serves the public read-only OpenSyria dataset API and is deployed separately from website and administrative services.

## Table of Contents

- [Runtime Requirements](#runtime-requirements)
- [Release Commands](#release-commands)
- [Runtime Environment](#runtime-environment)
- [Runtime Commands](#runtime-commands)
- [Docker](#docker)
- [GitHub Actions Deployment](#github-actions-deployment)
- [Redis Cache](#redis-cache)
- [Health Checks](#health-checks)
- [Production Notes](#production-notes)

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
pnpm run release:check -- --geography-release v0.1.3
pnpm run db:migrate:deploy
pnpm run datasets:sync
DATABASE_ENABLED=true pnpm run read-model:import:geography
```

Use `pnpm run release:check:docker -- --geography-release v0.1.3` when Docker is available and the release job should also build the runtime image locally.

The import step must finish before a production instance is marked ready.

For local or CI verification against PostgreSQL:

```bash
DATABASE_URL="postgresql://opensyria:opensyria@localhost:5432/opensyria_datasets?schema=public" pnpm run test:integration:db
```

## Runtime Environment

The GitHub production deployment writes `/srv/opensyria/datasets-api/.env` on
the server before running the blue/green deployment script. Do not hand-edit the
server `.env` for normal production changes; update GitHub production
environment variables/secrets instead.

The generated runtime `.env` enables:

```text
NODE_ENV=production
APP_URL=https://api.opensyria.org
APP_TRUST_PROXY=true
IS_HTTPS=true
DATASETS_REQUIRE_RELEASES=true
DATABASE_ENABLED=true
DATABASE_REQUIRED=true
REDIS_ENABLED=true
REDIS_REQUIRED=true
```

Dataset release pins still come from `dataset-releases.json` in the runtime
image. `DATASETS_RELEASE_SOURCES_OVERRIDE` remains `false` unless a deliberate
one-off operational override is needed.

## Runtime Commands

Start an already-built app:

```bash
pnpm run start:prod
```

If the Docker/runtime image is used for release sync or read-model import, use the production scripts. They run compiled `dist` files and do not rebuild the app:

```bash
pnpm run datasets:sync:prod
DATABASE_ENABLED=true pnpm run read-model:import:geography:prod
```

## Docker

Build:

```bash
docker build -t opensyria/datasets-api .
```

Build the production runtime target:

```bash
docker build --target runtime -t opensyria/datasets-api .
```

Build the migration target:

```bash
docker build --target migrations -t opensyria/datasets-api:migrations .
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

## GitHub Actions Deployment

Production deployment is handled by `.github/workflows/deploy-production.yml`.

Push commits containing `[skip ci]` or `[ci skip]` skip the CI, CodeQL push job, and production deployment workflow jobs. Manual `workflow_dispatch` deployments and scheduled CodeQL analysis still run.

The workflow:

1. Runs the release readiness check.
2. Builds a Linux ARM64 runtime image for `opensyria-prod`.
3. Builds a Linux ARM64 migration image from the Docker `migrations` target.
4. Pushes both images to GitHub Container Registry.
5. Joins the tailnet with `tailscale/github-action@v4`.
6. Copies `deploy/datasets-api` to `/srv/opensyria/datasets-api`.
7. Runs the blue/green deployment script on the server.

Dataset release pins are stored in `dataset-releases.json` and copied into the
runtime image. Server `.env` values can only override the lock file when
`DATASETS_RELEASE_SOURCES_OVERRIDE=true` is set deliberately.

Images are pushed to GHCR using the built-in `GITHUB_TOKEN` with `packages: write`.

Runtime image tags:

```text
ghcr.io/open-syria/datasets-api:sha-<short-sha>
ghcr.io/open-syria/datasets-api:main
```

Migration image tags:

```text
ghcr.io/open-syria/datasets-api:sha-<short-sha>-migrations
ghcr.io/open-syria/datasets-api:main-migrations
```

The server pulls the SHA-pinned tags produced by the current workflow run.

Required production environment secrets:

```text
TS_OAUTH_CLIENT_ID
TS_AUDIENCE
DEPLOY_SSH_PRIVATE_KEY
DEPLOY_SSH_KNOWN_HOSTS
POSTGRES_PASSWORD
```

Required production environment variables:

```text
DEPLOY_HOST
DEPLOY_USER
```

Optional production environment variables:

```text
POSTGRES_DB=opensyria_datasets
POSTGRES_USER=opensyria
APP_URL=https://api.opensyria.org
APP_CORS_ORIGIN=*
APP_DOCS_ENABLED=true
THROTTLE_FREE_TIER_DAILY_LIMIT=500
THROTTLE_FREE_TIER_DAILY_TTL_SECONDS=86400
```

Optional production environment secrets:

```text
DATASETS_GITHUB_TOKEN
```

`DATASETS_GITHUB_TOKEN` is only needed when syncing private dataset releases or
when GitHub API rate limits become a problem.

Secret placement recommendation:

- Use GitHub `production` environment secrets for this first deployment. They are only exposed to jobs that target the production environment and can later be protected with required reviewers.
- Keep application/runtime secrets in the `production` environment as well.
- Use organization secrets only when multiple OpenSyria repositories need the same value. If organization secrets are used, restrict them to selected repositories instead of all repositories.
- Prefer Tailscale workload identity federation over a long-lived Tailscale OAuth secret.

Tailscale requirements:

- Create a GitHub Actions Tailscale identity that can use `tag:ci`.
- Allow `tag:ci` to reach `opensyria-prod` on TCP port `22`.
- Keep the deploy runner ephemeral.

GHCR requirements:

- The workflow can push to GHCR with the repository `GITHUB_TOKEN`.
- The deploy job has `packages: read` and passes the short-lived repository `GITHUB_TOKEN` to the server for `docker login ghcr.io` during the pull.
- No separate GHCR PAT is required for the normal deployment path.
- If the package is later made public, authenticated pulls still work and can be kept for consistency.

Blue/green runtime:

- The local nginx proxy binds to `127.0.0.1:3000`.
- `api-blue` binds to `127.0.0.1:3001`.
- `api-green` binds to `127.0.0.1:3002`.
- Deployments start the inactive color, verify readiness, reload nginx, then stop the old color after a short drain.

## Redis Cache

Runtime Redis is used for the public daily quota and for cache-manager-backed public data caches. The cache namespace stores endpoint data payloads and verified artifact payloads; throttling keys use a separate prefix.

Cache invalidation should normally be automatic:

- `CACHE_TTL_SECONDS` sets normal expiry.
- Geography read-model imports clear the application cache after a successful import.
- Geography endpoint keys include the active release id and generated timestamp, so a newly imported release bypasses old keys even before TTL expiry.
- Artifact fallback keys include artifact checksums.

Manual Redis cleanup should only be needed after operational mistakes, such as importing the wrong release and then restoring the correct one outside the normal import command.

## Health Checks

- `GET /health/live` checks that the process is alive.
- `GET /health/ready` checks runtime dependencies and release readiness.
- `GET /health` returns the aggregate public health payload.

`/health/ready` returns HTTP 503 when a required dependency is unavailable. Optional dependencies may still mark the body as `degraded` without failing the readiness probe.

## Production Notes

- Keep `APP_DOCS_ENABLED=true` only if public API documentation should be exposed by that environment.
- Keep `/robots.txt` and `X-Robots-Tag: noindex, nofollow` enabled for the API host so search engines do not index JSON endpoint responses.
- Set `APP_CORS_ORIGIN` to the exact frontend origins that should call the API from browsers.
- Browser CORS preflight is intentionally limited to `GET`, `HEAD`, and `OPTIONS` with the approved public API headers.
- Keep `APP_BODY_LIMIT_BYTES` small unless a future endpoint genuinely needs larger request bodies.
- Set `IS_HTTPS=true` behind an HTTPS-terminating proxy so HSTS is emitted.
- Set `APP_TRUST_PROXY=true` only when the service is actually behind a trusted reverse proxy.
- Keep `THROTTLE_FREE_TIER_DAILY_LIMIT=500` and `THROTTLE_FREE_TIER_DAILY_TTL_SECONDS=86400` for the public free tier unless a release intentionally changes the quota.
- Set `REDIS_REQUIRED=true` when the deployment must fail closed if Redis is unavailable.
- Keep `CACHE_TTL_SECONDS` short enough for operational recovery. The default is 300 seconds.
- Set `DATABASE_ENABLED=true` and `DATABASE_REQUIRED=true` when endpoints should serve from the database read model.
- Keep `DATASETS_REQUIRE_RELEASES=true` for environments that must not boot without synced dataset manifests.
- Do not bake private tokens into the Docker image. Use runtime environment variables such as `GITHUB_TOKEN` only during controlled sync steps.
