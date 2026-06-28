# Read Model Architecture

The datasets API should not depend on live dataset repository branches at runtime.

The long-term flow is:

1. Dataset repositories publish versioned release artifacts and a release manifest.
2. `datasets-api` syncs pinned releases into `DATASETS_RELEASES_DIR`.
3. The API verifies manifest, checksum, size, and schema for each artifact.
4. A read-model import loads the verified release into PostgreSQL/PostGIS tables.
5. Public endpoints query the database read model for filters, search, relationships, pagination, and future geospatial queries.
6. Redis caches hot responses and lightweight derived views.

Release artifacts remain the public distribution contract. The database is an internal serving layer.

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

The API response contract does not need to expose every raw dataset field immediately. Raw artifacts can contain richer data while endpoints expose stable, documented DTOs.

## Initial Serving Strategy

During early seeding, endpoints may fall back to verified local artifacts while the database read model is optional.

Production should run with:

```text
DATABASE_ENABLED=true
DATABASE_REQUIRED=true
DATASETS_REQUIRE_RELEASES=true
REDIS_REQUIRED=true
```

This makes readiness fail if the read model, release artifacts, or Redis are unavailable.

## Local Commands

```bash
docker compose up -d postgres redis
pnpm run db:generate
pnpm run db:migrate
DATASETS_RELEASES_DIR=../data-geography/dist/release DATABASE_ENABLED=true pnpm run read-model:import:geography
pnpm run start:dev
```

Use `pnpm run db:migrate:deploy` in deployment after migrations are committed.
