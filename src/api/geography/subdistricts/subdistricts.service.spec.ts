import { NotFoundException } from '@nestjs/common';
import type { DatasetReleaseManifest } from '../../../datasets/contracts/dataset-release-manifest.schema';
import type { DatasetReleaseRegistryService } from '../../../datasets/dataset-release-registry.service';
import type { LocalDatasetArtifactReaderService } from '../../../datasets/loaders/local-dataset-artifact-reader.service';
import type { SubdistrictSummary } from './subdistricts.dto';
import { SubdistrictsService } from './subdistricts.service';

const defaultListQuery = {
  page: 1,
  limit: 20,
  order: 'asc' as const,
};

const subdistrict: SubdistrictSummary = {
  id: 'sy-damascus-damascus-damascus',
  governorateId: 'sy-damascus',
  districtId: 'sy-damascus-damascus',
  name: {
    en: 'Damascus',
  },
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
      name: 'subdistricts',
      format: 'json',
      path: 'artifacts/subdistricts.json',
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

function createService(items: SubdistrictSummary[]) {
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

  return new SubdistrictsService(registry, artifactReader);
}

describe('SubdistrictsService', () => {
  it('lists subdistricts from the local artifact reader', async () => {
    const service = createService([subdistrict]);

    await expect(service.listSubdistricts(defaultListQuery)).resolves.toMatchObject({
      count: 1,
      items: [subdistrict],
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

  it('filters subdistricts by district ID', async () => {
    const service = createService([subdistrict]);

    await expect(
      service.listSubdistricts({
        ...defaultListQuery,
        districtId: 'sy-rif-dimashq-duma',
      }),
    ).resolves.toMatchObject({
      count: 0,
      items: [],
      pagination: {
        totalRecords: 0,
      },
    });
  });

  it('returns subdistrict details with source attribution', async () => {
    const service = createService([subdistrict]);

    await expect(service.getSubdistrict('sy-damascus-damascus-damascus')).resolves.toMatchObject({
      item: subdistrict,
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

  it('throws not found when the subdistrict ID is missing', async () => {
    const service = createService([subdistrict]);

    await expect(service.getSubdistrict('sy-missing')).rejects.toThrow(NotFoundException);
  });
});
