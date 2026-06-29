import { NotFoundException } from '@nestjs/common';
import type { DatasetReleaseManifest } from '../../../datasets/contracts/dataset-release-manifest.schema';
import type { DatasetReleaseRegistryService } from '../../../datasets/dataset-release-registry.service';
import type { LocalDatasetArtifactReaderService } from '../../../datasets/loaders/local-dataset-artifact-reader.service';
import type { DistrictSummary } from './districts.dto';
import { DistrictsService } from './districts.service';

const defaultListQuery = {
  page: 1,
  limit: 10,
  order: 'asc',
} as const;

const district: DistrictSummary = {
  id: 'sy-damascus-damascus',
  governorateId: 'sy-damascus',
  name: {
    en: 'Damascus',
  },
  aliases: [
    {
      value: 'Dimashq District',
      language: 'en',
      type: 'alternate_spelling',
    },
  ],
  centroid: {
    latitude: 33.5138,
    longitude: 36.2765,
  },
  area: {
    value: 105,
    unit: 'km2',
    sourceIds: ['source-1'],
  },
  population: {
    value: 1552161,
    year: 2004,
    sourceIds: ['source-1'],
  },
  externalIds: {
    geonames: '170654',
  },
  sourceIds: ['source-1'],
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
      name: 'districts',
      format: 'json',
      path: 'artifacts/districts.json',
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

function createService(items: DistrictSummary[]) {
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

  return new DistrictsService(registry, artifactReader);
}

describe('DistrictsService', () => {
  it('lists districts from the local artifact reader', async () => {
    const service = createService([district]);

    await expect(service.listDistricts(defaultListQuery)).resolves.toMatchObject({
      items: [district],
      pagination: {
        currentPage: 1,
        pageRecords: 1,
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

  it('filters districts by governorate ID', async () => {
    const service = createService([district]);

    await expect(
      service.listDistricts({
        ...defaultListQuery,
        governorateId: 'sy-rif-dimashq',
      }),
    ).resolves.toMatchObject({
      items: [],
      pagination: {
        pageRecords: 0,
        totalRecords: 0,
      },
    });
  });

  it('returns district details with source attribution', async () => {
    const service = createService([district]);

    await expect(service.getDistrict('sy-damascus-damascus')).resolves.toMatchObject({
      item: district,
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

  it('throws not found when the district ID is missing', async () => {
    const service = createService([district]);

    await expect(service.getDistrict('sy-missing')).rejects.toThrow(NotFoundException);
  });
});
