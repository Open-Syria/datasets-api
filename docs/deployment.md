# Production deployment

`datasets-api` is deployed directly to production at `api.opensyria.org`. The
application bundle is separate from the website bundle, while both use the
shared host platform on `syr-prod`.

## Architecture

```text
GitHub Actions
  build one linux/amd64 image
  push it to GHCR and resolve its digest
  join Tailscale and upload devops/production
  invoke the host deploy script
            |
            v
/opt/syr/apps/opensyria/production/datasets-api
  isolated release sync/smoke jobs
  migrate/import jobs
  api-blue or api-green
            |
            +-- opensyria-production-data
            |     +-- infra-postgres / opensyria_datasets_production
            |     +-- opensyria-production-redis
            |
            +-- syr-staging-edge -> infra-nginx -> Cloudflare Tunnel
```

The physical PostgreSQL container is shared with Jobara and Infisical, but the
OpenSyria database and login role are dedicated. Redis is a separate container,
password, network attachment, memory limit, and volume. Neither data service is
published publicly. Release sync and smoke jobs use only an isolated project
bridge with outbound HTTPS; they cannot resolve or reach the production data
network.

The shared service directory remains `/opt/syr/services/staging` and its edge
network remains `syr-staging-edge` for historical Jobara reasons. Those names do
not change OpenSyria's production environment.

## Runtime image

The `runtime` Docker target contains the compiled API, production dependencies,
Prisma CLI/schema, the release lock, and public assets. The same immutable image
runs the API, migrations, release sync, smoke check, and read-model import. It
runs as the image's unprivileged `node` user.

Every source in the release lock pins both a GitHub release tag and the SHA-256
of `release-manifest.json`. Production rejects a manifest whose digest differs,
even if the mutable GitHub tag and its other assets were replaced together.
It also refuses to overwrite an already-synced tag with different manifest
content, preserving the release files used by the rollback slot.

GitHub builds exactly one `linux/amd64` image and deploys it as
`ghcr.io/open-syria/datasets-api@sha256:...`. The server only pulls images; it
does not clone the repository, install dependencies, or build application code.

## Secret ownership

Application runtime configuration lives in the self-hosted Infisical project
`opensyria`, environment `production`, path `/datasets-api`. The server uses a
read-only, path-scoped Universal Auth identity stored at:

```text
/opt/syr/apps/opensyria/production/datasets-api/.infisical.env
```

The file must be owned by `mustafa`, mode `0600`, and contain only Infisical
connection/identity settings. `bin/deploy.sh` obtains a short-lived token from
the loopback Infisical API and exports `/datasets-api` to a mode-`0600` runtime
env file. It parses `.infisical.env` with an exact key allowlist instead of
executing it as shell code. Never store the Infisical access token, GHCR token,
or dataset GitHub token in that file.

GitHub's protected `production` environment retains only bootstrap credentials
that are needed before the private host or Infisical can be reached:

```text
TS_OAUTH_CLIENT_ID
TS_AUDIENCE
DEPLOY_SSH_PRIVATE_KEY
DEPLOY_SSH_KNOWN_HOSTS
```

Required GitHub environment variables:

```text
DEPLOY_HOST=syr-prod
DEPLOY_USER=mustafa
DEPLOY_ROOT=/opt/syr/apps/opensyria/production/datasets-api
```

The repository `GITHUB_TOKEN` authenticates the current GHCR pull and the
one-off public GitHub Release sync. It is passed only to the deployment process;
it is not written to the runtime env or injected into long-lived API containers.

## Infisical `/datasets-api` keys

The production path should contain the complete runtime contract:

```text
APP_ENV=production
NODE_ENV=production
APP_NAME=opensyria-datasets-api
APP_PORT=3000
APP_URL=https://api.opensyria.org
APP_API_PREFIX=api
APP_API_VERSION=1
APP_BODY_LIMIT_BYTES=65536
APP_CORS_ORIGIN=https://opensyria.org
APP_CORS_CREDENTIALS=false
APP_DOCS_ENABLED=true
APP_DEBUG=false
APP_LOG_LEVEL=info
APP_LOG_PRETTY=false
APP_TRUST_PROXY=true
IS_HTTPS=true
APP_FALLBACK_LANGUAGE=en
DATASETS_RELEASES_DIR=data/releases
DATASETS_REQUIRE_RELEASES=true
DATASETS_RELEASE_SOURCES_FILE=dataset-releases.json
DATASETS_RELEASE_SOURCES_OVERRIDE=false
DATASETS_SYNC_DOWNLOAD_ARTIFACTS=true
DATABASE_URL=postgresql://<encoded-role>:<encoded-password>@infra-postgres:5432/opensyria_datasets_production?schema=public
DATABASE_ENABLED=true
DATABASE_REQUIRED=true
DATABASE_LOG_QUERIES=false
REDIS_URL=redis://:<encoded-password>@opensyria-production-redis:6379/0
REDIS_PASSWORD=<same-64-character-hex-password-as-REDIS_URL>
REDIS_ENABLED=true
REDIS_REQUIRED=true
CACHE_TTL_SECONDS=300
THROTTLE_FREE_TIER_DAILY_LIMIT=500
THROTTLE_FREE_TIER_DAILY_TTL_SECONDS=86400
```

