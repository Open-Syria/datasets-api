# Dataset Loading Model

`datasets-api` should read released dataset artifacts, not live repository branches.

Each dataset repository owns its source files, contribution workflow, validation, attribution, and generated release artifacts. The API consumes those artifacts through pinned release manifests.

The manifest contract is documented in [`release-manifest.md`](./release-manifest.md).

## Recommended Flow

1. A dataset repository stores canonical source data and source attribution.
2. CI validates schemas, IDs, references, duplicates, language fields, and source metadata.
3. CI generates release artifacts such as JSON, NDJSON, CSV, GeoJSON, SQLite, and TypeScript types.
4. CI publishes a versioned GitHub Release with:
   - `release-manifest.json`
   - artifact files
   - SHA-256 checksums
   - schema version
   - source attribution summary
5. `datasets-api` is configured to consume specific release versions.
6. During build, deploy, or a controlled sync step, the API downloads the manifests and artifacts, verifies checksums and schema versions, then stores a local read model.
7. Runtime requests read from local memory, local files, SQLite, object storage, or a database-backed read model. They should not call GitHub for every request.

## Current Loader

The first loader reads local manifests from:

```text
DATASETS_RELEASES_DIR=data/releases
```

It recursively searches for files named `release-manifest.json`, validates them with the Zod manifest contract, and registers them in memory for API services to consume.

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

## Initial Implementation

For the first public API foundation, endpoint data can be static placeholders while dataset repositories are being prepared.

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

Start simple:

- download released JSON artifacts during deployment,
- load them into memory on boot,
- use Redis for hot cache and throttling.

Later, if datasets become large:

- convert release artifacts into SQLite or PostgreSQL read tables,
- store generated artifacts in object storage,
- keep Redis for cache and rate limits,
- add a sync command that updates the read model only after manifest verification.
