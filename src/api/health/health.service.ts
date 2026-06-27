import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GlobalConfig } from '../../config/config.type';
import { RedisConnectionsService } from '../../shared/redis/redis-connections.service';
import type { HealthResponseData } from './health.dto';

@Injectable()
export class HealthService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<GlobalConfig>,
    @Inject(RedisConnectionsService)
    private readonly redisConnectionsService: RedisConnectionsService,
  ) {}

  async getHealth(): Promise<HealthResponseData> {
    const appConfig = this.configService.getOrThrow('app', { infer: true });
    const redis = await this.redisConnectionsService.checkHealth();

    return {
      status: redis.status === 'down' ? 'degraded' : 'ok',
      app: {
        name: appConfig.name,
        environment: appConfig.nodeEnv,
      },
      uptimeSeconds: Math.round(process.uptime()),
      redis,
    };
  }
}
