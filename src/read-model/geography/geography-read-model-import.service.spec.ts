import type { DistrictSummary } from '../../api/geography/districts/districts.dto';
import type { GovernorateSummary } from '../../api/geography/governorates/governorates.dto';
import type { LocalityRecord } from '../../api/geography/localities/localities.dto';
import type { SubdistrictSummary } from '../../api/geography/subdistricts/subdistricts.dto';
import type { PrismaService } from '../../database/prisma.service';
import type { DatasetReleaseManifest } from '../../datasets/contracts/dataset-release-manifest.schema';
import type { LocalDatasetArtifactReaderService } from '../../datasets/loaders/local-dataset-artifact-reader.service';
import type { PublicDataCacheService } from '../../shared/cache/public-data-cache.service';
import { GeographyReadModelImportService } from './geography-read-model-import.service';

const generatedAt = '2026-06-27T00:00:00.000Z';

const governorate: GovernorateSummary = {
  id: 'sy-damascus',
  name: {
    en: 'Damascus',
  },
  aliases: [],
  iso31662: 'SY-DI',
  centroid: null,
  area: null,
  population: null,
  externalIds: {},
  sourceIds: ['source-1'],
  sourceStatus: 'released',
};

const district: DistrictSummary = {
  id: 'sy-damascus-damascus',
  governorateId: governorate.id,
  name: {
    en: 'Damascus',
  },
  aliases: [],
  centroid: null,
  area: null,
  population: null,
  externalIds: {},
  sourceIds: ['source-1'],
  sourceStatus: 'released',
};

const subdistrict: SubdistrictSummary = {
  id: 'sy-damascus-damascus-damascus',
  governorateId: governorate.id,
  districtId: district.id,
  name: {
    en: 'Damascus',
  },
  aliases: [],
  centroid: null,
  area: null,
  population: null,
  externalIds: {},
  sourceIds: ['source-1'],
  sourceStatus: 'released',
};

const locality: LocalityRecord = {
  id: 'sy-damascus-damascus-damascus-damascus',
  governorateId: governorate.id,
  districtId: district.id,
  subdistrictId: subdistrict.id,
  kind: 'city',
  name: {
    en: 'Damascus',
  },
  aliases: [],
  centroid: null,
  externalIds: {},
  sourceIds: ['source-1'],
  sourceStatus: 'released',
};

const manifest: DatasetReleaseManifest = {
  schemaVersion: '1.0',
  generatedAt,
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
    publishedAt: generatedAt,
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
    {
      name: 'districts',
      format: 'json',
      path: 'artifacts/districts.json',
      sha256: '1'.repeat(64),
      sizeBytes: 1,
    },
    {
      name: 'subdistricts',
      format: 'json',
      path: 'artifacts/subdistricts.json',
      sha256: '2'.repeat(64),
      sizeBytes: 1,
    },
    {
      name: 'localities',
      format: 'json',
      path: 'artifacts/localities.json',
      sha256: '3'.repeat(64),
      sizeBytes: 1,
    },
  ],
  sources: [
    {
      id: 'source-1',
      title: 'Example source',
      license: 'CC0-1.0',
    },
  ],
};

function createArtifactReaderService() {
  const artifacts = {
    governorates: [governorate],
    districts: [district],
    subdistricts: [subdistrict],
    localities: [locality],
  };

  return {
    readJsonArtifact: jest.fn(({ artifactName }: { artifactName: keyof typeof artifacts }) =>
      Promise.resolve({
        manifest,
        artifact: manifest.artifacts.find((artifact) => artifact.name === artifactName),
        data: artifacts[artifactName],
      }),
    ),
  } as unknown as LocalDatasetArtifactReaderService;
}

function createPrismaService(onTransactionComplete: () => void) {
  const transaction = {
    datasetRelease: {
      deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
      create: jest.fn(() => Promise.resolve({})),
    },
    datasetSource: {
      createMany: jest.fn(() => Promise.resolve({ count: 1 })),
    },
    geographyGovernorate: {
      createMany: jest.fn(() => Promise.resolve({ count: 1 })),
    },
    geographyDistrict: {
      createMany: jest.fn(() => Promise.resolve({ count: 1 })),
    },
    geographySubdistrict: {
      createMany: jest.fn(() => Promise.resolve({ count: 1 })),
    },
    geographyLocality: {
      createMany: jest.fn(() => Promise.resolve({ count: 1 })),
    },
  };
  const client = {
    $transaction: jest.fn(
      async (callback: (transactionClient: typeof transaction) => Promise<unknown>) => {
        const result = await callback(transaction);

        onTransactionComplete();
        return result;
      },
    ),
  };

  return {
    prismaService: {
      getClient: jest.fn(() => client),
    } as unknown as PrismaService,
    client,
  };
}

describe('GeographyReadModelImportService', () => {
  it('clears the public data cache after a successful import transaction', async () => {
    let transactionComplete = false;
    const artifactReaderService = createArtifactReaderService();
    const { prismaService, client } = createPrismaService(() => {
      transactionComplete = true;
    });
    const clearAll = jest.fn(() => {
      expect(transactionComplete).toBe(true);
      return Promise.resolve();
    });
    const publicDataCacheService = {
      clearAll,
    } as unknown as PublicDataCacheService;
    const service = new GeographyReadModelImportService(
      artifactReaderService,
      prismaService,
      publicDataCacheService,
    );

    await expect(service.importLatestRelease()).resolves.toMatchObject({
      releaseId: 'opensyria-geography:v0.1.0',
      counts: {
        governorates: 1,
        districts: 1,
        subdistricts: 1,
        localities: 1,
        sources: 1,
      },
    });

    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(clearAll).toHaveBeenCalledTimes(1);
  });
});
