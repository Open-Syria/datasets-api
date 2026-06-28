# Dataset Loading Model

`datasets-api` should read released dataset artifacts, not live repository branches.

Each dataset repository owns its source files, contribution workflow, validation, attribution, and generated release artifacts. The API consumes those artifacts through pinned release manifests.

The manifest contract is documented in [`release-manifest.md`](./release-manifest.md).

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
6. During build, deploy, or a controlled sync step, the API downloads the manifests and artifacts, verifies checksums and schema versions, then imports the primary JSON artifacts into the local read model.
7. Runtime requests read from the database-backed read model, with verified JSON artifact fallback allowed only for early seeding or local development. They should not call GitHub for every request.

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

For example, `GET /api/v1/geography/governorates` reads `artifacts/governorates.json`, `GET /api/v1/geography/districts` reads `artifacts/districts.json`, `GET /api/v1/geography/subdistricts` reads `artifacts/subdistricts.json`, and `GET /api/v1/geography/localities` reads `artifacts/localities.json`, when the active `opensyria-geography` manifest includes matching JSON artifacts.

Before parsing an artifact, the API verifies:

- the artifact stays inside the release directory,
- the SHA-256 checksum matches the manifest,
- the file size matches the manifest,
- the JSON payload matches the endpoint schema.

## Syncing GitHub Releases

Pinned GitHub Releases can be synced into the local release directory with:

```bash
DATASETS_RELEASE_SOURCES="Open-Syria/data-geography@v0.1.0" pnpm run datasets:sync
```

Use a comma-separated list for multiple sources:

```text
Open-Syria/data-geography@v0.1.0,Open-Syria/data-universities@v0.1.0
```

The sync command:

- fetches each pinned GitHub Release,
- downloads `release-manifest.json`,
- validates the manifest schema,
- downloads artifacts listed by the manifest,
- verifies artifact SHA-256 checksums and file sizes,
- writes the verified files under `DATASETS_RELEASES_DIR`.

Set `DATASETS_SYNC_DOWNLOAD_ARTIFACTS=false` to sync manifests only.

Set `GITHUB_TOKEN` when syncing private releases or when higher GitHub API limits are needed.

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

## Initial Implementation

For the first public API foundation, endpoints can return empty lists while dataset repositories are being prepared. Once release artifacts are synced locally, endpoints should read from the database read model when `DATABASE_ENABLED=true`, with verified local JSON artifact fallback available during early seeding.

The first real loading implementation should use pinned GitHub Release artifacts:

```text
data-geography@v0.1.0
data-universities@v0.1.0
data-transport@v0.1.0
data-heritage@v0.1.0
data-telecom@v0.1.0
```

The API should expose the active dataset versions through `/api/v1/releases`.

## Why Not Read `main` Directly?

Reading another repository's `main` branch at runtime creates unstable API behavior:

- records can change without an API deployment,
- bad data can immediately affect users,
- rollbacks are harder,
- response caching becomes ambiguous,
- source attribution and checksums are harder to verify.

Versioned release artifacts make the API predictable and easier to audit.

## Future Runtime Options

Start with the PostgreSQL/PostGIS read model for production serving:

- download released JSON artifacts during deployment,
- verify checksums, sizes, and schemas,
- import the verified artifacts into read tables,
- keep generated exports available through release metadata,
- use Redis for hot cache and throttling.

Later, if exports become large:

- store generated artifacts in object storage,
- add signed or proxied download URLs if needed,
- add SQLite and GeoJSON release assets once their generator and licensing rules are stable,
- update the read model only after manifest verification succeeds.
