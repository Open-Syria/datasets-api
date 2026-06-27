import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { GlobalConfig } from '../../config/config.type';

type RedisHealthCheck =
  | {
      status: 'disabled';
      latencyMs: 0;
    }
  | {
      status: 'up';
      latencyMs: number;
    }
  | {
      status: 'down';
      latencyMs: number;
      message: string;
    };

@Injectable()
export class RedisConnectionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisConnectionsService.name);
  private readonly redisConfig: GlobalConfig['redis'];
  private readonly client?: Redis;

  constructor(
    @Inject(ConfigService)
    configService: ConfigService<GlobalConfig>,
  ) {
    this.redisConfig = configService.getOrThrow('redis', { infer: true });

    if (this.redisConfig.enabled) {
      this.client = new Redis(this.redisConfig.url, {
        enableOfflineQueue: !this.redisConfig.required,
        lazyConnect: true,
        maxRetriesPerRequest: this.redisConfig.required ? 3 : 1,
      });

      this.client.on('error', (error) => {
        const message = error instanceof Error ? error.message : String(error);

        if (this.redisConfig.required) {
          this.logger.error(`Redis error: ${message}`);
          return;
        }

        this.logger.warn(`Redis unavailable: ${message}`);
      });
    }
  }

  async onModuleInit() {
    if (!this.redisConfig.required || !this.client) {
      return;
    }

    const health = await this.checkHealth();

    if (health.status !== 'up') {
      throw new Error(
        `Redis is required but unavailable: ${
          health.status === 'down' ? health.message : health.status
        }`,
      );
    }
  }

  getClient() {
    return this.client;
  }

  async checkHealth(): Promise<RedisHealthCheck> {
    if (!this.client) {
      return {
        status: 'disabled',
        latencyMs: 0,
      };
    }

    const startedAt = Date.now();

    try {
      if (this.client.status === 'wait' || this.client.status === 'end') {
        await this.client.connect();
      }

      await this.client.ping();

      return {
        status: 'up',
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  onModuleDestroy() {
    if (!this.client || this.client.status === 'end') {
      return;
    }

    this.client.disconnect();
  }
}
