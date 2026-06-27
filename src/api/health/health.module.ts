import { Module } from '@nestjs/common';
import { RedisConnectionsModule } from '../../shared/redis/redis-connections.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [RedisConnectionsModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
