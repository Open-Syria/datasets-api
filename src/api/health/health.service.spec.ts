import type { ConfigService } from '@nestjs/config';
import type { GlobalConfig } from '../../config/config.type';
import { Environment } from '../../constants/app.constants';
import type { PrismaService } from '../../database/prisma.service';
import type { DatasetReleaseRegistryService } from '../../datasets/dataset-release-registry.service';
import type { RedisConnectionsService } from '../../shared/redis/redis-connections.service';
import { HealthService } from './health.service';

const applicationRelease = '0123456789abcdef0123456789abcdef01234567';
const datasetRelease = 'v1.2.3';
const recordCounts = {
  governorates: 14,
  districts: 62,
  subdistricts: 272,
  localities: 7605,
};

function createService(overrides?: {
  databaseRelease?: null | {
    datasetId: string;
    repository: string;
    status: 'released';
    version: string;
    _count: typeof recordCounts;
  };
  manifestRecordCounts?: Partial<typeof recordCounts>;
}) {
  const configService = {
    getOrThrow: jest.fn((key: keyof GlobalConfig) => {
      if (key === 'app') {
        return {
          name: 'opensyria-datasets-api',
          nodeEnv: Environment.Production,
          release: applicationRelease,
        };
      }

      if (key === 'redis') {
        return { required: true };
      }

      throw new Error(`Unexpected config key: ${key}`);
    }),
  } as unknown as ConfigService<GlobalConfig>;
  const redisConnectionsService = {
    checkHealth: jest.fn().mockResolvedValue({ status: 'up', latencyMs: 1 }),
  } as unknown as RedisConnectionsService;
  const databaseRelease =
    overrides && 'databaseRelease' in overrides
      ? overrides.databaseRelease
      : {
          datasetId: 'opensyria-geography',
          repository: 'data-geography',
          status: 'released',
          version: datasetRelease,
          _count: recordCounts,
        };
  const findUnique = jest.fn().mockResolvedValue(databaseRelease);
  const prismaService = {
    checkHealth: jest.fn().mockResolvedValue({ status: 'up', required: true, latencyMs: 2 }),
    getClient: jest.fn().mockReturnValue({
      datasetRelease: { findUnique },
    }),
  } as unknown as PrismaService;
  const expected = { ...recordCounts, ...overrides?.manifestRecordCounts };
  const datasetReleaseRegistryService = {
    getHealth: jest.fn().mockReturnValue({
      status: 'loaded',
      required: true,
      count: 1,
      expectedCount: 1,
      missing: [],
    }),
    getManifestByDatasetId: jest.fn().mockReturnValue({
      dataset: { id: 'opensyria-geography' },
      release: { status: 'released', version: datasetRelease },
      artifacts: Object.entries(expected).map(([name, recordCount]) => ({
        name,
        format: 'json',
        recordCount,
      })),
    }),
  } as unknown as DatasetReleaseRegistryService;

  return {
    service: new HealthService(
      configService,
      redisConnectionsService,
      prismaService,
      datasetReleaseRegistryService,
    ),
    findUnique,
  };
}

describe('HealthService', () => {
  it('reports the application release and exact pinned geography total', async () => {
    const { service, findUnique } = createService();

    const health = await service.getReadiness();

    expect(health.app.release).toBe(applicationRelease);
    expect(health.database).toMatchObject({
      status: 'up',
      release: datasetRelease,
      recordCount: 7953,
    });
    expect(service.isReady(health)).toBe(true);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: `opensyria-geography:${datasetRelease}` },
      }),
    );
  });

  it('fails readiness when one pinned artifact count differs', async () => {
    const { service } = createService({
      manifestRecordCounts: { localities: recordCounts.localities + 1 },
    });

    const health = await service.getReadiness();

    expect(health.database).toEqual(
      expect.objectContaining({
        status: 'down',
        message: 'Pinned geography read model is unavailable',
      }),
    );
    expect(service.isReady(health)).toBe(false);
  });

  it('sanitizes a missing pinned database release', async () => {
    const { service } = createService({ databaseRelease: null });

    const health = await service.getReadiness();

    expect(health.database).toMatchObject({
      status: 'down',
      message: 'Pinned geography read model is unavailable',
    });
    expect(JSON.stringify(health)).not.toContain(datasetRelease);
  });
});
