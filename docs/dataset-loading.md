# Dataset Loading Model

`datasets-api` should read released dataset artifacts, not live repository branches.

Each dataset repository owns its source files, contribution workflow, validation, attribution, and generated release artifacts. The API consumes those artifacts through pinned release manifests.

The manifest contract is documented in [`release-manifest.md`](./release-manifest.md).

## Table of Contents

- [Recommended Flow](#recommended-flow)
- [Generated Exports](#generated-exports)
- [Current Loader](#current-loader)
- [Syncing GitHub Releases](#syncing-github-releases)
- [Local Geography Smoke Test](#local-geography-smoke-test)
- [Production Runtime](#production-runtime)
- [Why Not Read `main` Directly?](#why-not-read-main-directly)
- [Operational Notes](#operational-notes)

## Recommended Flow

1. A dataset repository stores canonical source data and source attribution.
2. CI validates schemas, IDs, references, duplicates, language fields, and source metadata.
3. CI generates release artifacts such as JSON, NDJSON, CSV, SQL, YAML, XML, and later GeoJSON, SQLite, and TypeScript types.
4. CI publishes a versioned GitHub Release with:
   - `release-manifest.json`
   - artifact files
   - SHA-256 checksums
   - schema version
   - source attribution summary
5. `datasets-api` is configured to consume specific release versions.
6. During build, deploy, or a controlled sync step, the API downloads the manifests and artifacts, then verifies checksums and schema versions.
7. Geography releases are imported into the PostgreSQL read model; universities and transport endpoints currently read verified JSON artifacts directly until domain-specific read models are added.
8. Runtime requests should not call GitHub for every request.

## Generated Exports

Generated exports belong to the dataset repositories, not to `datasets-api`.

The export roles are:

| Format | API role | Public role |
| --- | --- | --- |
| JSON | Primary ingestion format for manifest verification and read-model imports | Structured download format |
| NDJSON | Optional future streaming import format | Large-file and pipeline-friendly exports |
| CSV | Not used for runtime serving | Spreadsheet and simple analytics exports |
| SQL | Not used for runtime serving | Direct database import for external users |
| YAML | Not used for runtime serving | Human-readable review and documentation |
| XML | Not used for runtime serving | Integration format for consumers that require XML |
| GeoJSON | Future geospatial download format | Map tooling and GIS exports |
| SQLite | Future packaged read-only database | Offline usage and local analysis |

The API may expose download links and artifact metadata from the release manifest, but it should not parse every export format at runtime. This keeps the serving system stable even when additional public export formats are added.

## Current Loader

The local loader reads release manifests and JSON artifacts from:

```text
DATASETS_RELEASES_DIR=data/releases
```

It recursively searches for files named `release-manifest.json`, validates them with the Zod manifest contract, and registers them in memory for API services to consume.

Runtime dataset endpoints then resolve artifacts from the synced release layout:

```text
data/releases/<dataset-slug>/<release-version>/<artifact-path>
```

The loader also supports a direct release directory such as:

```text
../data-geography/dist/release
```

In that mode, artifacts are resolved relative to the directory containing `release-manifest.json`. This is useful for local development before a dataset repository publishes a GitHub Release.

For example, `GET /api/v1/geography/governorates` reads `artifacts/governorates.json`, `GET /api/v1/geography/districts` reads `artifacts/districts.json`, `GET /api/v1/geography/subdistricts` reads `artifacts/subdistricts.json`, and `GET /api/v1/geography/localities` reads `artifacts/localities.json`, when the active `opensyria-geography` manifest includes matching JSON artifacts. Transport endpoints read `artifacts/locations.json`, `artifacts/status-snapshots.json`, and `artifacts/route-snapshots.json` from the active `opensyria-transport` manifest.

Before parsing an artifact, the API verifies:

- the artifact stays inside the release directory,
- the SHA-256 checksum matches the manifest,
- the file size matches the manifest,
- the JSON payload matches the endpoint schema.

## Syncing GitHub Releases

Pinned GitHub Releases are tracked in `dataset-releases.json`. Sync them into the
local release directory with:

```bash
pnpm run datasets:sync
```

The lock file uses this shape:

```json
{
  "sources": [
    {
      "owner": "Open-Syria",
      "repository": "data-geography",
      "tag": "v0.1.3"
    },
    {
      "owner": "Open-Syria",
      "repository": "data-universities",
      "tag": "v0.2.1",
      "requiredReadiness": {
        "minimumLevel": "profile_ready",
        "publicApi": "approved"
      }
    },
    {
      "owner": "Open-Syria",
      "repository": "data-transport",
      "tag": "v0.1.0",
      "requiredReadiness": {
        "minimumLevel": "public_directory_ready",
        "publicApi": "approved"
      }
    }
  ]
}
```

For one-off operations, set `DATASETS_RELEASE_SOURCES_OVERRIDE=true` and pass a
comma-separated `DATASETS_RELEASE_SOURCES` value such as
`Open-Syria/data-geography@v0.1.3,Open-Syria/another-dataset@v0.1.0`.

The sync command:

- fetches each pinned GitHub Release,
- downloads `release-manifest.json`,
- validates the manifest schema,
- downloads artifacts listed by the manifest,
- verifies artifact SHA-256 checksums and file sizes,
- writes the verified files under `DATASETS_RELEASES_DIR`.

Set `DATASETS_SYNC_DOWNLOAD_ARTIFACTS=false` to sync manifests only.

Set `GITHUB_TOKEN` when syncing private releases or when higher GitHub API limits are needed. The production deployment writes an authenticated token for the controlled sync step, even for public dataset repositories, so release downloads are not blocked by unauthenticated GitHub API limits.

## Local Geography Smoke Test

When `data-geography` is available as a sibling repository and its release artifacts have been generated, run:

```bash
pnpm run smoke:geography
```

The command boots the API in-process, reads `../data-geography/dist/release`, verifies dataset release readiness, and checks the expected geography totals:

```text
governorates: 14
districts: 62
subdistricts: 272
localities: 7605
```

Set `GEOGRAPHY_RELEASE_DIR` to use a different local release directory.

## Production Runtime

Production deployments should sync pinned release artifacts, import geography into the database read model, and require release manifests before marking the API ready. Universities and transport are currently served from verified JSON artifacts after manifest, checksum, size, and schema validation.

The current production dataset releases are:

```text
Open-Syria/data-geography@v0.1.3
Open-Syria/data-universities@v0.2.1
Open-Syria/data-transport@v0.1.0
```

The source of truth for this pin is `dataset-releases.json`; CI release checks
verify that the lock file, docs, and deployment expectations stay aligned.

Pinned sources may also declare `requiredReadiness`. During sync, the API fails
before writing artifacts if the release manifest does not declare the expected
readiness level and public API status. This lets production download a dataset
for discovery while still blocking endpoint/docs exposure until the dataset
release explicitly approves public API use.

Release checks also verify the route bridge for approved public datasets. Any
pinned source with `requiredReadiness.publicApi: "approved"` must have a contract
in `src/api/public-dataset-endpoints.ts`, matching routes in `/openapi.json`, its
filtered OpenAPI document, and `/api/v1/datasets`.

The API should expose the active dataset versions and public artifact metadata through
`/api/v1/releases`, including artifact names, formats, paths, checksums, sizes,
record counts, media types, and download URLs when the manifest provides them.

Before publishing a new artifact-backed dataset, run a local smoke test with
`DATASETS_RELEASES_DIR` pointed at the prepared `dist/release` directory and
`DATASETS_REQUIRE_RELEASES=true`. For transport, verify the locations, status
snapshot, route snapshot, dataset discovery, and `/openapi/transport.json`
responses against the prepared release:

```bash
pnpm run smoke:transport
```

In the production runtime image, use the compiled smoke command after syncing
pinned releases:

```bash
TRANSPORT_RELEASE_DIR=data/releases/transport/v0.1.0 pnpm run smoke:transport:prod
```

## Why Not Read `main` Directly?

Reading another repository's `main` branch at runtime creates unstable API behavior:

- records can change without an API deployment,
- bad data can immediately affect users,
- rollbacks are harder,
- response caching becomes ambiguous,
- source attribution and checksums are harder to verify.

Versioned release artifacts make the API predictable and easier to audit.

## Operational Notes

For production serving:

- download released JSON artifacts during deployment,
- verify checksums, sizes, and schemas,
- import the verified artifacts into read tables,
- keep generated exports available through release metadata,
- use Redis for hot cache and throttling,
- let read-model imports clear the application cache after a successful import,
- rely on release-aware cache keys and artifact checksums to avoid stale data when a new release becomes active.

If exports become large:

- store generated artifacts in object storage,
- add signed or proxied download URLs if needed,
- add SQLite and GeoJSON release assets once their generator and licensing rules are stable,
- update the read model only after manifest verification succeeds.
