import type { PrismaService } from '../../database/prisma.service';
import type { PublicDataCacheService } from '../../shared/cache/public-data-cache.service';
import { GeographyReadModelQueryService } from './geography-read-model-query.service';

type PublicDataCacheServiceMock = {
  getOrSet: jest.Mock<Promise<unknown>, [string, unknown, () => Promise<unknown>]>;
  clearAll: jest.Mock<Promise<void>, []>;
};

const releasedAt = new Date('2026-06-27T00:00:00.000Z');
const sourceReferences = [
  {
    sourceId: 'source-1',
    accessedAt: releasedAt.toISOString(),
  },
];

const release = {
  id: 'opensyria-geography:v0.1.0',
  datasetId: 'opensyria-geography',
  slug: 'geography',
  repository: 'data-geography',
  category: 'geography',
  titleEn: 'Administrative Geography',
  titleAr: null,
  version: 'v0.1.0',
  status: 'released',
  publishedAt: releasedAt,
  generatedAt: releasedAt,
  manifestSha: null,
  createdAt: releasedAt,
  updatedAt: releasedAt,
  sources: [
    {
      releaseId: 'opensyria-geography:v0.1.0',
      sourceId: 'source-1',
      title: 'Example source',
      url: 'https://example.org/source',
      license: 'CC0-1.0',
      accessedAt: releasedAt,
      fields: ['name', 'centroid'],
      createdAt: releasedAt,
      updatedAt: releasedAt,
    },
  ],
};

const locality = {
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
  },
  sourceIds: ['source-1'],
  sourceReferences,
  sourceStatus: 'released',
} as const;

function createPublicDataCacheService(): PublicDataCacheServiceMock {
  const cache = new Map<string, unknown>();

  return {
    getOrSet: jest.fn(async (scope: string, payload: unknown, loader: () => Promise<unknown>) => {
      const key = `${scope}:${JSON.stringify(payload)}`;

      if (cache.has(key)) {
        return cache.get(key);
      }

      const value = await loader();

      cache.set(key, value);
      return value;
    }),
    clearAll: jest.fn(() => Promise.resolve()),
  };
}

function createService() {
  const countLocalities = jest.fn().mockResolvedValue(1);
  const findLocalities = jest.fn().mockResolvedValue([
    {
      id: locality.id,
      releaseId: release.id,
      governorateId: locality.governorateId,
      districtId: locality.districtId,
      subdistrictId: locality.subdistrictId,
      kind: locality.kind,
      nameEn: locality.name.en,
      nameAr: locality.name.ar,
      latitude: locality.centroid.latitude,
      longitude: locality.centroid.longitude,
      population: null,
      aliases: locality.aliases,
      externalIds: locality.externalIds,
      searchText: 'damascus dimashq 170654',
      sourceStatus: locality.sourceStatus,
      sourceIds: locality.sourceIds,
      raw: locality,
      createdAt: releasedAt,
      updatedAt: releasedAt,
    },
  ]);
  const transaction = jest.fn(async (operations: Array<Promise<unknown>>) =>
    Promise.all(operations),
  );
  const client = {
    $transaction: transaction,
    datasetRelease: {
      findFirst: jest.fn().mockResolvedValue(release),
    },
    geographyLocality: {
      count: countLocalities,
      findMany: findLocalities,
    },
  };
  const prismaService = {
    isEnabled: jest.fn().mockReturnValue(true),
    getClient: jest.fn().mockReturnValue(client),
  } as unknown as PrismaService;
  const publicDataCacheService = createPublicDataCacheService();

  return {
    service: new GeographyReadModelQueryService(
      prismaService,
      publicDataCacheService as unknown as PublicDataCacheService,
    ),
    client,
    countLocalities,
    findLocalities,
    publicDataCacheService,
    prismaService,
  };
}

describe('GeographyReadModelQueryService', () => {
  it('returns null when the database read model is disabled', async () => {
    const getClient = jest.fn();
    const prismaService = {
      isEnabled: jest.fn().mockReturnValue(false),
      getClient,
    } as unknown as PrismaService;
    const service = new GeographyReadModelQueryService(
      prismaService,
      createPublicDataCacheService() as unknown as PublicDataCacheService,
    );

    await expect(
      service.listLocalities({
        page: 1,
        limit: 10,
        order: 'asc',
      }),
    ).resolves.toBeNull();
    expect(getClient).not.toHaveBeenCalled();
  });

  it('lists localities through the database read model', async () => {
    const { service, countLocalities, findLocalities } = createService();

    await expect(
      service.listLocalities({
        page: 2,
        limit: 10,
        order: 'desc',
        governorateId: locality.governorateId,
        kind: 'city',
        q: 'Dimashq',
      }),
    ).resolves.toMatchObject({
      totalRecords: 1,
      items: [
        {
          id: locality.id,
          kind: 'city',
          name: locality.name,
        },
      ],
      manifest: {
        dataset: {
          id: 'opensyria-geography',
        },
        release: {
          version: 'v0.1.0',
        },
        sources: [
          {
            id: 'source-1',
          },
        ],
      },
    });

    expect(countLocalities).toHaveBeenCalledWith({
      where: {
        releaseId: release.id,
        governorateId: locality.governorateId,
        kind: 'city',
        searchText: {
          contains: 'dimashq',
        },
      },
    });
    expect(findLocalities).toHaveBeenCalledWith({
      where: {
        releaseId: release.id,
        governorateId: locality.governorateId,
        kind: 'city',
        searchText: {
          contains: 'dimashq',
        },
      },
      orderBy: {
        nameEn: 'desc',
      },
      skip: 10,
      take: 10,
    });
  });

  it('reuses cached database list payloads for the same release and query', async () => {
    const { service, countLocalities, findLocalities, publicDataCacheService } = createService();
    const query = {
      page: 1,
      limit: 10,
      order: 'asc',
      kind: 'city',
    } as const;

    await service.listLocalities(query);
    await service.listLocalities(query);

    expect(publicDataCacheService.getOrSet).toHaveBeenCalledTimes(2);
    expect(countLocalities).toHaveBeenCalledTimes(1);
    expect(findLocalities).toHaveBeenCalledTimes(1);
  });
});
