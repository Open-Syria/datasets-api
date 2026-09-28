# Deployment

This guide covers running the read-only OpenSyria datasets API in an environment
that you control. Operations for the hosted service are documented privately.

## Runtime Requirements

- Node.js 24+ and pnpm 11+ for a source build, or the Docker runtime image.
- Verified dataset release artifacts for the datasets you intend to serve.
- PostgreSQL/PostGIS when `DATABASE_ENABLED=true`.
- Redis when `REDIS_ENABLED=true`.

The API consumes exact release pins from `dataset-releases.json`. It verifies
release manifests, checksums, sizes, and schemas before serving records. See
[dataset-loading.md](dataset-loading.md) and
[read-model-architecture.md](read-model-architecture.md) for the data contract.

## Runtime Configuration

Use `.env.example` as the configuration reference and supply values for your
own environment. Keep credentials in private environment files or a secret
manager; never commit populated environment files.

For a deployment that requires all external dependencies and synced releases,
configure:

```text
NODE_ENV=production
DATABASE_ENABLED=true
DATABASE_REQUIRED=true
REDIS_ENABLED=true
REDIS_REQUIRED=true
DATASETS_REQUIRE_RELEASES=true
```

Set `APP_URL` to your own public API origin. Supply `DATABASE_URL` and
`REDIS_URL` for your own services. Set `APP_TRUST_PROXY=true` only behind a
trusted reverse proxy, and set `IS_HTTPS=true` when HTTPS is terminated upstream.

Release pins come from the checked-in lock file. Keep
`DATASETS_RELEASE_SOURCES_OVERRIDE=false` unless deliberately testing another
release configuration. A scoped `GITHUB_TOKEN` can be supplied to a controlled
sync job when authenticated release downloads are needed.

## Source Build and Release Preparation

Run from the repository root with development dependencies installed:

```bash
pnpm install --frozen-lockfile
pnpm run db:generate
pnpm run check
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run build
```

Before serving a new release pin, confirm that the GitHub Release contains the
matching `release-manifest.json` and all referenced assets. Then prepare the
configured database and releases:

```bash
pnpm run db:migrate:deploy
pnpm run datasets:sync
DATABASE_ENABLED=true pnpm run read-model:import:geography
pnpm run start:prod
```

The geography import must finish before the instance is ready. Other supported
domains serve verified release artifacts until they have dedicated read-model
importers. Run the relevant `smoke:geography`, `smoke:transport`, and
`smoke:telecom` commands when changing release pins.

## Docker

Build the runtime image:

```bash
docker build --target runtime -t opensyria/datasets-api .
```

The image contains the compiled API, runtime dependencies, Prisma assets, and
release lock. It can run the API and one-off migration, sync, smoke, and import
commands.

Run a local instance using your own private environment file and previously
synced releases:

```bash
docker run --rm -p 127.0.0.1:3000:3000 --env-file .env \
  -v "$(pwd)/data/releases:/app/data/releases:ro" opensyria/datasets-api
```

For local testing without external services, disable their corresponding
`ENABLED` and `REQUIRED` flags in the environment file. A container must use
addresses that can reach your own database and Redis services; its `localhost`
is separate from the host machine.

After migrations have been applied, the runtime image supports:

```bash
pnpm run datasets:sync:prod
pnpm run smoke:transport:prod
pnpm run smoke:telecom:prod
DATABASE_ENABLED=true pnpm run read-model:import:geography:prod
```

Sync jobs need a writable release directory. API serving and read-model import
can use a read-only release mount. Pin immutable image identifiers for
repeatable deployments and review migration compatibility with older images.

## Health Checks

- `GET /health/live` reports process liveness and the application release.
- `GET /health/ready` verifies required dependencies and exact dataset readiness.
- `GET /health` returns the aggregate health payload.

Readiness returns HTTP 503 when a required dependency or dataset is unavailable.
Verify the intended release, dataset endpoints, and OpenAPI documents before
sending traffic to a new instance.

## Hosting Requirements

- Provide HTTPS, trusted proxy configuration, and CORS origins for your clients.
- Keep database and Redis credentials private and restrict their access.
- Sync verified release artifacts before marking an instance ready.
- Keep image and migration rollbacks compatible with the pinned dataset release.
- Exclude health, API JSON, documentation, and OpenAPI responses from intermediary
  caches unless the application contract explicitly permits caching.
- Plan and test backups and recovery for your own environment.
- Keep public quotas and response behavior aligned with [api-standards.md](api-standards.md).

Hosted service deployment tooling and operator procedures are maintained
privately. Use the source and Docker instructions above for your own hosting
environment. See [releases.md](releases.md) for repository release metadata.

## Documentation Policy

Public documentation covers application behavior, public endpoints, local
setup, and reusable hosting requirements. Keep host inventories, private
addresses, account identifiers, access rules, credential arrangements,
relationships with unrelated projects, and recovery records in private operator
documentation outside public repositories.
