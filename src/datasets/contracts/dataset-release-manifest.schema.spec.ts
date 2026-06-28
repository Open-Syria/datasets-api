import {
  datasetReleaseManifestSchema,
  datasetReleaseManifestSchemaVersion,
} from './dataset-release-manifest.schema';

describe('datasetReleaseManifestSchema', () => {
  it('parses a valid release manifest', () => {
    const result = datasetReleaseManifestSchema.safeParse({
      schemaVersion: datasetReleaseManifestSchemaVersion,
      generatedAt: '2026-06-27T00:00:00.000Z',
      dataset: {
        id: 'opensyria-geography',
        slug: 'geography',
        repository: 'data-geography',
        category: 'geography',
        title: {
          en: 'Administrative Geography',
        },
      },
      release: {
        version: 'v0.1.0',
        status: 'released',
        publishedAt: '2026-06-27T00:00:00.000Z',
      },
      artifacts: [
        {
          name: 'governorates',
          format: 'json',
          path: 'artifacts/governorates.json',
          sha256: '0'.repeat(64),
          sizeBytes: 1024,
          recordCount: 14,
        },
        {
          name: 'governorates',
          format: 'yaml',
          path: 'artifacts/governorates.yaml',
          sha256: '1'.repeat(64),
          sizeBytes: 2048,
          recordCount: 14,
        },
      ],
      sources: [
        {
          id: 'source-1',
          title: 'Example source',
          license: 'CC0-1.0',
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
