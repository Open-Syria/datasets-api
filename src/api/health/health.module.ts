import { Module } from '@nestjs/common';
import { DatasetArtifactsModule } from '../../datasets/dataset-artifacts.module';
import { RedisConnectionsModule } from '../../shared/redis/redis-connections.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [DatasetArtifactsModule, RedisConnectionsModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
