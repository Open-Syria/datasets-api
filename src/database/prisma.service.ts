import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GlobalConfig } from '../config/config.type';
import type { PrismaClient } from '../generated/prisma/client';

export type DatabaseHealthCheck =
  | {
      status: 'disabled';
      required: boolean;
      latencyMs: 0;
    }
  | {
      status: 'up';
      required: boolean;
      latencyMs: number;
    }
  | {
      status: 'down';
      required: boolean;
      latencyMs: number;
      message: string;
    };

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly databaseConfig: GlobalConfig['database'];
  private client?: PrismaClient;

  constructor(
    @Inject(ConfigService)
    configService: ConfigService<GlobalConfig>,
  ) {
    this.databaseConfig = configService.getOrThrow('database', { infer: true });
  }

  async onModuleInit() {
    if (!this.databaseConfig.required) {
      return;
    }

    const health = await this.checkHealth();

    if (health.status !== 'up') {
      throw new Error(
        `Database read model is required but unavailable: ${
          health.status === 'down' ? health.message : health.status
        }`,
      );
    }
  }

  async getClient() {
    if (!this.databaseConfig.enabled || !this.databaseConfig.url) {
      throw new Error('Database read model is disabled.');
    }

    return this.getOrCreateClient();
  }

  isEnabled() {
    return this.databaseConfig.enabled;
  }

  async checkHealth(): Promise<DatabaseHealthCheck> {
    if (!this.databaseConfig.enabled || !this.databaseConfig.url) {
      return {
        status: 'disabled',
        required: this.databaseConfig.required,
        latencyMs: 0,
      };
    }

    const startedAt = Date.now();

    try {
      const client = await this.getOrCreateClient();

      await client.$queryRaw`SELECT 1`;

      return {
        status: 'up',
        required: this.databaseConfig.required,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (this.databaseConfig.required) {
        this.logger.error(`Database read model unavailable: ${message}`);
      } else {
        this.logger.warn(`Database read model unavailable: ${message}`);
      }

      return {
        status: 'down',
        required: this.databaseConfig.required,
        latencyMs: Date.now() - startedAt,
        message,
      };
    }
  }

  async onModuleDestroy() {
    await this.client?.$disconnect();
  }

  private async getOrCreateClient(): Promise<PrismaClient> {
    if (this.client) {
      return this.client;
    }

    if (!this.databaseConfig.url) {
      throw new Error('DATABASE_URL is required when the database read model is enabled.');
    }

    const [{ PrismaClient }, { PrismaPg }] = await Promise.all([
      import('../generated/prisma/client.js'),
      import('@prisma/adapter-pg'),
    ]);

    const client = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: this.databaseConfig.url,
      }),
      log: this.databaseConfig.logQueries ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });

    this.client = client;

    return client;
  }
}