`REDIS_PASSWORD` is retained in Infisical for the host recovery contract. The
deployment validates that it matches the credential embedded in `REDIS_URL`,
then omits the standalone password from `env/api.env` and every long-lived API
container. A restored, already-sanitized `env/api.env` therefore contains only
`REDIS_URL`.

`APP_RELEASE` is deliberately absent: Compose injects the full Git commit SHA
for each deployment. `GITHUB_TOKEN` is deliberately absent because only the
ephemeral sync job receives it. Percent-encode the database username/password
and Redis password in their URLs.

## Existing PostgreSQL cluster prerequisite

The checked-in PostgreSQL init script only runs on a fresh data volume. Before
the first OpenSyria deployment to the existing cluster:

1. Take and verify a current cluster backup.
2. Generate a strong OpenSyria database password and add the four protected
   `OPEN_SYRIA_*` values documented in the host-platform bundle.
3. As the PostgreSQL administrator, create the non-superuser role and owned
   `opensyria_datasets_production` database.
4. Revoke database access from `PUBLIC` and verify the role has no privileges on
   Jobara or Infisical databases.
5. Enable PostGIS in the OpenSyria database as the administrator.
6. Use the same encoded credential in Infisical's `DATABASE_URL`.

Do not grant the application role superuser or extension-creation privileges.

## Deployment sequence

The workflow and `devops/production/bin/deploy.sh` perform these steps:

1. Validate the exact host, user, path, protected Infisical file, networks, and
   infrastructure containers.
2. Pull the immutable image digest with short-lived GHCR authentication.
3. Take a custom-format pre-migration dump in
   `/opt/syr/backups/production/opensyria/postgres`.
4. Run `prisma migrate deploy` from the runtime image.
5. Sync every exact pin in `dataset-releases.json`; the GitHub token is scoped
   to this job only.
6. Smoke-check the verified release artifacts with database and Redis disabled.
7. Import the pinned geography release with Redis disabled.
8. Start the inactive API slot with a read-only root filesystem and read-only
   release mount.
9. Verify container readiness, the application SHA, the exact pinned geography
   database release, and every manifest-declared geography artifact count.
10. Atomically update the shared nginx upstream include, run `nginx -t`, reload,
    and verify the private Host-routed origin. Shared nginx updates wait on the
    cross-application lock, and verification retries across the graceful reload
    window while old workers drain.
11. Optionally verify `https://api.opensyria.org` before draining the old local
    slot. The protected `VERIFY_PUBLIC_DEPLOYMENT` variable controls automatic
    runs; manual dispatch can require or skip it explicitly.

The old external OpenSyria server remains an independent rollback target until
the Cloudflare cutover has been validated.

## Rollback contract

Database rows for older geography releases are retained. Runtime queries select
the exact release pinned in their own `dataset-releases.json`, never the newest
row in PostgreSQL. This makes application-image rollback deterministic after a
newer release has been imported.

If private or public verification fails after the switch, the deployment script
restores the previous nginx include and stops the failed slot. Migrations are
forward-only; review every migration for compatibility with the previous image.
Restoring the pre-migration dump is a separate, explicitly confirmed operator
action, not an automatic rollback.

Backups use PostgreSQL custom format, exclude the administrator-owned PostGIS
extension, pass `pg_restore --list`, and are atomically published with SHA-256
and recovery sidecars. `bin/restore-postgres.sh` accepts only those OpenSyria
production dumps, requires the literal `RESTORE_OPEN_SYRIA_PRODUCTION`
confirmation, refuses to race deployments/backups or active API slots, and
validates the restricted role before acting. It force-drops and recreates only
`opensyria_datasets_production`, revokes `PUBLIC`, recreates administrator-owned
PostGIS, and then restores as the application role. Resetting the dedicated
database first guarantees that objects introduced after the selected backup do
not survive and conflict with restored Prisma migration history. Keep a tested
off-host copy and verify readiness before restarting public traffic.

## CI policy

`.github/workflows/ci.yml` installs the frozen lockfile, generates Prisma code,
runs Biome, checks TypeScript, and audits production dependencies. Tests and
application builds are intentionally local-only. The deployment workflow builds
the runtime image exactly once because an image is the deployment artifact; it
does not repeat unit/E2E tests or build on the server.

Automatic production deployment starts only from a successful `CI` workflow
run for a same-repository push to `main`. Commits with `[skip ci]`/`[ci skip]`
and Dependabot-associated commits are not automatically deployed. A protected
manual dispatch remains available for deliberate branch rollouts.

Useful local checks:

```bash
pnpm run check
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run build
```

## Health and edge behavior

- `GET /health/live` reports process liveness and the application SHA.
- `GET /health/ready` requires Redis, the database, every pinned artifact
  release, the exact pinned geography row identity, and exact per-artifact row
  counts from its verified manifest.
- `GET /health` exposes the same aggregate dependency state.

Cloudflare terminates TLS and reaches `infra-nginx` through an outbound-only
Tunnel. Nginx supplies production security headers, preserves the client IP
contract, and marks the API host `noindex`. API documentation and OpenAPI routes
remain public by design. Do not cache health, API JSON, documentation, or
OpenAPI responses at Cloudflare; cache immutable website assets separately.
