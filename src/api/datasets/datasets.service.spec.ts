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
    version: 'v0.1.3',
    status: 'released',
    publishedAt: '2026-06-28T18:02:00.000Z',
    notes: 'Seed release.',
  },
  artifacts: [],
  sources: [],
};

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

    const result = await service.listDatasets();

    expect(result.items[0]).toMatchObject({
      id: 'opensyria-geography',
      status: 'seed',
      version: null,
      updatedAt: null,
    });
    expect(result.items[0]?.apiEndpoints).toEqual(
      expect.arrayContaining([
        '/api/v1/geography/governorates',
        '/api/v1/geography/governorates/{governorateId}',
      ]),
    );
    expect(result.items[1]).toMatchObject({
      id: 'opensyria-universities',
      apiEndpoints: [],
    });
  });

  it('enriches released datasets from loaded release manifests', async () => {
    const { service } = createService([geographyManifest]);

    const result = await service.listDatasets();

    expect(result.items[0]).toMatchObject({
      id: 'opensyria-geography',
      status: 'released',
      version: 'v0.1.3',
      updatedAt: '2026-06-28T18:02:00.000Z',
    });
    expect(result.items[1]).toMatchObject({
      id: 'opensyria-universities',
      version: null,
      updatedAt: null,
    });
  });
});
