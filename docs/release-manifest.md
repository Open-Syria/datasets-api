# Release Manifest Contract

Each data repository should publish a `release-manifest.json` with every versioned release.

The manifest is the contract between a dataset repository and `datasets-api`. It tells the API which dataset was released, which artifacts are available, how to verify them, which sources support the release, and whether the release is approved for public API exposure.

Dataset repositories may publish several generated formats in the same release. JSON artifacts are the primary API ingestion format. Other formats such as NDJSON, CSV, SQL, YAML, XML, GeoJSON, and SQLite are distribution artifacts that the API can expose as release metadata or download links.

## Table of Contents

- [File Name](#file-name)
- [Schema Version](#schema-version)
- [Example](#example)
- [Required Rules](#required-rules)
- [API Consumption](#api-consumption)
- [Sync Command](#sync-command)

## File Name

```text
release-manifest.json
```

## Schema Version

The current manifest schema version is:

```text
1.0
```

## Example

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "2026-06-27T00:00:00.000Z",
  "dataset": {
    "id": "opensyria-geography",
    "slug": "geography",
    "repository": "data-geography",
    "category": "geography",
    "title": {
      "en": "Administrative Geography",
      "ar": "\u0627\u0644\u062c\u063a\u0631\u0627\u0641\u064a\u0627 \u0627\u0644\u0625\u062f\u0627\u0631\u064a\u0629"
    }
  },
  "release": {
    "version": "v0.1.5",
    "status": "released",
    "publishedAt": "2026-07-19T00:00:00.000Z",
    "notes": "Verified geography release with dated record-level provenance."
  },
  "artifacts": [
    {
      "name": "governorates",
      "format": "json",
      "path": "artifacts/governorates.json",
      "url": "https://github.com/Open-Syria/data-geography/releases/download/v0.1.5/governorates.json",
      "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
      "sizeBytes": 1024,
      "recordCount": 14,
      "mediaType": "application/json"
    }
  ],
  "sources": [
    {
      "id": "source-1",
      "title": "Example source",
      "url": "https://example.org/source",
      "license": "CC0-1.0",
      "accessedAt": "2026-06-27T00:00:00.000Z",
      "fields": ["name", "coordinates"]
    }
  ],
  "readiness": {
    "level": "public_directory_ready",
    "publicApi": {
      "status": "approved",
      "minimumLevel": "public_directory_ready",
      "reason": "Directory endpoints may expose this release."
    },
    "checks": [
      {
        "name": "canonical_record_count",
        "status": "passed",
        "expected": 14,
        "actual": 14
      }
    ],
    "domains": [
      {
        "name": "governorates",
        "status": "ready",
        "recordCount": 14,
        "notes": "Governorate records are ready for public directory use."
      }
    ],
    "blockers": []
  }
}
```

## Required Rules

- `schemaVersion` must match the API-supported manifest schema.
- `dataset.id` must be stable across releases.
- `release.version` should match the GitHub Release tag.
- Artifact `sha256` must be the lowercase 64-character hex checksum of the file.
- Artifact `url` should point to an immutable release asset, not a branch file.
- `sources` must describe the reusable sources behind the release.
- `readiness`, when present, must distinguish sync readiness from public API approval.
- Public endpoint work must not treat a synced release as exposed unless `readiness.publicApi.status` is `approved`.
- A pinned dataset with `requiredReadiness.publicApi: "approved"` must have a public endpoint contract in `src/api/public-dataset-endpoints.ts`, matching paths in `/openapi.json`, its filtered OpenAPI document, and `/api/v1/datasets`.
- Public JSON records should expose consistent provenance fields: `sourceIds`, dated `sourceReferences`, and `sourceStatus`.
- AI output must never appear as a source. AI may assist cleaning or matching, but released records need reviewable sources.

## API Consumption

`datasets-api` reads manifests from `DATASETS_RELEASES_DIR` first. The default is:

```text
data/releases
```

The local loader recursively searches for files named `release-manifest.json`.

JSON artifacts are resolved relative to the release directory that contains the manifest. The first supported endpoint artifacts are:

```text
opensyria-geography
  artifact name: governorates
  artifact format: json
  artifact path: artifacts/governorates.json
  artifact name: districts
  artifact format: json
  artifact path: artifacts/districts.json
  artifact name: subdistricts
  artifact format: json
  artifact path: artifacts/subdistricts.json
  artifact name: localities
  artifact format: json
  artifact path: artifacts/localities.json

opensyria-universities
  artifact name: universities
  artifact format: json
  artifact path: artifacts/universities.json
  artifact name: assets
  artifact format: json
  artifact path: artifacts/assets.json
  artifact name: rankings
  artifact format: json
  artifact path: artifacts/rankings.json

opensyria-transport
  artifact name: locations
  artifact format: json
  artifact path: artifacts/locations.json
  artifact name: status-snapshots
  artifact format: json
  artifact path: artifacts/status-snapshots.json
  artifact name: route-snapshots
  artifact format: json
  artifact path: artifacts/route-snapshots.json
```

The governorates, districts, subdistricts, localities, universities, university
assets, university rankings, transport locations, transport status snapshots,
transport route snapshots, telecom country numbering plans, telecom operators,
telecom fixed area codes, telecom mobile prefixes, and telecom number ranges
JSON artifacts may be either arrays of records or objects with an `items` array.
Each record should match the matching public schema exposed by the API.

The API should not parse CSV, SQL, YAML, XML, GeoJSON, or SQLite artifacts for runtime endpoint serving unless a future importer intentionally adds that support. Those artifacts are still useful in the manifest because clients can discover and verify public downloads from one release contract.

## Sync Command

`datasets-api` includes a GitHub Release sync command:

```bash
pnpm run datasets:sync
```

The command reads pinned release sources from `dataset-releases.json`. For a
deliberate one-off override, set `DATASETS_RELEASE_SOURCES_OVERRIDE=true` and
provide `DATASETS_RELEASE_SOURCES`.

Lock-file entries may include `requiredReadiness`, for example:

```json
{
  "owner": "Open-Syria",
  "repository": "data-transport",
  "tag": "v0.1.1",
  "requiredReadiness": {
    "minimumLevel": "public_directory_ready",
    "publicApi": "approved"
  }
}
```

Telecom endpoint pins can require the stricter `api_ready` level:

```json
{
  "owner": "Open-Syria",
  "repository": "data-telecom",
  "tag": "v0.1.0",
  "requiredReadiness": {
    "minimumLevel": "api_ready",
    "publicApi": "approved"
  }
}
```

When present, sync fails if the manifest omits readiness metadata, has a lower
readiness level, or declares a different public API status. The release check
also boots the built API and verifies approved datasets against their public
endpoint contract, so a dataset cannot be marked API-approved while missing
controllers or generated docs.

The command expects every pinned release to include `release-manifest.json` as a release asset. Artifact files listed in the manifest are matched by the basename of `artifacts[].path`.

Runtime HTTP requests should still read local verified data, not GitHub directly.
