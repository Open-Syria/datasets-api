# OpenSyria Datasets API

Read-only NestJS API for OpenSyria datasets.

This repository is intentionally a standalone app. It is not a monorepo.

## Contribution Model

This API repository is public but maintainer-led. Unsolicited feature pull requests are not currently accepted here.

Public community contribution will happen primarily in the dataset repositories, where contributors can fix data, add missing records, improve sources, and suggest schema improvements through a controlled maintainer review process.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/dataset-contribution-policy.md](docs/dataset-contribution-policy.md).

## Setup

```bash
corepack enable pnpm
pnpm install
pnpm run db:generate
```

## Development

```bash
pnpm run start:dev
```

The app uses `APP_PORT`, then `PORT`, otherwise it listens on `3000`.

## Current Routes

```text
GET /health
GET /health/live
GET /health/ready
GET /api/v1/datasets
GET /api/v1/releases
GET /api/v1/geography/governorates
GET /api/v1/geography/governorates/:governorateId
GET /api/v1/geography/districts
GET /api/v1/geography/districts/:districtId
GET /api/v1/geography/subdistricts
GET /api/v1/geography/subdistricts/:subdistrictId
GET /api/v1/geography/localities
GET /api/v1/geography/localities/:localityId
GET /docs
GET /swagger-ui
GET /openapi.json
GET /openapi/core.json
GET /openapi/geography.json
GET /openapi/education.json
```

Response messages can be localized with `?lang=`, `x-lang`, or `Accept-Language`.

Governorate list query parameters:

```text
page=1
limit=20
q=damascus
order=asc|desc
sourceStatus=pending_release|seed|released|deprecated
```

District list query parameters:

```text
page=1
limit=20
q=damascus
order=asc|desc
governorateId=sy-damascus
sourceStatus=pending_release|seed|released|deprecated
```

Subdistrict list query parameters:

```text
page=1
limit=20
q=hasakeh
order=asc|desc
governorateId=sy-al-hasakah
districtId=sy-al-hasakah-al-hasakah
sourceStatus=pending_release|seed|released|deprecated
```

Locality list query parameters:

```text
page=1
limit=20
q=hasakeh
order=asc|desc
governorateId=sy-al-hasakah
districtId=sy-al-hasakah-al-hasakah
subdistrictId=sy-al-hasakah-al-hasakah-al-hasakeh
kind=city|town|locality
sourceStatus=pending_release|seed|released|deprecated
```

## Dataset Loading

Datasets live in separate repositories. This API should consume versioned release artifacts and manifests from those repositories, not live `main` branches. See [docs/dataset-loading.md](docs/dataset-loading.md).

Local release manifests and artifacts are read from `DATASETS_RELEASES_DIR`, which defaults to `data/releases`.

The first wired artifacts are the geography governorates, districts, subdistricts, and localities JSON files. When a synced `opensyria-geography` release includes matching artifacts, the matching geography endpoints read the local files after checksum and size verification.

To sync pinned GitHub Release artifacts into the local release directory:

```bash
DATASETS_RELEASE_SOURCES="Open-Syria/data-geography@v0.1.0" pnpm run datasets:sync
```

Use a comma-separated list for multiple repositories. Set `GITHUB_TOKEN` when syncing private releases or when higher GitHub API limits are needed.

For local development against the sibling `data-geography` repository, first build the geography release there, then point the API at the generated release directory:

```bash
DATASETS_RELEASES_DIR=../data-geography/dist/release DATASETS_REQUIRE_RELEASES=true pnpm run start:dev
```

To smoke test the API against that local geography release without starting an HTTP server:

```bash
pnpm run smoke:geography
```

The smoke command expects `../data-geography/dist/release` by default. Override it with `GEOGRAPHY_RELEASE_DIR` when needed.

## Read Model

Release artifacts are the public data contract. The API database is the internal serving layer for production filters, relationships, pagination, search, and future PostGIS queries.

The intended production flow is:

```text
dataset repo release -> verified local artifacts -> PostgreSQL/PostGIS read model -> public API responses
```

During early seeding, endpoints can still read verified JSON artifacts directly. Production should enable the database read model and require dataset releases:

```text
DATABASE_ENABLED=true
DATABASE_REQUIRED=true
DATASETS_REQUIRE_RELEASES=true
REDIS_REQUIRED=true
```

Local database dependencies:

```bash
docker compose up -d postgres redis
pnpm run db:generate
pnpm run db:migrate
```

See [docs/read-model-architecture.md](docs/read-model-architecture.md).

## Scripts

```bash
pnpm run check
pnpm run check:fix
pnpm run format
pnpm run format:check
pnpm run build
pnpm run db:generate
pnpm run db:migrate
pnpm run db:migrate:deploy
pnpm run db:push
pnpm run db:studio
pnpm run lint
pnpm run lint:fix
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run datasets:sync
pnpm run read-model:import:geography
pnpm run smoke:geography
pnpm run audit:prod
pnpm run validate
```

## Health Checks

- `GET /health/live` checks that the API process is alive.
- `GET /health/ready` checks runtime dependencies and dataset release readiness.
- `GET /health` returns the aggregate public health payload.

Readiness includes Redis status, database read-model status, and dataset release manifest status. Redis, database, and dataset releases can be optional or required through environment variables.

## Tooling

- Biome handles formatting, import organization, and fast checks.
- ESLint handles stricter type-aware TypeScript linting.
- lint-staged runs checks on staged files before commit.
- Husky installs the Git hooks.
- commitlint enforces Conventional Commits.
- pnpm 11 is used for dependency installation and lockfile management.

## CI and Security

GitHub Actions are configured for:

- CI validation on pull requests and `main` pushes.
- CodeQL analysis for JavaScript and TypeScript.
- dependency review on pull requests.
- Dependabot updates for npm dependencies and GitHub Actions.

GitHub reported one moderate Dependabot alert during an earlier push, but the local production audit currently reports zero known production vulnerabilities:

```bash
pnpm audit --prod
```

Open the repository security tab to inspect GitHub-only alert details when repository permissions are available.

## Supply Chain Policy

Dependency policy lives in `pnpm-workspace.yaml`.

- The lockfile must be committed.
- New package versions must satisfy the configured minimum release age.
- Transitive dependencies from exotic sources are blocked.
- Dependency build scripts are blocked unless explicitly reviewed in `allowBuilds`.
- Production dependency advisories are checked with `pnpm run audit:prod`.

If pnpm reports a blocked dependency build script, review why the package needs it before adding it to `allowBuilds`.

Commit messages should use Conventional Commits:

```text
feat: add dataset endpoint
fix: correct import path
docs: update setup guide
chore: update tooling
```

## Deployment

Deployment notes live in [docs/deployment.md](docs/deployment.md).

Docker build:

```bash
docker build -t opensyria/datasets-api .
```

Run:

```bash
docker run --rm -p 3000:3000 --env-file .env opensyria/datasets-api
```

## License

MIT
