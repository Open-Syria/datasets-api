import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GlobalConfig } from '../../config/config.type';
import { PrismaService } from '../../database/prisma.service';
import { DatasetReleaseRegistryService } from '../../datasets/dataset-release-registry.service';
import { RedisConnectionsService } from '../../shared/redis/redis-connections.service';
import type { HealthResponseData, LivenessResponseData } from './health.dto';

@Injectable()
export class HealthService {
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
    const database = await this.prismaService.checkHealth();
    const datasetReleases = this.datasetReleaseRegistryService.getHealth();
    const isDegraded =
      redis.status === 'down' || database.status === 'down' || datasetReleases.status === 'missing';

    return {
      ...liveness,
      status: isDegraded ? 'degraded' : 'ok',
      redis,
      database,
      datasetReleases,
    };
  }
}
