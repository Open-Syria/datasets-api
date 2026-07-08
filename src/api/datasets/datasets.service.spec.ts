import type { DatasetReleaseManifest } from '../../datasets/contracts/dataset-release-manifest.schema';
import type { DatasetReleaseRegistryService } from '../../datasets/dataset-release-registry.service';
import type { PublicDataCacheService } from '../../shared/cache/public-data-cache.service';
import { DatasetsService } from './datasets.service';

type PublicDataCacheServiceMock = {
  getOrSet: jest.Mock<Promise<unknown>, [string, unknown, () => unknown]>;
};

type DatasetReleaseRegistryServiceMock = {
  listManifests: jest.Mock<DatasetReleaseManifest[], []>;
};

const geographyManifest: DatasetReleaseManifest = {
  schemaVersion: '1.0',
  generatedAt: '2026-06-28T18:00:47.799Z',
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
    version: 'v0.1.4',
    status: 'released',
    publishedAt: '2026-07-08T00:00:00.000Z',
    notes: 'Released geography fixture.',
  },
  artifacts: [],
  sources: [],
};

const defaultQuery = {
  page: 1,
  limit: 10,
  order: 'asc',
} as const;

function createPublicDataCacheService(): PublicDataCacheServiceMock {
  return {
    getOrSet: jest.fn((_scope, _payload, loader) => Promise.resolve(loader())),
  };
}

function createService(manifests: DatasetReleaseManifest[] = []) {
  const publicDataCacheService = createPublicDataCacheService();
  const datasetReleaseRegistryService: DatasetReleaseRegistryServiceMock = {
    listManifests: jest.fn(() => manifests),
  };

  return {
    publicDataCacheService,
    datasetReleaseRegistryService,
    service: new DatasetsService(
      publicDataCacheService as unknown as PublicDataCacheService,
      datasetReleaseRegistryService as unknown as DatasetReleaseRegistryService,
    ),
  };
}

describe('DatasetsService', () => {
  it('keeps dataset release fields null when no manifests are loaded', async () => {
    const { service } = createService();

    const result = await service.listDatasets(defaultQuery);

    expect(result.items[0]).toMatchObject({
      id: 'opensyria-geography',
      status: 'released',
      version: null,
      updatedAt: null,
    });
    expect(result.items[0]?.apiEndpoints).toEqual(
      expect.arrayContaining([
        '/api/v1/geography/governorates',
        '/api/v1/geography/governorates/{governorateId}',
      ]),
    );
    expect(result.items.find((item) => item.id === 'opensyria-universities')).toMatchObject({
      id: 'opensyria-universities',
    });
    expect(result.items.find((item) => item.id === 'opensyria-universities')?.apiEndpoints).toEqual(
      ['/api/v1/universities', '/api/v1/universities/{universityId}'],
    );
    expect(result.items.find((item) => item.id === 'opensyria-transport')).toMatchObject({
      id: 'opensyria-transport',
      status: 'released',
    });
    expect(result.items.find((item) => item.id === 'opensyria-transport')?.apiEndpoints).toEqual(
      expect.arrayContaining([
        '/api/v1/transport/locations',
        '/api/v1/transport/status-snapshots',
        '/api/v1/transport/route-snapshots',
      ]),
    );
  });

  it('enriches released datasets from loaded release manifests', async () => {
    const { service } = createService([geographyManifest]);

    const result = await service.listDatasets(defaultQuery);

    expect(result.items[0]).toMatchObject({
      id: 'opensyria-geography',
      status: 'released',
      version: 'v0.1.4',
      updatedAt: '2026-07-08T00:00:00.000Z',
    });
    expect(result.items.find((item) => item.id === 'opensyria-universities')).toMatchObject({
      id: 'opensyria-universities',
      version: null,
      updatedAt: null,
    });
  });

  it('filters and paginates dataset metadata', async () => {
    const { service } = createService();

    const result = await service.listDatasets({
      ...defaultQuery,
      q: 'geo',
    });

    expect(result).toMatchObject({
      pagination: {
        totalRecords: 1,
      },
      items: [
        {
          id: 'opensyria-geography',
        },
      ],
    });
  });
});
