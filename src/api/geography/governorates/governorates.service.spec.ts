import { NotFoundException } from '@nestjs/common';
import type { DatasetReleaseManifest } from '../../../datasets/contracts/dataset-release-manifest.schema';
import type { DatasetReleaseRegistryService } from '../../../datasets/dataset-release-registry.service';
import type { LocalDatasetArtifactReaderService } from '../../../datasets/loaders/local-dataset-artifact-reader.service';
import type { GovernorateSummary } from './governorates.dto';
import { GovernoratesService } from './governorates.service';

const defaultListQuery = {
  page: 1,
  limit: 10,
  order: 'asc',
} as const;

const governorate: GovernorateSummary = {
  id: 'sy-damascus',
  name: {
    en: 'Damascus',
  },
  iso31662: 'SY-DI',
  centroid: {
    latitude: 33.5138,
    longitude: 36.2765,
  },
  sourceStatus: 'released',
};

const manifest: DatasetReleaseManifest = {
  schemaVersion: '1.0',
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
    notes: null,
  },
  artifacts: [
    {
      name: 'governorates',
      format: 'json',
      path: 'artifacts/governorates.json',
      sha256: '0'.repeat(64),
      sizeBytes: 1,
    },
  ],
  sources: [
    {
      id: 'source-1',
      title: 'Example source',
      url: 'https://example.org/source',
      license: 'CC0-1.0',
      accessedAt: '2026-06-27T00:00:00.000Z',
      fields: ['name', 'centroid'],
    },
  ],
};

function createService(items: GovernorateSummary[]) {
  const registry = {
    getManifestByDatasetId: jest.fn(),
  } as unknown as DatasetReleaseRegistryService;
  const artifactReader = {
    readJsonArtifact: jest.fn().mockResolvedValue({
      manifest,
      artifact: manifest.artifacts[0],
      data: items,
    }),
  } as unknown as LocalDatasetArtifactReaderService;

  return new GovernoratesService(registry, artifactReader);
}

describe('GovernoratesService', () => {
  it('lists governorates from the local artifact reader', async () => {
    const service = createService([governorate]);

    await expect(service.listGovernorates(defaultListQuery)).resolves.toMatchObject({
      count: 1,
      items: [governorate],
      pagination: {
        currentPage: 1,
        totalRecords: 1,
      },
      dataset: {
        id: 'opensyria-geography',
        repository: 'data-geography',
        status: 'released',
      },
      release: {
        version: 'v0.1.0',
      },
    });
  });

  it('returns governorate details with source attribution', async () => {
    const service = createService([governorate]);

    await expect(service.getGovernorate('sy-damascus')).resolves.toMatchObject({
      item: governorate,
      sources: [
        {
          id: 'source-1',
          title: 'Example source',
          url: 'https://example.org/source',
          license: 'CC0-1.0',
          accessedAt: '2026-06-27T00:00:00.000Z',
          fields: ['name', 'centroid'],
        },
      ],
    });
  });

  it('throws not found when the governorate ID is missing', async () => {
    const service = createService([governorate]);

    await expect(service.getGovernorate('sy-missing')).rejects.toThrow(NotFoundException);
  });
});
