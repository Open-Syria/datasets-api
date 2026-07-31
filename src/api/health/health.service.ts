import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GlobalConfig } from '../../config/config.type';
import { type DatabaseHealthCheck, PrismaService } from '../../database/prisma.service';
import { DatasetReleaseRegistryService } from '../../datasets/dataset-release-registry.service';
import { RedisConnectionsService } from '../../shared/redis/redis-connections.service';
import { GEOGRAPHY_DATASET_ID, GEOGRAPHY_REPOSITORY } from '../geography/geography.helpers';
import type { HealthResponseData, LivenessResponseData } from './health.dto';

const GEOGRAPHY_ARTIFACT_NAMES = [
  'governorates',
  'districts',
  'subdistricts',
  'localities',
] as const;

type GeographyArtifactName = (typeof GEOGRAPHY_ARTIFACT_NAMES)[number];
type GeographyRecordCounts = Record<GeographyArtifactName, number>;

function getExpectedGeographyRecordCounts(
  artifacts: Array<{ format: string; name: string; recordCount?: number }>,
): GeographyRecordCounts {
  return Object.fromEntries(
    GEOGRAPHY_ARTIFACT_NAMES.map((name) => {
      const artifact = artifacts.find(
        (candidate) => candidate.name === name && candidate.format === 'json',
      );

      if (
        !artifact ||
        !Number.isInteger(artifact.recordCount) ||
        artifact.recordCount === undefined
      ) {
        throw new Error(`Pinned geography manifest is missing a record count for ${name}.json`);
      }

      return [name, artifact.recordCount];
    }),
  ) as GeographyRecordCounts;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<GlobalConfig>,
    @Inject(RedisConnectionsService)
    private readonly redisConnectionsService: RedisConnectionsService,
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
  ) {}

  getLiveness(): LivenessResponseData {
    const appConfig = this.configService.getOrThrow('app', { infer: true });

    return {
      status: 'ok',
      app: {
        name: appConfig.name,
        environment: appConfig.nodeEnv,
        release: appConfig.release,
      },
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  async getHealth(): Promise<HealthResponseData> {
    return this.getReadiness();
  }

  async getReadiness(): Promise<HealthResponseData> {
    const liveness = this.getLiveness();
    const redis = await this.redisConnectionsService.checkHealth();
    const database = await this.checkPinnedReadModel(await this.prismaService.checkHealth());
    const datasetReleases = this.datasetReleaseRegistryService.getHealth();
    const isDegraded =
      redis.status === 'down' ||
      database.status === 'down' ||
      datasetReleases.status === 'missing' ||
      datasetReleases.status === 'incomplete';

    return {
      ...liveness,
      status: isDegraded ? 'degraded' : 'ok',
      redis,
      database,
      datasetReleases,
    };
  }

  isReady(data: HealthResponseData) {
    const redisConfig = this.configService.getOrThrow('redis', { infer: true });
    const redisReady = !redisConfig.required || data.redis.status === 'up';
    const databaseReady = !data.database.required || data.database.status === 'up';
    const datasetReleasesReady =
      !data.datasetReleases.required || data.datasetReleases.status === 'loaded';

    return redisReady && databaseReady && datasetReleasesReady;
  }

  private async checkPinnedReadModel(database: DatabaseHealthCheck): Promise<DatabaseHealthCheck> {
    if (database.status !== 'up') {
      return database;
    }

    const manifest =
      this.datasetReleaseRegistryService.getManifestByDatasetId(GEOGRAPHY_DATASET_ID);

    if (!manifest) {
      return database;
    }

    const startedAt = Date.now();

    try {
      const expectedCounts = getExpectedGeographyRecordCounts(manifest.artifacts);
      const release = await this.prismaService.getClient().datasetRelease.findUnique({
        where: {
          id: `${manifest.dataset.id}:${manifest.release.version}`,
        },
        select: {
          datasetId: true,
          repository: true,
          status: true,
          version: true,
          _count: {
            select: {
              governorates: true,
              districts: true,
              subdistricts: true,
              localities: true,
            },
          },
        },
      });
      const actualCounts = release?._count;

      if (!release || !actualCounts) {
        throw new Error(`Pinned geography release ${manifest.release.version} is missing`);
      }

      if (
        release.datasetId !== manifest.dataset.id ||
        release.repository !== GEOGRAPHY_REPOSITORY ||
        release.version !== manifest.release.version ||
        release.status !== manifest.release.status ||
        release.status !== 'released'
      ) {
        throw new Error(`Pinned geography release ${manifest.release.version} identity mismatch`);
      }

      const mismatches = GEOGRAPHY_ARTIFACT_NAMES.filter(
        (name) => actualCounts[name] !== expectedCounts[name],
      ).map((name) => `${name}: expected ${expectedCounts[name]}, found ${actualCounts[name]}`);

      if (mismatches.length > 0) {
        throw new Error(
          `Pinned geography release ${manifest.release.version} count mismatch (${mismatches.join('; ')})`,
        );
      }

      const recordCount = GEOGRAPHY_ARTIFACT_NAMES.reduce(
        (total, name) => total + actualCounts[name],
        0,
      );

      return {
        ...database,
        latencyMs: database.latencyMs + (Date.now() - startedAt),
        release: release.version,
        recordCount,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(`Pinned geography read model unavailable: ${message}`);

      return {
        status: 'down',
        required: database.required,
        latencyMs: database.latencyMs + (Date.now() - startedAt),
        message: 'Pinned geography read model is unavailable',
      };
    }
  }
}
