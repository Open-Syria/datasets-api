# Release Manifest Contract

Each data repository should publish a `release-manifest.json` with every versioned release.

The manifest is the contract between a dataset repository and `datasets-api`. It tells the API which dataset was released, which artifacts are available, how to verify them, and which sources support the release.

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
    "version": "v0.1.1",
    "status": "released",
    "publishedAt": "2026-06-27T00:00:00.000Z",
    "notes": "Initial verified geography release."
  },
  "artifacts": [
    {
      "name": "governorates",
      "format": "json",
      "path": "artifacts/governorates.json",
      "url": "https://github.com/Open-Syria/data-geography/releases/download/v0.1.1/governorates.json",
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
  ]
}
```

## Required Rules

- `schemaVersion` must match the API-supported manifest schema.
- `dataset.id` must be stable across releases.
- `release.version` should match the GitHub Release tag.
- Artifact `sha256` must be the lowercase 64-character hex checksum of the file.
- Artifact `url` should point to an immutable release asset, not a branch file.
- `sources` must describe the reusable sources behind the release.
- AI output must never appear as a source. AI may assist cleaning or matching, but released records need reviewable sources.

## API Consumption

`datasets-api` reads manifests from `DATASETS_RELEASES_DIR` first. The default is:

```text
data/releases
```

The local loader recursively searches for files named `release-manifest.json`.

JSON artifacts are resolved relative to the release directory that contains the manifest. The first supported endpoint artifact is:

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
```

The governorates, districts, subdistricts, and localities JSON artifacts may be either arrays of records or objects with an `items` array. Each record should match the matching public schema exposed by the geography API.

The API should not parse CSV, SQL, YAML, XML, GeoJSON, or SQLite artifacts for runtime endpoint serving unless a future importer intentionally adds that support. Those artifacts are still useful in the manifest because clients can discover and verify public downloads from one release contract.

## Sync Command

`datasets-api` includes a GitHub Release sync command:

```bash
DATASETS_RELEASE_SOURCES="Open-Syria/data-geography@v0.1.1" pnpm run datasets:sync
```

The command expects every pinned release to include `release-manifest.json` as a release asset. Artifact files listed in the manifest are matched by the basename of `artifacts[].path`.

Runtime HTTP requests should still read local verified data, not GitHub directly.
