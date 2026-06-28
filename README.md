# OpenSyria Datasets API

[![CI](https://github.com/Open-Syria/datasets-api/actions/workflows/ci.yml/badge.svg)](https://github.com/Open-Syria/datasets-api/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js 24+](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)](package.json)
[![pnpm 11](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)](package.json)

Public read-only API for released OpenSyria datasets.

`datasets-api` serves stable, versioned reference data for Syria through documented HTTP endpoints. It exposes released dataset metadata, geography records, source attribution, and machine-readable API documentation.

## Table of Contents

- [What This API Provides](#what-this-api-provides)
- [Data Flow](#data-flow)
- [Public Routes](#public-routes)
- [Query Conventions](#query-conventions)
- [Local Development](#local-development)
- [Local Read Model](#local-read-model)
- [Validation](#validation)
- [Deployment](#deployment)
- [Public Documentation](#public-documentation)
- [Contribution Model](#contribution-model)
- [License](#license)

## What This API Provides

- Dataset discovery and release metadata
- Geography endpoints for governorates, districts, subdistricts, and localities
- Stable record IDs and source attribution fields
- Offset pagination, filtering, search, and parent-child geography relationships
- Localized API response messages through `lang`, `x-lang`, or `Accept-Language`
- Scalar API reference and machine-readable OpenAPI documents

## Data Flow

OpenSyria datasets live in separate repositories. This API does not read live `main` branches at runtime.

The production flow is:

```text
dataset repositories -> versioned release artifacts -> verified JSON imports -> API read model -> public API responses
```

Dataset repositories own canonical JSON data, source attribution, validation rules, generated export files, and release manifests. `datasets-api` consumes pinned releases, verifies checksums and schemas, imports the data into read tables, then serves the public endpoints.

See [docs/dataset-loading.md](docs/dataset-loading.md), [docs/release-manifest.md](docs/release-manifest.md), and [docs/read-model-architecture.md](docs/read-model-architecture.md).

## Public Routes

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
```

`/docs` and `/swagger-ui` use the complete `/openapi.json` document. The filtered
`/openapi/core.json` and `/openapi/geography.json` documents are available for tools
that need a smaller machine-readable spec.

## Query Conventions

List endpoints validate query parameters and path parameters before returning response envelopes.

Common list parameters:

| Parameter | Values |
| --- | --- |
| `page` | Positive page number, default `1` |
| `limit` | `TEN`, `THIRTY_FIVE`, or `FIFTY` |
| `order` | `ASC` or `DESC` |
| `q` | Search term |
| `sourceStatus` | `PENDING_RELEASE`, `SEED`, `RELEASED`, or `DEPRECATED` |

Geography filters:

| Endpoint | Extra filters |
| --- | --- |
| `/geography/districts` | `governorateId` |
| `/geography/subdistricts` | `governorateId`, `districtId` |
| `/geography/localities` | `governorateId`, `districtId`, `subdistrictId`, `kind` |

Example:

```text
GET /api/v1/geography/localities?q=damascus&limit=THIRTY_FIVE&order=ASC&sourceStatus=RELEASED
```

## Local Development

Requirements:

- Node.js 24+
- pnpm 11+
- Docker, when running PostgreSQL and Redis locally

Install dependencies:

```bash
corepack enable pnpm
pnpm install
pnpm run db:generate
```

Start the API without required external services:

```bash
pnpm run start:dev
```

The app uses `APP_PORT`, then `PORT`, and otherwise listens on `3000`.

API documentation is available at:

```text
http://localhost:3000/docs
```

## Local Read Model

Start local dependencies:

```bash
docker compose up -d postgres redis
pnpm run db:migrate
```

Build a release in the sibling `data-geography` repository, then import it:

```bash
DATASETS_RELEASES_DIR=../data-geography/dist/release DATABASE_ENABLED=true pnpm run read-model:import:geography
```

Run a local geography smoke test:

```bash
pnpm run smoke:geography
```

## Validation

```bash
pnpm run validate
```

This runs Prisma generation, Biome checks, ESLint, TypeScript type checking, unit tests, e2e tests, build verification, and a production dependency audit.

Useful focused commands:

```bash
pnpm run check
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run test:integration:db
pnpm run build
pnpm run audit:prod
```

## Deployment

Deployment notes live in [docs/deployment.md](docs/deployment.md).

Production deployments should normally set:

```text
NODE_ENV=production
IS_HTTPS=true
DATABASE_ENABLED=true
DATABASE_REQUIRED=true
REDIS_ENABLED=true
REDIS_REQUIRED=true
DATASETS_REQUIRE_RELEASES=true
```

Set `APP_TRUST_PROXY=true` only when the service is behind a trusted reverse proxy or load balancer.

Build the Docker image:

```bash
docker build -t opensyria/datasets-api .
```

Run the built app:

```bash
docker run --rm -p 3000:3000 --env-file .env opensyria/datasets-api
```

## Public Documentation

- [API standards](docs/api-standards.md)
- [Dataset loading model](docs/dataset-loading.md)
- [Release manifest contract](docs/release-manifest.md)
- [Read model architecture](docs/read-model-architecture.md)
- [Deployment](docs/deployment.md)
- [Dataset contribution policy](docs/dataset-contribution-policy.md)
- [Pull request workflow](docs/pull-request-workflow.md)
- [Contributing](CONTRIBUTING.md)
- [Support](SUPPORT.md)
- [Security policy](SECURITY.md)
- [Code of conduct](CODE_OF_CONDUCT.md)

## Contribution Model

This API repository is public for transparency, auditability, and reuse, but it is maintainer-led. Unsolicited feature pull requests are not currently accepted here.

Community contribution is intended primarily for the dataset repositories, where contributors can fix data, add missing records, improve sources, and propose schema improvements through a controlled review process.

## License

MIT
