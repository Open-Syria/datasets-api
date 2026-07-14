# Read Model Architecture

The datasets API should not depend on live dataset repository branches at runtime.

The long-term flow is:

1. Dataset repositories publish versioned release artifacts and a release manifest.
2. `datasets-api` syncs pinned releases into `DATASETS_RELEASES_DIR`.
3. The API verifies manifest, checksum, size, and schema for each artifact.
4. A read-model import loads domains with importers into PostgreSQL/PostGIS tables.
5. Public endpoints prefer the database read model where available, and otherwise read verified JSON artifacts with checksum, size, and schema validation.
6. Redis caches hot responses and lightweight derived views.

Release artifacts remain the public distribution contract. The database is an internal serving layer.

## Table of Contents

- [Exports And Runtime Serving](#exports-and-runtime-serving)
- [Why Use A Database](#why-use-a-database)
- [Schema Changes](#schema-changes)
- [Serving Strategy](#serving-strategy)
- [Redis Cache Strategy](#redis-cache-strategy)
- [Local Commands](#local-commands)

## Exports And Runtime Serving

Dataset repositories can generate many export formats from the same canonical JSON source: JSON, NDJSON, CSV, SQL, YAML, XML, and later GeoJSON or SQLite.

`datasets-api` should treat those formats differently:

- JSON artifacts are the primary API ingestion format.
- PostgreSQL/PostGIS is the preferred production serving model for domains with importers.
- CSV, SQL, YAML, XML, GeoJSON, SQLite, and similar exports are download artifacts for users.
- OpenAPI/Scalar docs describe API response DTOs, not every raw export column.
- Release manifests expose artifact metadata, checksums, record counts, and download paths.

This lets the data repositories add new export formats without forcing runtime API code to support each format as an input parser.

## Why Use A Database

Reading JSON artifacts directly is useful for the first seed API, but it does not scale well for:

- indexed filtering by governorate, district, subdistrict, locality kind, and source status
- relationship traversal between administrative levels
- search across Arabic names, English names, aliases, and external IDs
- geospatial queries such as nearby localities or map bounds
- future API analytics and cache invalidation by release version

PostgreSQL is the primary read model. PostGIS should be enabled where geographic coordinates and boundaries become queryable.

## Schema Changes

Data shape changes must start in the dataset repository:

- update source JSON schema
- update generated artifacts
- update release manifest
- publish a new versioned release

Then the API should:

- update Prisma models or migrations when the serving shape changes
- update Zod DTOs and endpoint examples
- update OpenAPI/Scalar documentation automatically through the decorators
- add importer tests for the new fields

The API response contract does not need to expose every raw dataset field immediately. Raw artifacts and generated exports can contain richer data while endpoints expose stable, documented DTOs.

## Serving Strategy

For local development, endpoints may fall back to verified local artifacts when the database read model is disabled. In production, geography should be imported into the read model before marking the API ready. Universities, transport, and telecom currently serve from verified JSON artifacts until domain-specific read-model importers are added.

Production should run with:

```text
DATABASE_ENABLED=true
DATABASE_REQUIRED=true
DATASETS_REQUIRE_RELEASES=true
REDIS_REQUIRED=true
```

This makes readiness fail if the read model, release artifacts, or Redis are unavailable.

## Redis Cache Strategy

Redis backs cache-manager when `REDIS_ENABLED=true`. Public endpoints cache stable data payloads, not full HTTP responses, so localized envelope messages can still honor `X-Lang`, `lang`, and `Accept-Language`.

Cached payloads include:

- dataset discovery metadata,
- release discovery metadata,
- geography list and detail results served from the PostgreSQL read model,
- verified universities, transport, and telecom JSON artifact payloads used by current artifact-backed endpoints.

Geography read-model cache keys include the active release id, release version, release status, generated timestamp, published timestamp, and normalized query or detail parameters. A newly imported release therefore uses different cache keys immediately.

Transport endpoint cache keys currently come from the verified artifact cache and
include the active release version and artifact SHA-256. A newly synced transport
release therefore bypasses old cached artifact payloads automatically.

Invalidation is layered:

- `CACHE_TTL_SECONDS` controls normal expiry and defaults to 300 seconds.
- The geography read-model import clears the application cache after its database transaction commits.
- Local artifact cache keys include the artifact SHA-256 checksum, so changed artifacts do not reuse old entries.
- Versioned release keys allow old entries to expire naturally without affecting the newly active release.

## Local Commands

```bash
docker compose up -d postgres redis
pnpm run db:generate
pnpm run db:migrate
DATASETS_RELEASES_DIR=../data-geography/dist/release DATABASE_ENABLED=true pnpm run read-model:import:geography
pnpm run start:dev
```

Use `pnpm run db:migrate:deploy` in deployment after migrations are committed.

For release-based deployments, sync and import can be chained:

```bash
DATABASE_ENABLED=true pnpm run read-model:refresh:geography
```

For already-built Docker/runtime environments, use the `:prod` scripts so the container does not try to rebuild:

```bash
pnpm run datasets:sync:prod
DATABASE_ENABLED=true pnpm run read-model:import:geography:prod
```
