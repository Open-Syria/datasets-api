import { NotFoundException } from '@nestjs/common';
import type { DatasetReleaseManifest } from '../../../datasets/contracts/dataset-release-manifest.schema';
import type { DatasetReleaseRegistryService } from '../../../datasets/dataset-release-registry.service';
import type { LocalDatasetArtifactReaderService } from '../../../datasets/loaders/local-dataset-artifact-reader.service';
import type { LocalityRecord } from './localities.dto';
import { LocalitiesService } from './localities.service';

const defaultListQuery = {
  page: 1,
  limit: 10,
  order: 'asc',
} as const;

const locality: LocalityRecord = {
  id: 'sy-damascus-damascus-damascus-damascus',
  governorateId: 'sy-damascus',
  districtId: 'sy-damascus-damascus',
  subdistrictId: 'sy-damascus-damascus-damascus',
  kind: 'city',
  name: {
    en: 'Damascus',
    ar: 'دمشق',
  },
  aliases: [
    {
      value: 'Dimashq',
      language: 'en',
      type: 'alternate_spelling',
    },
  ],
  centroid: {
    latitude: 33.5138,
    longitude: 36.2765,
  },
  externalIds: {
    geonames: '170654',
    ochaPcode: 'C1000',
  },
  sourceIds: ['geonames-sy', 'hdx-syr-populated-places'],
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
      name: 'localities',
      format: 'json',
      path: 'artifacts/localities.json',
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
      fields: ['name', 'centroid', 'externalIds'],
    },
  ],
};

function createService(items: LocalityRecord[]) {
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

  return new LocalitiesService(registry, artifactReader);
}

describe('LocalitiesService', () => {
  it('lists compact localities from the local artifact reader', async () => {
    const service = createService([locality]);

    await expect(service.listLocalities(defaultListQuery)).resolves.toMatchObject({
      items: [
        {
          id: locality.id,
          governorateId: locality.governorateId,
          districtId: locality.districtId,
          subdistrictId: locality.subdistrictId,
          kind: locality.kind,
          name: locality.name,
          centroid: locality.centroid,
          sourceStatus: locality.sourceStatus,
        },
      ],
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

  it('filters localities by kind and subdistrict ID', async () => {
    const service = createService([locality]);

    await expect(
      service.listLocalities({
        ...defaultListQuery,
        kind: 'town',
        subdistrictId: locality.subdistrictId,
      }),
    ).resolves.toMatchObject({
      items: [],
      pagination: {
        pageRecords: 0,
        totalRecords: 0,
      },
    });
  });

  it('matches search terms against aliases and external IDs', async () => {
    const service = createService([locality]);

    await expect(
      service.listLocalities({
        ...defaultListQuery,
        q: 'dimashq',
      }),
    ).resolves.toMatchObject({
      items: [
        {
          id: locality.id,
        },
      ],
      pagination: {
        pageRecords: 1,
      },
    });
  });

  it('returns locality details with rich record fields and source attribution', async () => {
    const service = createService([locality]);

    await expect(service.getLocality(locality.id)).resolves.toMatchObject({
      item: locality,
      sources: [
        {
          id: 'source-1',
          title: 'Example source',
          url: 'https://example.org/source',
          license: 'CC0-1.0',
          accessedAt: '2026-06-27T00:00:00.000Z',
          fields: ['name', 'centroid', 'externalIds'],
        },
      ],
    });
  });

  it('throws not found when the locality ID is missing', async () => {
    const service = createService([locality]);

    await expect(service.getLocality('sy-missing')).rejects.toThrow(NotFoundException);
  });
});
